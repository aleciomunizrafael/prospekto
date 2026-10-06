"use server";

// "Minha conta": a pessoa logada troca a própria senha. Fica fora de src/actions/auth.ts porque
// aquele arquivo é público (// public-action) e não pode importar requireSession.
import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { firstIssueByField, type CrmActionState } from "@/lib/crm/action-state";
import { log } from "@/lib/log";
import { hitFormAttempt } from "@/lib/repos/form-attempts";
import { requireSession } from "@/lib/session";
import { hashIp } from "@/lib/signing";

const schema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Informe a senha atual." })
      // Acima do máximo do Better Auth a senha não pode ser a atual: erro de campo, sem log.
      .max(128, { error: "Senha atual incorreta." }),
    password: z
      .string()
      .min(12, { error: "A senha precisa ter pelo menos 12 caracteres." })
      .max(128, { error: "A senha pode ter no máximo 128 caracteres." }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "As duas senhas precisam ser iguais.",
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ["password"],
    error: "A nova senha precisa ser diferente da atual.",
  });

const SUCCESS_MESSAGE =
  "Senha alterada. Se a sua conta estava aberta em outro aparelho ou navegador, aquela sessão foi encerrada.";

// Códigos do Better Auth que pedem um login novo antes de trocar a senha. Na 1.7.7 o
// sensitiveSessionMiddleware (node_modules/better-auth/dist/api/routes/session.mjs) exige a
// sessão "autoritativa" (relida do banco, sem cache de cookie) e lança UNAUTHORIZED quando ela não
// existe; versões com verificação de idade lançam SESSION_NOT_FRESH ou SESSION_EXPIRED.
const REAUTH_CODES = new Set(["UNAUTHORIZED", "SESSION_NOT_FRESH", "SESSION_EXPIRED"]);

export async function changePasswordAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: firstIssueByField(parsed.error.issues),
    };
  }
  // Limite por pessoa (5 por hora, mesma tabela form_attempts de src/actions/auth.ts): a senha
  // atual é conferida aqui, fora do limitador HTTP do Better Auth, e sem isto uma sessão roubada
  // poderia tentar adivinhar a senha sem parar.
  const attempt = await hitFormAttempt(ctx, hashIp(`senha:${ctx.userId}`));
  if (!attempt.allowed) {
    log("warn", "troca de senha acima do limite", { userId: ctx.userId, count: attempt.count });
    return { status: "error", message: "Muitas tentativas. Espere uma hora e tente de novo." };
  }
  const requestHeaders = await headers();
  try {
    // A sessão atual é mantida (revokeOtherSessions: false) e as demais são apagadas em seguida.
    // Com revokeOtherSessions: true o Better Auth apaga todas as sessões e grava um cookie novo,
    // o que re-renderiza a página com o headers() antigo: requireSession() não acha a sessão e
    // manda a pessoa para /entrar em vez de mostrar "Senha alterada".
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.password,
        revokeOtherSessions: false,
      },
      headers: requestHeaders,
    });
  } catch (error) {
    const code = error instanceof APIError ? error.body?.code : undefined;
    if (code === "INVALID_PASSWORD") {
      return {
        status: "error",
        message: "Confira os campos.",
        fieldErrors: { currentPassword: "Senha atual incorreta." },
      };
    }
    if (code && REAUTH_CODES.has(code)) {
      return {
        status: "error",
        message: "Por segurança, saia e entre de novo antes de trocar a senha.",
      };
    }
    // Só o código ou o nome do erro: a mensagem de erros do banco pode trazer o SQL com os
    // parâmetros (hash da senha nova, token da sessão) e `reason` não é redigido (regra R-16).
    log("error", "falha ao trocar senha", {
      userId: ctx.userId,
      reason: code ?? (error instanceof Error ? error.name : "desconhecido"),
    });
    return {
      status: "error",
      message: "Não foi possível trocar a senha agora. Tente de novo em instantes.",
    };
  }
  log("info", "senha alterada", { userId: ctx.userId });
  // A senha já mudou: se a revogação das outras sessões falhar, a pessoa não pode receber um erro
  // que sugira repetir a troca. Fica no log; as outras sessões continuam válidas até expirarem ou
  // até a pessoa sair nelas, e o aviso diz isso.
  try {
    await auth.api.revokeOtherSessions({ headers: requestHeaders });
  } catch (error) {
    log("error", "falha ao encerrar as outras sessões após a troca de senha", {
      userId: ctx.userId,
      reason:
        error instanceof APIError
          ? error.body?.code
          : error instanceof Error
            ? error.name
            : "desconhecido",
    });
    return {
      status: "ok",
      message:
        "Senha alterada. Não foi possível encerrar as outras sessões agora: se a sua conta estiver aberta em outro aparelho ou navegador, saia dela por lá.",
    };
  }
  return { status: "ok", message: SUCCESS_MESSAGE };
}
