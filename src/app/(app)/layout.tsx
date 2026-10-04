import Link from "next/link";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Autorização real: proxy.ts só redireciona de forma otimista.
  await requireSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/app" className="font-semibold">
            Prospekto CRM
          </Link>
          <Link href="/app">Hoje</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
