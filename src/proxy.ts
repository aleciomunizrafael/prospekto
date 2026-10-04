import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { CRM_PREFIX, isCrmPath } from "@/lib/routes";

// Cabeçalhos que só o servidor pode definir (na Fase 2, a partir do Host).
export const TENANT_HEADERS = ["x-tenant-id", "x-tenant-slug"] as const;

export function proxy(request: NextRequest) {
  // 1. Higiene de cabeçalhos em TODAS as rotas (ADR-001, "Multi-tenant agora"):
  //    x-tenant-* nunca vêm do cliente; na Fase 2 o proxy os define a partir do Host.
  const headers = new Headers(request.headers);
  for (const h of TENANT_HEADERS) headers.delete(h);

  // 2. Redirecionamento otimista só no CRM (/app e /app/*); a autorização real é requireSession()
  //    em cada página e Server Action.
  const pathname = request.nextUrl.pathname;
  if (isCrmPath(pathname) && !getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", pathname === CRM_PREFIX ? CRM_PREFIX : pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Tudo, exceto os internos do Next e arquivos estáticos por EXTENSÃO NO FIM do caminho. Um id ou
  // um caminho com ponto (/app/exportar/leads.csv, /api/auth/callback/x.y) continua passando pelo
  // proxy, para que a limpeza de x-tenant-* valha em toda rota, inclusive /api/*. Precisa ser
  // string literal: o Next lê o matcher estaticamente no build. Coberto por tests/proxy.test.ts.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|otf|webmanifest)$).*)",
  ],
};
