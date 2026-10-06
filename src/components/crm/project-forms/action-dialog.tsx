"use client";
// Botão que abre um diálogo com um ActionForm; fecha ao concluir com sucesso. Para passos curtos
// (mover estágio, publicar, assinar termo...). Diálogos maiores recebem `wide`; confirmações
// destrutivas recebem `alert` e viram um ConfirmDialog (role="alertdialog", decisão D16).
// `trigger` troca o botão padrão por qualquer elemento (ex.: item da ActionBarMobile).
//
// ActionDialogMenu agrupa vários ActionDialog numa linha: o passo principal fica com o próprio
// botão e os demais (identificados pelo `triggerLabel`) perdem o botão e passam a abrir pelo
// menu "⋯". Os diálogos ficam montados fora do menu, por isso continuam abertos quando ele fecha.
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  isValidElement,
  useContext,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ActionForm, type FormAction } from "./action-form";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

type MenuContextValue = {
  labels: string[];
  openLabel: string | null;
  setOpenLabel: (label: string | null) => void;
  primaryProps?: { variant?: ButtonVariant; size?: ButtonSize; className?: string };
};

const MenuContext = createContext<MenuContextValue | null>(null);

type ActionDialogProps = {
  triggerLabel: string;
  title: string;
  description?: ReactNode;
  action: FormAction;
  submitLabel: string;
  pendingLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  wide?: boolean;
  variant?: ButtonVariant;
  submitVariant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  // Mantém o diálogo aberto depois do sucesso (ex.: comissão com avisos a ler).
  stayOpenOnSuccess?: boolean;
  // Toast ao concluir (crm-design-system.md, seção 8: "fecha + toast.success"), ex.: "Depósito
  // confirmado."; `null` desliga. Com `stayOpenOnSuccess` a mensagem já aparece no formulário.
  successMessage?: string | null;
  // Elemento que abre o diálogo no lugar do botão padrão; `null` não renderiza gatilho
  // (uso com `open`/`onOpenChange`).
  trigger?: ReactNode;
  // Confirmação destrutiva: role="alertdialog", botão desabilitado até `requireField` ter valor.
  alert?: boolean;
  requireField?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ActionDialog({
  triggerLabel,
  title,
  description,
  action,
  submitLabel,
  pendingLabel,
  children,
  disabled,
  wide,
  variant = "outline",
  submitVariant,
  size,
  className,
  stayOpenOnSuccess,
  successMessage = "Salvo.",
  trigger,
  alert,
  requireField,
  open: controlledOpen,
  onOpenChange,
}: ActionDialogProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const menu = useContext(MenuContext);
  const inMenu = !!menu && menu.labels.includes(triggerLabel);
  const open = controlledOpen ?? (inMenu ? menu.openLabel === triggerLabel : ownOpen);
  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
    if (inMenu) menu.setOpenLabel(value ? triggerLabel : null);
    else setOwnOpen(value);
  };
  const router = useRouter();
  const notify = () => {
    if (successMessage && !stayOpenOnSuccess) toast.success(successMessage);
  };

  const triggerVariant = menu?.primaryProps?.variant ?? variant;
  const triggerSize = menu?.primaryProps?.size ?? size;
  // Alvo de toque de 44 px no celular também para os botões compactos das tabelas e cards.
  const triggerClass = cn(
    triggerSize ? (triggerSize === "sm" ? "h-11 md:h-7" : undefined) : "h-11 md:h-9",
    "relative z-10",
    menu?.primaryProps?.className,
    className,
  );
  const defaultTrigger = (
    <Button
      variant={triggerVariant}
      size={triggerSize}
      disabled={disabled}
      className={triggerClass}
    />
  );
  const hideTrigger = inMenu || trigger === null;
  const triggerNode = hideTrigger ? null : isValidElement(trigger) ? trigger : defaultTrigger;
  const triggerChildren = hideTrigger ? null : isValidElement(trigger) ? null : triggerLabel;

  if (alert) {
    return (
      <ConfirmDialog
        trigger={
          hideTrigger ? null : isValidElement(trigger) ? (
            trigger
          ) : (
            <Button
              variant={triggerVariant}
              size={triggerSize}
              disabled={disabled}
              className={triggerClass}
            >
              {triggerLabel}
            </Button>
          )
        }
        title={title}
        description={description}
        confirmLabel={submitLabel}
        pendingLabel={pendingLabel}
        tone={submitVariant === "destructive" ? "danger" : "default"}
        action={action}
        requireField={requireField}
        open={open}
        onOpenChange={setOpen}
        onSuccess={notify}
        stayOpenOnSuccess={stayOpenOnSuccess}
        wide={wide}
      >
        {children}
      </ConfirmDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerNode ? <DialogTrigger render={triggerNode}>{triggerChildren}</DialogTrigger> : null}
      <DialogContent className={cn(wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm
          action={action}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          variant={submitVariant}
          footer="dialog"
          showSuccess={Boolean(stayOpenOnSuccess)}
          secondaryAction={
            <DialogClose render={<Button variant="ghost" size="touch" className="md:h-9" />}>
              Cancelar
            </DialogClose>
          }
          onSuccess={() => {
            notify();
            router.refresh();
            if (!stayOpenOnSuccess) setOpen(false);
          }}
        >
          {children}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export type ActionMenuItem = {
  // Igual ao `triggerLabel` do ActionDialog que o item abre.
  label: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

export function ActionDialogMenu({
  items,
  children,
  menuLabel = "Mais ações",
  size = "sm",
  primaryProps,
  className,
}: {
  items: ActionMenuItem[];
  children: ReactNode;
  menuLabel?: string;
  size?: "sm" | "touch";
  // Variante e tamanho impostos ao botão do passo principal (ex.: outline sm nas tabelas).
  primaryProps?: MenuContextValue["primaryProps"];
  className?: string;
}) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const labels = items.map((i) => i.label);
  return (
    <MenuContext.Provider value={{ labels, openLabel, setOpenLabel, primaryProps }}>
      <div className={cn("inline-flex flex-wrap items-center gap-2", className)}>
        {children}
        {items.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size={size === "touch" ? "touch" : "icon-sm"}
                  aria-label={menuLabel}
                  className={cn("relative z-10", size === "touch" ? "px-3" : "size-11 md:size-7")}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  variant={item.variant}
                  disabled={item.disabled}
                  onClick={() => setOpenLabel(item.label)}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </MenuContext.Provider>
  );
}
