"use client";

import { updateOrganizationNotesAction } from "@/actions/organizations";
import { AutosaveField } from "@/components/crm/ui/autosave-field";

// "Notas" da ficha da organização (ADR-004, 6.9; plano, P8): textarea que salva ao perder o foco
// quando o texto mudou, por updateOrganizationNotesAction, com o estado em texto ("Salvo às
// 14:32", "Salvando…", "Não foi possível salvar; tente de novo") no role="status" do campo.
// O rótulo do campo fica só para leitores de tela: o título visível é o do card.
export function OrgNotesForm({ orgId, notes }: { orgId: string; notes: string | null }) {
  return (
    <AutosaveField
      name="notes"
      label="Notas"
      defaultValue={notes}
      action={updateOrganizationNotesAction}
      hidden={{ orgId }}
      multiline
      rows={6}
      maxLength={8000}
      placeholder="O que vale lembrar: quem decide, histórico de patrocínio, restrições."
      className="[&_label]:sr-only [&_label+span]:ml-auto"
    />
  );
}
