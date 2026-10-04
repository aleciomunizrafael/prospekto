// Interpretação dos eventos do webhook do Resend (ver src/app/api/webhooks/resend/route.ts).
import type { EmailEventKind } from "@/lib/repos/consents";

export type ResendEvent = {
  type?: string;
  data?: { to?: string[] | string; email?: string; unsubscribed?: boolean };
};

export function eventToKind(event: ResendEvent): EmailEventKind | null {
  switch (event.type) {
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.unsubscribed":
      return "unsubscribed";
    case "contact.updated":
      return event.data?.unsubscribed === true ? "unsubscribed" : null;
    default:
      return null;
  }
}

export function eventEmails(event: ResendEvent): string[] {
  const data = event.data ?? {};
  const out: string[] = [];
  if (Array.isArray(data.to)) out.push(...data.to);
  else if (typeof data.to === "string") out.push(data.to);
  if (typeof data.email === "string") out.push(data.email);
  return out.map((e) => e.trim().toLowerCase()).filter(Boolean);
}
