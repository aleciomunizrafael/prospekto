// `prebuild` (package.json): o build lê o banco no prerender (Home, /projetos, generateStaticParams
// de /projetos/[slug]) em vários workers. Com PGLITE_DIR inexistente, os workers criam o mesmo
// diretório ao mesmo tempo e o PGlite aborta em WASM, ou o build publica uma carteira vazia.
// Por isso o build local exige `npm run db:migrate` antes (scaffold.md, seção 5.5). Com
// DATABASE_URL (CI com Postgres, Vercel via vercel-build) a migração corre no próprio pipeline.
import { existsSync } from "node:fs";
import path from "node:path";

const pgliteDir = process.env.PGLITE_DIR ?? ".pglite";
if (!process.env.DATABASE_URL && !pgliteDir.startsWith("memory://")) {
  const dir = path.resolve(process.cwd(), pgliteDir);
  if (!existsSync(path.join(dir, "PG_VERSION"))) {
    console.error(
      `PGlite não migrado em ${dir}: rode "npm run db:migrate" antes de "npm run build" (scaffold.md, seção 5.5).`,
    );
    process.exit(1);
  }
}
