import { cookies } from "next/headers";
import { BottomBar } from "@/components/crm/shell/bottom-bar";
import { Header } from "@/components/crm/shell/header";
import { Shortcuts } from "@/components/crm/shell/shortcuts";
import { SIDEBAR_COOKIE } from "@/components/crm/shell/modules";
import { Sidebar } from "@/components/crm/shell/sidebar";
import { CrmToaster } from "@/components/crm/shell/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { listOpenTasksWithLead } from "@/lib/repos/activities";
import { listOverdueLeads } from "@/lib/repos/leads";
import { getSession, requireSession } from "@/lib/session";

// Shell do CRM (crm-design-system.md, seção 4; plano, lote 1B). Na ordem do DOM: skip link,
// header, sidebar, conteúdo e barra inferior, para o Tab ir do skip link à busca, "Novo", avatar,
// itens da sidebar e conteúdo. A grade coloca a sidebar à esquerda ocupando as duas linhas no
// desktop; no celular há uma coluna só e a sidebar fica fora da tela (hidden md:flex).
// O documento é o contêiner de rolagem (header sticky, sidebar sticky, barra fixa);
// `html:has([data-crm])` em globals.css reserva scroll-padding para as barras fixas.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Autorização real: proxy.ts só redireciona de forma otimista. Cada page.tsx repete a checagem.
  const ctx = await requireSession();
  const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
  // Decisão D12: estado da sidebar em cookie lido no servidor, sem flash na hidratação.
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "rail";

  // Contador de "Hoje": próximas ações vencidas + tarefas vencidas (as mesmas consultas da página
  // Hoje, com o mesmo teto de 20 cada).
  const now = new Date();
  const [overdueLeads, overdueTasks] = await Promise.all([
    listOverdueLeads(ctx, now, 20),
    listOpenTasksWithLead(ctx, { dueTo: now, limit: 20 }),
  ]);
  const overdueCount = overdueLeads.length + overdueTasks.length;
  const userName = session?.user.name ?? "";

  return (
    <TooltipProvider>
      <div
        data-crm
        className="grid min-h-dvh w-full flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] bg-canvas md:grid-cols-[auto_minmax(0,1fr)]"
      >
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-pop"
        >
          Ir para o conteúdo
        </a>
        <Header userName={userName} className="md:col-start-2 md:row-start-1" />
        <Sidebar
          collapsed={collapsed}
          overdueCount={overdueCount}
          className="md:col-start-1 md:row-start-1 md:row-span-2"
        />
        <main
          id="conteudo"
          tabIndex={-1}
          className="min-w-0 bg-canvas outline-none md:col-start-2 md:row-start-2"
        >
          <div className="mx-auto w-full max-w-[80rem] px-4 pt-4 pb-28 md:px-6 md:pt-6 md:pb-8">
            {children}
          </div>
        </main>
        <BottomBar />
        <CrmToaster />
        <Shortcuts />
      </div>
    </TooltipProvider>
  );
}
