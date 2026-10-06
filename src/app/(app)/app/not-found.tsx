import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/crm/ui/empty-state";
import { Button } from "@/components/ui/button";

// notFound() de um registro do CRM (crm-design-system.md, seção 8): o shell continua em volta.
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl py-10">
      <h1 className="sr-only">Registro não encontrado</h1>
      <EmptyState
        icon={FileQuestion}
        title="Este registro não existe ou foi movido."
        description="Confira o endereço ou volte para a tela inicial."
        action={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/app" />}>
            Voltar para Hoje
          </Button>
        }
      />
    </div>
  );
}
