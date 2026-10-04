import { CrmNav } from "@/components/crm/nav";
import { Toaster } from "@/components/ui/sonner";
import { getSession, requireSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Autorização real: proxy.ts só redireciona de forma otimista. Cada page.tsx repete a checagem.
  await requireSession();
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <CrmNav userName={session?.user.name ?? ""} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
