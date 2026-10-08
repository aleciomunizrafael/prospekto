// scaffold.md, seção 5.6: tenant `prospekto` e usuários de SEED_USERS ("Nome <email>;Nome <email>").
// SEED_RESET_PASSWORD=1 gera senha temporária nova para os e-mails que já existem.
// Idempotente: pula e-mails já existentes. Sem e-mails reais neste arquivo.
//
// Criação de usuário com cadastro fechado (disableSignUp): o Better Auth 1.7.7 recusa
// auth.api.signUpEmail; usamos o contexto interno (auth.$context), que é exatamente o que a
// rota de sign-up faz por dentro (node_modules/better-auth/dist/api/routes/sign-up.mjs):
// password.hash + internalAdapter.createUser + internalAdapter.linkAccount(providerId "credential").
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateRandomString } from "better-auth/crypto";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { culturalProjects, organizations, tenants } from "../src/lib/db/schema";
import { and, eq } from "drizzle-orm";

const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "prospekto";
const TENANT_NAME = "Prospekto Consultoria & Projetos";

// Sem credenciais nem e-mails no stdout (R-16; logs da CI e do Vercel persistem): a senha temporária
// vai para um arquivo 0600 em diretório temporário fora do repositório, e o e-mail sai mascarado.
const maskEmail = (email: string) => `${email.slice(0, 1)}***@${email.split("@")[1] ?? ""}`;
let credentialsFile: string | null = null;
async function storeCredentials(email: string, password: string) {
  if (!credentialsFile) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "prospekto-seed-"));
    await chmod(dir, 0o700);
    credentialsFile = path.join(dir, "credenciais.txt");
    await writeFile(credentialsFile, "", { mode: 0o600 });
  }
  await writeFile(credentialsFile, `${email}\t${password}\n`, { flag: "a", mode: 0o600 });
}

type SeedUser = { name: string; email: string };

function parseSeedUsers(raw: string | undefined): SeedUser[] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const match = entry.match(/^(.*?)\s*<([^>]+)>$/);
      // Sem o texto da entrada: ela traz nome e e-mail de uma pessoa, e o log é compartilhado (R-16).
      if (!match) {
        throw new Error(
          `SEED_USERS: entrada ${index + 1} inválida; use "Nome <email>" (nome, espaço, e-mail entre < e >)`,
        );
      }
      return { name: match[1].trim() || match[2].trim(), email: match[2].trim().toLowerCase() };
    });
}

await db.insert(tenants).values({ id: TENANT_ID, name: TENANT_NAME }).onConflictDoNothing();
console.log(`tenant ${TENANT_ID} pronto`);

const users = parseSeedUsers(process.env.SEED_USERS);
if (users.length === 0) {
  console.log("SEED_USERS vazio: nenhum usuário criado");
} else {
  const ctx = await auth.$context;
  for (const [index, user] of users.entries()) {
    const existing = await ctx.internalAdapter.findUserByEmail(user.email);
    const password = generateRandomString(20, "a-z", "A-Z", "0-9");
    const hash = await ctx.password.hash(password);
    if (existing?.user) {
      // SEED_RESET_PASSWORD=1: redefine a senha de quem já existe (mesmo hash scrypt do cadastro).
      if (process.env.SEED_RESET_PASSWORD === "1") {
        await ctx.internalAdapter.updatePassword(existing.user.id, hash);
        await storeCredentials(user.email, password);
        console.log(`senha redefinida: ${maskEmail(user.email)}`);
      } else {
        console.log(`usuário já existe, pulado: ${maskEmail(user.email)}`);
      }
      continue;
    }
    const created = await ctx.internalAdapter.createUser(
      {
        name: user.name,
        email: user.email,
        emailVerified: true,
        tenantId: TENANT_ID,
        role: index === 0 ? "owner" : "operator",
      },
      { method: "email-password" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: hash,
    });
    await storeCredentials(user.email, password);
    console.log(`usuário criado: ${maskEmail(user.email)} (${index === 0 ? "owner" : "operator"})`);
  }
  if (credentialsFile) {
    console.log(`senhas temporárias em ${credentialsFile} (0600); apague após o primeiro acesso`);
  }
}

// SEED_EXAMPLE=1: organização proponente e projeto de exemplo com os dados PÚBLICOS do deck
// docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt. Idempotente pelo slug.
// Sem telefone nem e-mail de terceiros. Valor aprovado e saldo em branco: o deck traz só o recurso
// FSA/BRDE (R$ 2 milhões, fomento direto), não o valor da captação incentivada pelo art. 1º-A.
// Publicação no site exige autorização por escrito do proponente (R-11): published_on_site = false.
if (process.env.SEED_EXAMPLE === "1") {
  const slug = "a-tacada-perfeita";
  const [existing] = await db
    .select({ id: culturalProjects.id })
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, TENANT_ID), eq(culturalProjects.slug, slug)));
  if (existing) {
    console.log(`projeto de exemplo já existe, pulado: ${slug}`);
  } else {
    let [proponent] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.tenantId, TENANT_ID),
          eq(organizations.type, "proponente"),
          eq(organizations.name, "Ocotea Filmes"),
        ),
      );
    if (!proponent) {
      [proponent] = await db
        .insert(organizations)
        .values({
          tenantId: TENANT_ID,
          type: "proponente",
          name: "Ocotea Filmes",
          city: "Balneário Camboriú",
          uf: "SC",
          sector: "Produção audiovisual",
          notes:
            "Produtora com mais de 25 anos de mercado (deck do projeto A Tacada Perfeita). Sem telefone nem e-mail cadastrados: obter com o proponente.",
        })
        .returning({ id: organizations.id });
    }
    await db.insert(culturalProjects).values({
      tenantId: TENANT_ID,
      proponentOrgId: proponent.id,
      name: "A Tacada Perfeita",
      slug,
      mechanism: "audiovisual_art1A",
      stage: "avaliacao",
      city: "Balneário Camboriú",
      uf: "SC",
      culturalSegment: "Audiovisual: longa-metragem de comédia",
      summary:
        "Longa-metragem de comédia sobre segundas chances. Gracinha, atriz esquecida que vive com antigos companheiros de teatro numa mansão decadente em Balneário Camboriú, acredita ter encontrado sua chance ao conhecer Don Ramón, famoso ator argentino que imagina ser milionário; ele atravessou a fronteira pelo mesmo motivo. Dois golpes cruzados viram uma relação verdadeira entre dois artistas que passaram a vida interpretando personagens. Elenco veterano confirmado, direção com humor de observação e Balneário Camboriú como personagem. Produção da Ocotea Filmes com recurso de R$ 2 milhões aprovado na chamada BRDE/FSA Produção Seletivo Cinema 2024; captação complementar pelo art. 1º-A da Lei do Audiovisual; distribuição prevista com a Pandora Filmes.",
      counterparts:
        "Associação da marca a um filme popular com elenco de prestígio; visibilidade em cinema, streaming, TV aberta e paga e mercado internacional (trilha da produtora em festivais, Europa e companhias aéreas). Cotas e contrapartidas detalhadas a definir com o proponente.",
      publishedOnSite: false,
      // Em branco de propósito: o deck não traz o valor da captação incentivada (art. 1º-A).
      approvedAmount: null,
      fundraisingDeadline: null,
      fundraisingFeeAmount: null,
    });
    console.log(
      `projeto de exemplo criado: ${slug} (estágio avaliacao, sem valor aprovado; publicação no site exige autorização por escrito do proponente)`,
    );
  }
}

process.exit(0);
