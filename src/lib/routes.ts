// Caminhos do CRM. Usado pelo proxy (redirecionamento otimista) e pela página de login
// (filtro do parâmetro `next`). Só `/app` e `/app/...`: `/apple` ou `/application` são públicos.
export const CRM_PREFIX = "/app";

export function isCrmPath(pathname: string): boolean {
  return pathname === CRM_PREFIX || pathname.startsWith(`${CRM_PREFIX}/`);
}
