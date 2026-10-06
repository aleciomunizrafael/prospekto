"use client"; // Limites de erro precisam ser Client Components

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Callout } from "@/components/crm/ui/callout";
import { Button } from "@/components/ui/button";

// Erro de rede ou servidor numa tela do CRM (crm-design-system.md, seção 8). O shell continua em
// volta; `retry()` (Next 16.3, file-conventions/error.md: preferido a `reset()`) refaz a busca de
// dados e re-renderiza o segmento.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log em JSON (ADR-001, "Erros e logs"); sem dado pessoal (regra R-16).
    console.error(
      JSON.stringify({ level: "error", msg: "erro na tela do CRM", digest: error.digest }),
    );
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-10">
      <h1 className="crm-h1">Não foi possível carregar esta tela</h1>
      <Callout tone="danger" role="alert" title="Algo falhou do nosso lado">
        Tente de novo em instantes. Se continuar, escreva para projetos@prospekto.com.br
        {error.digest ? ` informando o código ${error.digest}.` : "."}
      </Callout>
      <div>
        <Button type="button" size="touch" className="md:h-9" onClick={() => retry()}>
          <RotateCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
