"use server";

// public-action: redefinição de senha (pedir o link e definir a nova senha com o token do Better
// Auth); por definição acontece sem sessão. "Sair" é feito no cliente com authClient.signOut.
// O cadastro público continua desligado (disableSignUp em src/lib/auth.ts).
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { firstIssueByField, type CrmActionState } from "@/lib/crm/action-state";
import { log } from "@/lib/log";

const RESET_PATH = "/redefinir-senha";

const requestSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase().max(254),
});

// Resposta sempre igual, exista ou não a conta: não revela quem tem acesso ao CRM.
export async function requestPasswordResetAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira o e-mail informado.",
      fieldErrors: firstIssueByField(parsed.error.issues),
    };
  }
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: RESET_PATH },
    });
  } catch (error) {
    log("error", "falha ao pedir redefinição de senha", { error });
  }
  return {
    status: "ok",
    message:
      "Se este e-mail tiver acesso ao CRM, o link para definir a nova senha chega em até 1 minuto. Ele vale por uma hora.",
  };
}

const resetSchema = z
  .object({
    token: z.string().trim().min(1, { error: "Link inválido. Peça um novo." }),
    password: z
      .string()
      .min(12, { error: "A senha precisa ter pelo menos 12 caracteres." })
      .max(128, { error: "A senha pode ter no máximo 128 caracteres." }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "As duas senhas precisam ser iguais.",
  });

export async function resetPasswordAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
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
  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
    });
  } catch (error) {
    log("warn", "redefinição de senha recusada", {
      reason: error instanceof Error ? error.message : "desconhecido",
    });
    return {
      status: "error",
      message:
        "Este link não vale mais (expirou ou já foi usado). Peça um novo link de redefinição.",
    };
  }
  redirect("/entrar?reset=1");
}
