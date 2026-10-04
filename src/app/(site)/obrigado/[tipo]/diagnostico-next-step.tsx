"use client";

import { useSearchParams } from "next/navigation";
import {
  DIAGNOSTIC_NEXT_STEP,
  DIAGNOSTIC_NEXT_STEP_VARIANTS,
  type DiagnosticNextStepVariant,
} from "@/lib/validation/forms/diagnostico-options";

// Próximo passo do diagnóstico conforme o formato pedido (`v` na query: simulacao, pj ou pf; não
// pessoal). A página é estática: o parâmetro é lido no cliente dentro de <Suspense>, com o texto
// genérico como fallback e para `v` ausente ou inválido.
export const DIAGNOSTIC_GENERIC_NEXT_STEP =
  "A Daniela entra em contato em até 1 dia útil pelo WhatsApp ou telefone informado para marcar o diagnóstico: 30 minutos com o seu contador (PJ) ou uma ligação de 15 minutos (PF). Se quiser adiantar, responda ao e-mail com dois horários.";

function isVariant(value: string | null): value is DiagnosticNextStepVariant {
  return (DIAGNOSTIC_NEXT_STEP_VARIANTS as readonly string[]).includes(value ?? "");
}

export function diagnosticNextStepText(variant: string | null): string {
  if (!isVariant(variant)) return DIAGNOSTIC_GENERIC_NEXT_STEP;
  return `A Daniela entra em contato em até 1 dia útil pelo WhatsApp ou telefone informado para ${DIAGNOSTIC_NEXT_STEP[variant]} Se quiser adiantar, responda ao e-mail com dois horários.`;
}

export function DiagnosticoNextStep() {
  const params = useSearchParams();
  return <p>{diagnosticNextStepText(params.get("v"))}</p>;
}
