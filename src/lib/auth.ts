// Sem "server-only" (ver src/lib/db/index.ts).
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 60 * 60,
    // Importação dinâmica: o módulo de e-mail é "server-only" e o CLI `auth generate` recusa
    // configurações que o importem estaticamente.
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import("@/lib/crm/password-reset-email");
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
  },
  user: {
    additionalFields: {
      tenantId: { type: "string", required: true, input: false },
      role: { type: "string", required: true, defaultValue: "operator", input: false },
    },
  },
  plugins: [nextCookies()],
});
