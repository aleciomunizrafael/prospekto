"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiRunSnapshot } from "@/lib/ai/types";

// "Preparar ligação" (ADR-003, frente 1). STUB da fundação: aceita as props finais e renderiza
// o estado desabilitado; a frente A substitui este arquivo pelo cartão com useActionState,
// generateBriefAction e as sete seções do briefing (ia-plano.md, Frente A).
export type BriefCardProps = {
  leadId: string;
  enabled: boolean;
  initial: AiRunSnapshot | null;
};

export function BriefCard({ enabled }: BriefCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preparar ligação</CardTitle>
        <CardDescription>
          Resumo, gancho de abertura, pontos de atenção, perguntas, objeções prováveis e próximo
          passo, a partir do histórico do CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <Button type="button" variant="outline" disabled title="Em construção">
            Gerar briefing
          </Button>
        </div>
        <p className="crm-meta">
          {enabled
            ? "Em construção: a geração do briefing chega na próxima entrega."
            : "IA não configurada."}
        </p>
      </CardContent>
    </Card>
  );
}
