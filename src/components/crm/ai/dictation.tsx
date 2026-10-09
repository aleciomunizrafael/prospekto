"use client";

import type { LeadSegment } from "@/lib/domain/enums";

// "Ditar" e "Organizar com IA" no formulário Registrar atividade (ADR-003, frente 2). STUB da
// fundação: a frente B preenche este arquivo com a Web Speech API (pt-BR, só no navegador) e o
// botão que chama organizeNotesAction. `onOrganized` recebe o resultado normalizado (tipo da
// frente B em src/lib/ai/notes.ts); o ActivityForm aplica ao formulário.
export type DictationToolsProps = {
  leadId: string;
  segment: LeadSegment;
  enabled: boolean;
  textareaId: string;
  onOrganized?: (result: unknown) => void;
};

export function DictationTools({ textareaId }: DictationToolsProps) {
  return <div data-ai-dictation="" data-textarea={textareaId} />;
}
