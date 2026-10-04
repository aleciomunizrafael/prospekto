import { pingDatabase } from "@/lib/repos/health";

// Só abre conexão em runtime; nunca no build.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ ok: true, db: "ok" });
  } catch {
    return Response.json({ ok: false, db: "indisponível" }, { status: 503 });
  }
}
