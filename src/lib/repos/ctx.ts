// Contexto obrigatório em toda função de repositório (ADR-001, "Multi-tenant agora"; regra R-15).
// O site usa { tenantId: env.DEFAULT_TENANT_ID } sem usuário; o CRM usa a sessão.
export type Ctx = {
  tenantId: string;
  userId?: string | null;
};
