"use client";

import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type ReactElement } from "react";
import { toast } from "sonner";
import { convertProspectingItemAction } from "@/actions/prospecting";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TAX_REGIME_LABELS } from "@/lib/crm/enum-labels";
import { INTEREST_LABELS } from "@/lib/crm/labels";
import { describeConversion, type ConversionResult } from "@/lib/crm/prospecting-view";
import { LEAD_INTERESTS, TAX_REGIMES } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import {
  ActionForm,
  DateTimeField,
  HiddenField,
  SelectField,
  TextField,
  type Option,
} from "../project-forms/action-form";

// "Reunião marcada" (ADR-004, 6.6 e 6.12): a empresa vira organização, a pessoa vira contato e lead
// em Patrocinadores (Qualificado) e a reunião fica no histórico. E-mail obrigatório (o CRM precisa
// dele); telefone da pessoa opcional e nunca o da empresa. O toast diz o que aconteceu de fato
// (criado, reaproveitado, reativado, ou estágio não avançado) com a ação "abrir lead". Os campos
// ficam em `ConvertFields`, puro, para o teste de renderToString (o Dialog do base-ui não
// renderiza o conteúdo no servidor).
export type ConvertDefaults = {
  users: Option[];
  defaultOwnerUserId: string | null;
  // Valor de datetime-local: próximo dia útil às 10:00 (calculado no servidor).
  defaultMeetingAt: string;
};

export type ConvertDialogProps = ConvertDefaults & {
  item: { id: string; name: string };
  // `undefined` renderiza o botão padrão; `null` não renderiza gatilho (uso controlado).
  trigger?: ReactElement | null;
  size?: "sm" | "default";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Para onde o foco volta ao fechar (o do base-ui); importa sem gatilho, quando o botão que abriu
  // some com a conversão.
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
};

const MEETING_KIND_OPTIONS: Option[] = [
  { value: "simulacao", label: "Simulação para empresa (20 min)" },
  { value: "diagnostico", label: "Diagnóstico com o contador (30 min)" },
];

// "Responsável pelo lead" nunca fica vazio: sem escolha, o servidor usa quem liga pela lista ou o
// usuário da sessão (convertProspectingItem; sair de Novo exige dono, R-3). A opção vazia diz isso
// em vez de prometer um "sem responsável" que não existe aqui.
export function ConvertFields({
  itemId,
  users,
  defaultOwnerUserId,
  defaultMeetingAt,
}: ConvertDefaults & { itemId: string }) {
  return (
    <>
      <HiddenField name="itemId" value={itemId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="contactName"
          label="Nome de quem vai à reunião"
          required
          autoComplete="off"
        />
        <TextField
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          help="Peça o e-mail na ligação: o convite da reunião e o CRM precisam dele."
        />
        <TextField
          name="contactPhone"
          label="Telefone de quem vai à reunião"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          help="Opcional. O telefone da empresa já fica na organização."
        />
        <TextField name="title" label="Cargo" autoComplete="off" />
        <DateTimeField
          name="meetingAt"
          label="Data e hora da reunião"
          required
          defaultValue={defaultMeetingAt}
        />
        <SelectField
          name="meetingKind"
          label="Tipo"
          options={MEETING_KIND_OPTIONS}
          defaultValue="diagnostico"
        />
        <SelectField
          name="taxRegime"
          label="Regime tributário, se soube"
          placeholder="Não perguntei"
          options={TAX_REGIMES.map((r) => ({ value: r, label: TAX_REGIME_LABELS[r] }))}
        />
        <SelectField
          name="interest"
          label="Interesse"
          options={LEAD_INTERESTS.map((i) => ({ value: i, label: INTEREST_LABELS[i] }))}
          defaultValue="nao_sei"
        />
        <SelectField
          name="ownerUserId"
          label="Responsável pelo lead"
          placeholder="Quem liga pela lista (padrão)"
          help="Sem escolha, o lead fica com quem liga pela lista ou com você."
          options={users}
          defaultValue={defaultOwnerUserId ?? ""}
          className="sm:col-span-2"
        />
      </div>
    </>
  );
}

export function ConvertDialog({
  item,
  users,
  defaultOwnerUserId,
  defaultMeetingAt,
  trigger,
  size = "sm",
  open: controlledOpen,
  onOpenChange,
  finalFocus,
}: ConvertDialogProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (value: boolean) => {
    setOwnOpen(value);
    onOpenChange?.(value);
  };
  const router = useRouter();
  const triggerNode =
    trigger === null ? null : trigger !== undefined ? (
      trigger
    ) : (
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "lg"}
        className={cn("relative z-10", size === "sm" ? "h-11 md:h-7" : "h-11 md:h-9")}
      >
        <CalendarCheck aria-hidden="true" />
        Reunião marcada
      </Button>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode} /> : null}
      <DialogContent className="sm:max-w-2xl" finalFocus={finalFocus}>
        <DialogHeader className="pr-8">
          <DialogTitle>Reunião marcada · {item.name}</DialogTitle>
          <DialogDescription>
            A empresa vira organização, a pessoa vira lead em Patrocinadores (Qualificado) e a
            reunião fica no histórico.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={convertProspectingItemAction}
          submitLabel="Confirmar reunião"
          pendingLabel="Confirmando..."
          footer="dialog"
          showSuccess={false}
          secondaryAction={
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
          }
          onSuccess={(state) => {
            const conversion = (state as { conversion?: ConversionResult }).conversion;
            const message = conversion ? describeConversion(conversion) : state.message;
            toast.success(
              message ?? "Reunião marcada.",
              conversion
                ? {
                    action: {
                      label: "abrir lead",
                      onClick: () => router.push(`/app/leads/${conversion.leadId}`),
                    },
                  }
                : undefined,
            );
            router.refresh();
            setOpen(false);
          }}
        >
          <ConvertFields
            itemId={item.id}
            users={users}
            defaultOwnerUserId={defaultOwnerUserId}
            defaultMeetingAt={defaultMeetingAt}
          />
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
