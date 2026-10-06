import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { whatsappHrefFor, type WhatsappLead } from "@/lib/crm/whatsapp-messages";
import { cn } from "@/lib/utils";

// "Abrir WhatsApp" do CRM com a mensagem do playbook para o estágio; só aparece com telefone.
// `variant="icon"` (tabelas e fila de Hoje) tem `aria-label` com o nome e Tooltip; `text` mostra
// o rótulo. (O site tem o seu próprio WhatsappButton em src/components/site, com analytics.)
export function LeadWhatsappButton({
  lead,
  size = "sm",
  label = "Abrir WhatsApp",
  variant = "text",
  className,
}: {
  lead: WhatsappLead;
  size?: "xs" | "sm" | "default" | "touch";
  label?: string;
  variant?: "icon" | "text";
  className?: string;
}) {
  const href = whatsappHrefFor(lead);
  if (!href) return null;
  const ariaLabel = `Abrir WhatsApp com ${lead.name}`;
  if (variant === "icon") {
    const iconSize =
      size === "touch" ? "size-11" : size === "xs" ? "size-7" : size === "sm" ? "size-8" : "size-9";
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={cn("relative z-10", iconSize, className)}
              nativeButton={false}
              render={
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} />
              }
            />
          }
        >
          <MessageCircle aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>WhatsApp</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="outline"
      size={size}
      className={cn("relative z-10", className)}
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} />}
    >
      <MessageCircle aria-hidden="true" />
      {label}
    </Button>
  );
}
