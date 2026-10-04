"use client"; // Limites de erro precisam ser Client Components

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log em JSON nos logs do Vercel (ADR-001, "Erros e logs"); sem dado pessoal.
    console.error(JSON.stringify({ level: "error", msg: "erro na página", digest: error.digest }));
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não conseguimos carregar esta página. Tente novamente; se o problema continuar, escreva para
        projetos@prospekto.com.br.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground text-sm">Código do erro: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => retry()}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      >
        Tentar novamente
      </button>
    </main>
  );
}
