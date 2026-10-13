// Mapa estático dos módulos do CRM (crm-design-system.md, seção 4; ADR-004, seção 6.1). Puro, sem
// React: alimenta a sidebar, a barra inferior, o caminho do header e o bloco "Ir para" da paleta,
// que só conhecem o `pathname`. O nome do registro (lead, projeto, aporte) vem do PageHeader de
// cada página. As rotas não mudaram com os rótulos novos: `/app/leads` continua sendo "Pipeline".

// Cookie do estado da sidebar (decisão D12): `rail` = recolhida; lido com cookies() no layout.
export const SIDEBAR_COOKIE = "crm-sidebar";

// Evento que abre a paleta de busca (ADR-004, 6.7): o botão "Buscar…" da sidebar, a lupa do header
// no celular e quem mais precisar disparam `window.dispatchEvent(new CustomEvent(PALETTE_EVENT))`.
export const PALETTE_EVENT = "prospekto:paleta";

export type CrmModule = { href: string; label: string; exact?: boolean };

export const MODULES = {
  painel: { href: "/app", label: "Painel", exact: true },
  pipeline: { href: "/app/leads", label: "Pipeline" },
  prospeccao: { href: "/app/prospeccao", label: "Prospecção" },
  organizacoes: { href: "/app/organizacoes", label: "Organizações" },
  projetos: { href: "/app/projetos", label: "Projetos" },
  aportes: { href: "/app/aportes", label: "Aportes" },
  tarefas: { href: "/app/tarefas", label: "Tarefas" },
  exportar: { href: "/app/exportar", label: "Exportar" },
  conta: { href: "/app/conta", label: "Minha conta" },
  busca: { href: "/app/busca", label: "Busca" },
} as const satisfies Record<string, CrmModule>;

// Tipos de resultado da paleta Ctrl+K (ADR-004, 6.7; plano, P11). O chip de cada item usa o
// singular; o título do grupo, o plural. `src/actions/search.ts` é "use server" e só pode exportar
// funções, por isso as constantes vivem aqui.
export const SEARCH_KINDS = [
  "lead",
  "organizacao",
  "projeto",
  "aporte",
  "tarefa",
  "prospeccao",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  lead: "Lead",
  organizacao: "Organização",
  projeto: "Projeto",
  aporte: "Aporte",
  tarefa: "Tarefa",
  prospeccao: "Prospecção",
};

export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  lead: "Leads",
  organizacao: "Organizações",
  projeto: "Projetos",
  aporte: "Aportes",
  tarefa: "Tarefas",
  prospeccao: "Prospecção",
};

// Rótulo genérico das subpáginas (novo e detalhe), na ordem de teste: o padrão mais específico
// primeiro. O detalhe usa o substantivo do módulo; o nome real vem do PageHeader da página.
const SUBPAGES: { module: CrmModule; pattern: RegExp; label: string }[] = [
  { module: MODULES.pipeline, pattern: /^\/app\/leads\/novo\/?$/, label: "Novo lead" },
  { module: MODULES.pipeline, pattern: /^\/app\/leads\/[^/]+\/?$/, label: "Lead" },
  {
    module: MODULES.prospeccao,
    pattern: /^\/app\/prospeccao\/[^/]+\/[^/]+\/?$/,
    label: "Empresa",
  },
  { module: MODULES.prospeccao, pattern: /^\/app\/prospeccao\/[^/]+\/?$/, label: "Lista" },
  {
    module: MODULES.organizacoes,
    pattern: /^\/app\/organizacoes\/[^/]+\/?$/,
    label: "Organização",
  },
  { module: MODULES.projetos, pattern: /^\/app\/projetos\/novo\/?$/, label: "Novo projeto" },
  { module: MODULES.projetos, pattern: /^\/app\/projetos\/[^/]+\/?$/, label: "Projeto" },
  { module: MODULES.aportes, pattern: /^\/app\/aportes\/[^/]+\/?$/, label: "Aporte" },
];

// Item ativo: `/app` só no caminho exato (senão "Painel" acenderia em toda tela); os demais cobrem
// o próprio caminho e os filhos (`/app/leads/123`), nunca prefixos soltos (`/app/leadsx`).
export function isActivePath(href: string, pathname: string, exact = false): boolean {
  if (exact) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type PathDescription = { module: CrmModule | null; sub: string | null };

export function describePath(pathname: string): PathDescription {
  const sub = SUBPAGES.find((s) => s.pattern.test(pathname));
  if (sub) return { module: sub.module, sub: sub.label };
  const all = Object.values(MODULES) as CrmModule[];
  const current =
    all.find((m) => !m.exact && isActivePath(m.href, pathname)) ??
    (isActivePath(MODULES.painel.href, pathname, true) ? MODULES.painel : null);
  return { module: current, sub: null };
}
