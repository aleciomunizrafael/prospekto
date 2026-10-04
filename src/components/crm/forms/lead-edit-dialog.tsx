"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { updateLeadAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { INTEREST_LABELS } from "@/lib/crm/labels";
import { LEAD_INTERESTS, UFS, type LeadSegment } from "@/lib/domain/enums";
import { AttributeFields } from "./attribute-fields";
import { FormMessage, SelectField, TextField } from "./fields";
import { SubmitButton } from "./submit-button";

export type LeadEditValues = {
  leadId: string;
  segment: LeadSegment;
  name: string;
  phone: string;
  city: string;
  uf: string;
  interest: string;
  tags: string[];
  attributes: Record<string, unknown>;
};

export function LeadEditDialog({ lead }: { lead: LeadEditValues }) {
  const [open, setOpen] = useState(false);
  // Fecha o diálogo e avisa a partir do resultado da action (sem efeito com setState).
  const [state, action] = useActionState(async (prev: CrmActionState, formData: FormData) => {
    const result = await updateLeadAction(prev, formData);
    if (result.status === "ok") {
      toast.success(result.message ?? "Salvo.");
      setOpen(false);
    }
    return result;
  }, initialCrmActionState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar lead</DialogTitle>
            <DialogDescription>
              Dados básicos e campos do segmento. E-mail e segmento não mudam por aqui.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-5" noValidate>
            <input type="hidden" name="leadId" value={lead.leadId} />
            <FormMessage status={state.status} message={state.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="name"
                label="Nome"
                required
                error={e.name}
                defaultValue={v.name ?? lead.name}
              />
              <TextField
                name="phone"
                label="Telefone (WhatsApp)"
                error={e.phone}
                defaultValue={v.phone ?? lead.phone}
                inputMode="tel"
              />
              <TextField
                name="city"
                label="Cidade"
                error={e.city}
                defaultValue={v.city ?? lead.city}
              />
              <SelectField
                name="uf"
                label="UF"
                error={e.uf}
                options={UFS.map((u) => ({ value: u, label: u }))}
                placeholder="UF"
                defaultValue={v.uf ?? lead.uf}
              />
              <SelectField
                name="interest"
                label="Interesse"
                required
                error={e.interest}
                placeholder={null}
                options={LEAD_INTERESTS.map((i) => ({ value: i, label: INTEREST_LABELS[i] }))}
                defaultValue={v.interest ?? lead.interest}
              />
              <TextField
                name="tags"
                label="Tags"
                error={e.tags}
                defaultValue={v.tags ?? lead.tags.join(", ")}
                help="Separadas por vírgula."
              />
            </div>
            <AttributeFields segment={lead.segment} values={lead.attributes} errors={e} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
