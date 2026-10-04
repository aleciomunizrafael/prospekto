import { site } from "@/config/site";
import { cn } from "@/lib/utils";

// Ressalva legal obrigatória em toda página com número (estrutura-e-copy.md, seção 4).
export function LegalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted-foreground text-[14px] leading-snug", className)}>
      {site.disclaimer}
    </p>
  );
}
