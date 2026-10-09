import type { ReactNode } from "react";
import { Callout } from "@/components/crm/ui/callout";
import type { AiRunSnapshot, AiSlot, EmailBlockReason } from "@/lib/ai/types";
import type { EmailStatus, LeadSegment } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import { BriefCard } from "./brief-card";
import { ReplyCard } from "./reply-card";

// Painel "Assistente de IA" da página do lead (ADR-003, seção 4; ia-plano.md, Fundação): Server
// Component que só distribui dados aos cartões. A página nunca chama o modelo; os cartões chamam
// Server Actions no clique. No celular fica entre "Contato" e "Registrar atividade" (decisão P9).
export type AiPanelLead = {
  id: string;
  name: string;
  segment: LeadSegment;
  pipeline: string;
  stage: string;
  emailStatus: EmailStatus;
  hasPhone: boolean;
  // Primeira mensagem (estágio inicial e sem contato): o WhatsApp oferece a saída "SAIR".
  isFirstContact: boolean;
};

export type AiPanelProps = {
  enabled: boolean;
  lead: AiPanelLead;
  initialBrief: AiRunSnapshot | null;
  initialReply: AiRunSnapshot | null;
  slots: AiSlot[];
  canEmail: boolean;
  emailBlockReason: EmailBlockReason;
  whatsappHref: string | null;
  className?: string;
  children?: ReactNode;
};

export const AI_DISABLED_MESSAGE =
  "IA não configurada. Cadastre ANTHROPIC_API_KEY nas variáveis do projeto no Vercel e faça Redeploy.";

export function AiPanel({
  enabled,
  lead,
  initialBrief,
  initialReply,
  slots,
  canEmail,
  emailBlockReason,
  whatsappHref,
  className,
}: AiPanelProps) {
  return (
    <section
      aria-label="Assistente de IA"
      className={cn("flex flex-col gap-4 max-lg:order-4", className)}
    >
      {!enabled ? (
        <Callout tone="info" role="status">
          {AI_DISABLED_MESSAGE}
        </Callout>
      ) : null}
      <BriefCard leadId={lead.id} enabled={enabled} initial={initialBrief} />
      <ReplyCard
        lead={lead}
        enabled={enabled}
        initial={initialReply}
        slots={slots}
        canEmail={canEmail}
        emailBlockReason={emailBlockReason}
        whatsappHref={whatsappHref}
      />
    </section>
  );
}
