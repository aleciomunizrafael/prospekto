import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço que você abriu não existe ou foi movido.</p>
      <Link href="/" className="underline underline-offset-4">
        Voltar para a página inicial
      </Link>
    </main>
  );
}
