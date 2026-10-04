import { Button } from "@/components/ui/button";
import { whatsappHrefFor, type WhatsappLead } from "@/lib/crm/whatsapp-messages";

// "Abrir WhatsApp" com a mensagem do playbook para o estágio; só aparece com telefone.
export function WhatsappButton({
  lead,
  size = "sm",
  label = "Abrir WhatsApp",
}: {
  lead: WhatsappLead;
  size?: "xs" | "sm" | "default";
  label?: string;
}) {
  const href = whatsappHrefFor(lead);
  if (!href) return null;
  return (
    <Button
      variant="outline"
      size={size}
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
    >
      {label}
    </Button>
  );
}
