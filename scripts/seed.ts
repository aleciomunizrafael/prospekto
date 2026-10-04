// scaffold.md, seção 5.6: tenant `prospekto` e usuários de SEED_USERS ("Nome <email>;Nome <email>").
// Idempotente: pula e-mails já existentes. Sem e-mails reais neste arquivo.
//
// Criação de usuário com cadastro fechado (disableSignUp): o Better Auth 1.7.7 recusa
// auth.api.signUpEmail; usamos o contexto interno (auth.$context), que é exatamente o que a
// rota de sign-up faz por dentro (node_modules/better-auth/dist/api/routes/sign-up.mjs):
// password.hash + internalAdapter.createUser + internalAdapter.linkAccount(providerId "credential").
import { generateRandomString } from "better-auth/crypto";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { tenants } from "../src/lib/db/schema";

const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "prospekto";
const TENANT_NAME = "Prospekto Consultoria & Projetos";

type SeedUser = { name: string; email: string };

function parseSeedUsers(raw: string | undefined): SeedUser[] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*?)\s*<([^>]+)>$/);
      if (!match) throw new Error(`SEED_USERS: entrada inválida "${entry}" (use "Nome <email>")`);
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
    if (existing?.user) {
      console.log(`usuário já existe, pulado: ${user.email}`);
      continue;
    }
    const password = generateRandomString(20, "a-z", "A-Z", "0-9");
    const hash = await ctx.password.hash(password);
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
    console.log(
      `usuário criado: ${user.email} (${index === 0 ? "owner" : "operator"}); senha temporária: ${password}`,
    );
  }
}

process.exit(0);
