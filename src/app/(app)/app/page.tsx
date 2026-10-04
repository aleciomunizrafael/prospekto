import type { Metadata } from "next";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hoje" };

export default async function TodayPage() {
  // Autorização em cada página (e em cada Server Action), não só no layout: layouts não
  // re-renderizam em navegação cliente e não impedem o segmento de rodar (Next 16,
  // guides/authentication.md, "Layouts and auth checks"). Coberto por tests/auth-guard.test.ts.
  await requireSession();

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Hoje</h1>
      <p className="text-muted-foreground">
        Em breve: ações vencidas, tarefas do dia e leads novos. O CRM entra na próxima etapa.
      </p>
    </section>
  );
}
