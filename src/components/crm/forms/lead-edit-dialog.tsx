"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { updateLeadAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialCrmActionState, type CrmActionState } from "@/lib/crm/action-state";
import { INTEREST_LABELS } from "@/lib/crm/labels";
import { LEAD_INTERESTS, UFS, type LeadSegment } from "@/lib/domain/enums";
import { FormSection } from "../ui/form-section";
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

// "Editar" do lead (crm-design-system.md, seção 7.12): diálogo largo com a seção "Dados" e os
// grupos de campos do segmento (art. 27 aberto), rodapé fixo. `trigger` troca o botão padrão;
// `null` não renderiza gatilho (uso controlado por `open`/`onOpenChange`, ex.: ActionBarMobile).
export function LeadEditDialog({
  lead,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  lead: LeadEditValues;
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (value: boolean) => {
    setOwnOpen(value);
    onOpenChange?.(value);
  };
  // Fecha o diálogo e avisa a partir do resultado da action (sem efeito com setState).
  const [state, action] = useActionState(async (prev: CrmActionState, formData: FormData) => {
    const result = await updateLeadAction(prev, formData);
    if (result.status === "ok") {
      toast.success(result.message ?? "Lead atualizado.");
      setOpen(false);
    }
    return result;
  }, initialCrmActionState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  const triggerNode =
    trigger === null ? null : trigger === undefined ? (
      <Button type="button" variant="outline">
        <Pencil aria-hidden="true" />
        Editar
      </Button>
    ) : (
      trigger
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode as ReactElement} /> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Editar {lead.name}</DialogTitle>
          <DialogDescription>
            Dados básicos e campos do segmento. E-mail e segmento não mudam por aqui.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="leadId" value={lead.leadId} />
          <FormMessage status={state.status} message={state.message} />
          <FormSection title="Dados" contentClassName="grid gap-4 sm:grid-cols-2">
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
          </FormSection>
          <AttributeFields
            segment={lead.segment}
            values={lead.attributes}
            errors={e}
            art27="open"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
            <SubmitButton size="touch" className="md:h-9" pendingLabel="Salvando…">
              Salvar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
