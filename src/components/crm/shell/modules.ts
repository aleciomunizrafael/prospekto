// Mapa estático dos módulos do CRM (crm-design-system.md, seção 4; plano, lote 1B). Puro, sem React:
// alimenta a sidebar, a barra inferior e o caminho do header, que só conhecem o `pathname`. O nome
// do registro (lead, projeto, aporte) entra na Fase 2 pelo PageHeader de cada página.

// Cookie do estado da sidebar (decisão D12): `rail` = recolhida; lido com cookies() no layout.
export const SIDEBAR_COOKIE = "crm-sidebar";

export type CrmModule = { href: string; label: string; exact?: boolean };

export const MODULES = {
  hoje: { href: "/app", label: "Hoje", exact: true },
  leads: { href: "/app/leads", label: "Leads" },
  organizacoes: { href: "/app/organizacoes", label: "Organizações" },
  projetos: { href: "/app/projetos", label: "Projetos" },
  aportes: { href: "/app/aportes", label: "Aportes" },
  exportar: { href: "/app/exportar", label: "Exportar" },
  conta: { href: "/app/conta", label: "Minha conta" },
  busca: { href: "/app/busca", label: "Busca" },
} as const satisfies Record<string, CrmModule>;

// Rótulo genérico das subpáginas (novo e detalhe), na ordem de teste: o padrão mais específico
// primeiro. O detalhe usa o substantivo do módulo; o nome real vem do PageHeader da página.
const SUBPAGES: { module: CrmModule; pattern: RegExp; label: string }[] = [
  { module: MODULES.leads, pattern: /^\/app\/leads\/novo\/?$/, label: "Novo lead" },
  { module: MODULES.leads, pattern: /^\/app\/leads\/[^/]+\/?$/, label: "Lead" },
  {
    module: MODULES.organizacoes,
    pattern: /^\/app\/organizacoes\/[^/]+\/?$/,
    label: "Organização",
  },
  { module: MODULES.projetos, pattern: /^\/app\/projetos\/novo\/?$/, label: "Novo projeto" },
  { module: MODULES.projetos, pattern: /^\/app\/projetos\/[^/]+\/?$/, label: "Projeto" },
  { module: MODULES.aportes, pattern: /^\/app\/aportes\/[^/]+\/?$/, label: "Aporte" },
];

// Item ativo: `/app` só no caminho exato (senão "Hoje" acenderia em toda tela); os demais cobrem
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
    (isActivePath(MODULES.hoje.href, pathname, true) ? MODULES.hoje : null);
  return { module: current, sub: null };
}
