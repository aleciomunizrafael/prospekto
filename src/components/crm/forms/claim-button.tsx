import { claimLeadAction } from "@/actions/crm-leads";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// "Assumir": o usuário da sessão vira dono do lead e a navegação cai no detalhe (claimLeadAction
// já redireciona). Usado na fila de Hoje e na tabela de Leads; `relative z-10` o mantém por cima
// do link da linha (decisão D10). Server Component: é só um <form> com a Server Action.
export function ClaimButton({
  leadId,
  size = "sm",
  className,
}: {
  leadId: string;
  size?: "sm" | "touch";
  className?: string;
}) {
  return (
    <form action={claimLeadAction} className="relative z-10 inline-flex">
      <input type="hidden" name="leadId" value={leadId} />
      <Button type="submit" variant="outline" size={size} className={cn(className)}>
        Assumir
      </Button>
    </form>
  );
}
