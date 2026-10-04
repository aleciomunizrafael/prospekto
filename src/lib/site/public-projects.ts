import "server-only";
import { unstable_cache } from "next/cache";
import { env } from "@/env";
import {
  getPublishedProjectBySlug,
  listPublishedProjects,
  type PublicProject,
} from "@/lib/repos/projects";

// Leitura da carteira pública pelo site (Home, /projetos e /projetos/[slug]).
//
// Estratégia de cache (docs/arquitetura/next16-convencoes.md): `cacheComponents` está desligado,
// então `use cache`/`cacheTag` não estão disponíveis. As páginas são estáticas (prerender no build,
// ISR como rede de segurança) e leem o banco por estas funções, cacheadas com a tag `projects`.
// Ao publicar, despublicar ou alterar um projeto, o CRM chama `revalidateTag(PROJECTS_CACHE_TAG,
// "max")` (ou `updateTag(PROJECTS_CACHE_TAG)` dentro de uma Server Action), o que invalida os dados
// e as páginas que os usam. Sem o tenant no cache key: o site serve só DEFAULT_TENANT_ID.
export const PROJECTS_CACHE_TAG = "projects";

// Rede de segurança em segundos para saldo (depósitos confirmados) e prazo, caso o CRM não
// dispare a tag: uma hora.
export const PROJECTS_REVALIDATE_SECONDS = 3600;

const siteCtx = () => ({ tenantId: env.DEFAULT_TENANT_ID, userId: null });

export const getPublicProjects = unstable_cache(
  async (): Promise<PublicProject[]> => listPublishedProjects(siteCtx()),
  ["site-public-projects"],
  { tags: [PROJECTS_CACHE_TAG], revalidate: PROJECTS_REVALIDATE_SECONDS },
);

export const getPublicProject = unstable_cache(
  async (slug: string): Promise<PublicProject | null> => getPublishedProjectBySlug(siteCtx(), slug),
  ["site-public-project"],
  { tags: [PROJECTS_CACHE_TAG], revalidate: PROJECTS_REVALIDATE_SECONDS },
);
