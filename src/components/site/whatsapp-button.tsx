"use client";

import { siteButtonClass } from "@/components/analytics/track-link";
import { site, waLink } from "@/config/site";
import { currentPath, track, type WhatsappContext } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Props = {
  message?: string;
  label?: string;
  // Contexto do evento whatsapp_click (seção 9.2): hero, footer, floating, thanks_page, project, page.
  context?: WhatsappContext;
  variant?: "primary" | "outline" | "link";
  className?: string;
};

// Link wa.me com mensagem pré-preenchida (seção 10.1) e evento whatsapp_click.
export function WhatsappButton({
  message = site.whatsappMessages.home,
  label = "Falar com a Daniela no WhatsApp",
  context = "page",
  variant = "outline",
  className,
}: Props) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={siteButtonClass(variant, className)}
      onClick={() => track("whatsapp_click", { context, path: currentPath() })}
    >
      {label}
    </a>
  );
}

// Botão flutuante só no celular (seção 8), discreto, com rótulo acessível "Falar no WhatsApp".
export function FloatingWhatsapp({ message = site.whatsappMessages.home }: { message?: string }) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className={cn(
        "bg-primary text-primary-foreground fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full shadow-lg md:hidden",
      )}
      onClick={() => track("whatsapp_click", { context: "floating", path: currentPath() })}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.3 4.4c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5 0 1.7-.7 1.9-1.4.3-.7.3-1.2.2-1.4l-.6-.3-2-1c-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1a6.7 6.7 0 0 1-3.4-3c-.2-.4.3-.4.8-1.4.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.1Z" />
      </svg>
    </a>
  );
}
