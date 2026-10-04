import type { NextConfig } from "next";
import "./src/env"; // falha o build se faltar variável

// Cabeçalhos de segurança em toda rota, inclusive /app: sem enquadramento em iframe (clickjacking
// das ações de estágio e aporte), sem sniffing de tipo, referrer reduzido nas páginas com token na
// URL (/simulador/resultado/[token], /obrigado/*?t=) e sem câmera, microfone ou geolocalização.
// Strict-Transport-Security fica a cargo da Vercel (vercel.json), que o aplica por padrão.
export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
