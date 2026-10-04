"use client"; // Limites de erro precisam ser Client Components

// Substitui o layout raiz quando ele próprio falha: precisa de <html> e <body> próprios.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", maxWidth: 640 }}>
        <h1>Algo deu errado</h1>
        <p>
          Não conseguimos carregar o site. Tente novamente; se o problema continuar, escreva para
          projetos@prospekto.com.br.
        </p>
        {error.digest ? <p>Código do erro: {error.digest}</p> : null}
        <button type="button" onClick={() => retry()}>
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
