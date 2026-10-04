// Smoke test pós-deploy (ADR-001, "Testes"): confere que o site responde, que o banco está
// acessível por /api/health e que o CRM redireciona sem sessão. Uso:
//   npm run smoke -- https://prospekto.com.br   (ou SMOKE_URL; padrão http://localhost:3000)
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

type Check = { path: string; status: number; location?: RegExp };

const checks: Check[] = [
  { path: "/", status: 200 },
  { path: "/api/health", status: 200 },
  { path: "/app", status: 307, location: /\/entrar\?next=%2Fapp$/ },
  // Caminho com ponto também passa pelo proxy (matcher só exclui extensões estáticas).
  { path: "/app/leads/a.b", status: 307, location: /\/entrar\?next=%2Fapp%2Fleads%2Fa\.b$/ },
];

let failed = 0;
for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "x-tenant-id": "forjado" } });
    const location = res.headers.get("location") ?? "";
    const ok = res.status === check.status && (!check.location || check.location.test(location));
    console.log(
      `${ok ? "ok " : "FALHA"} ${check.path} -> ${res.status}${location ? ` ${location}` : ""}`,
    );
    if (!ok) failed += 1;
  } catch (error) {
    console.log(`FALHA ${check.path} -> ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`smoke: ${failed} verificação(ões) falharam em ${base}`);
  process.exit(1);
}
console.log(`smoke: tudo ok em ${base}`);

export {};
