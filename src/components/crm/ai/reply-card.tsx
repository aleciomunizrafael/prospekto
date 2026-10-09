"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiRunSnapshot, AiSlot, EmailBlockReason } from "@/lib/ai/types";
import type { AiPanelLead } from "./ai-panel";

// "Resposta sugerida" (ADR-003, frente 3). STUB da fundação: aceita as props finais e renderiza
// o estado desabilitado; a frente C substitui este arquivo pelo cartão com SegmentedControl
// (E-mail, WhatsApp), rascunho editável, horários, "Enviar por e-mail" e "Abrir no WhatsApp".
export type ReplyCardProps = {
  lead: AiPanelLead;
  enabled: boolean;
  initial: AiRunSnapshot | null;
  slots: AiSlot[];
  canEmail: boolean;
  emailBlockReason: EmailBlockReason;
  whatsappHref: string | null;
};

export function ReplyCard({ enabled, slots }: ReplyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resposta sugerida</CardTitle>
        <CardDescription>
          Rascunho da primeira resposta na voz da Daniela, por e-mail ou WhatsApp, com as perguntas
          de qualificação e dois horários para propor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <Button type="button" variant="outline" disabled title="Em construção">
            Gerar rascunho
          </Button>
        </div>
        {slots.length ? (
          <p className="crm-meta">Horários propostos: {slots.map((s) => s.label).join(" · ")}</p>
        ) : null}
        <p className="crm-meta">
          {enabled
            ? "Em construção: a geração do rascunho chega na próxima entrega."
            : "IA não configurada."}
        </p>
      </CardContent>
    </Card>
  );
}
