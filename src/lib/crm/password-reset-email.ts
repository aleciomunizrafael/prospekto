import "server-only";
import { sendEmail, type SendEmailResult } from "@/lib/email/send";
import { renderEmail } from "@/lib/email/templates/layout";

// E-mail de redefinição de senha do CRM (Better Auth, emailAndPassword.sendResetPassword).
// Texto simples em português; o link vale por uma hora (src/lib/auth.ts).
export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}): Promise<SendEmailResult> {
  const rendered = renderEmail(
    {
      name: input.name,
      actionLabel: "pediu a redefinição da senha do CRM da Prospekto",
      sentAt: new Date(),
      marketing: false,
    },
    "Redefinir a senha do CRM",
    [
      {
        type: "paragraph",
        text: "Para escolher uma nova senha, abra o link abaixo. Ele vale por uma hora e só funciona uma vez.",
      },
      { type: "cta", label: "Definir nova senha", href: input.url },
      {
        type: "paragraph",
        text: "Se você não pediu a redefinição, ignore este e-mail: a senha atual continua valendo.",
      },
    ],
  );
  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    templateId: "password-reset",
  });
}
