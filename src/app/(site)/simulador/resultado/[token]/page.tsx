import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { SimulatorDetail } from "@/components/simulator/detail";
import { Notice } from "@/components/simulator/notice";
import type { SimulatorDetailData } from "@/components/simulator/state";
import { SectionHeader } from "@/components/site/section-header";
import { env } from "@/env";
import { log } from "@/lib/log";
import type { Ctx } from "@/lib/repos/ctx";
import { getLead } from "@/lib/repos/leads";
import { getSimulationByTokenHash } from "@/lib/repos/simulations";
import { verifySimulationToken } from "@/lib/simulation-token";
import { parseSimulatorInput, simulate, type SimulatorResult } from "@/lib/simulator";

// Link do resultado detalhado (simulador-spec.md, 5.3): token assinado com validade de 30 dias,
// sem dados sensíveis na URL. A simulação é localizada pelo SHA-256 do token. Token inválido ou
// expirado mostra o estado token_invalid (seção 8). Página fora do índice.
export const metadata: Metadata = {
  title: { absolute: "Resultado da simulação · Prospekto" },
  description: "Resultado detalhado da sua simulação de incentivo fiscal à cultura.",
  robots: { index: false, follow: false },
};

function TokenInvalid() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-12 pb-16 md:pt-20 md:pb-24">
      <SectionHeader
        as="h1"
        label="Simulador de incentivo fiscal"
        title="Esta simulação expirou."
      />
      <Notice kind="error" title="Link inválido ou expirado">
        <p>Esta simulação expirou. Faça uma nova em 1 minuto.</p>
      </Notice>
      <div>
        <CtaLink href="/simulador" ctaId="simulator_result_expired_restart">
          Fazer uma nova simulação
        </CtaLink>
      </div>
    </section>
  );
}

function looksLikeResult(value: unknown): value is SimulatorResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "lc224" in value &&
    "warnings" in value &&
    "texts" in value
  );
}

export default async function ResultadoPage({ params }: PageProps<"/simulador/resultado/[token]">) {
  const { token } = await params;
  const check = verifySimulationToken(token);
  if (check.status !== "ok") return <TokenInvalid />;

  const ctx: Ctx = { tenantId: env.DEFAULT_TENANT_ID, userId: null };
  const simulation = await getSimulationByTokenHash(ctx, check.hash).catch((error: unknown) => {
    log("error", "falha ao carregar simulação pelo token", { error });
    return null;
  });
  if (!simulation) return <TokenInvalid />;

  const parsed = parseSimulatorInput(simulation.inputs);
  if (!parsed.ok) return <TokenInvalid />;
  const result = looksLikeResult(simulation.outputs) ? simulation.outputs : simulate(parsed.input);

  // Nome ou empresa para o cabeçalho; nenhum outro dado do lead vai à tela nem à URL.
  let subject = "sua empresa";
  if (simulation.leadId) {
    const lead = await getLead(ctx, simulation.leadId).catch(() => null);
    if (lead) {
      const empresa = (lead.attributes as Record<string, unknown>).empresa;
      subject =
        parsed.input.taxpayer_type === "pj" && typeof empresa === "string" && empresa
          ? empresa
          : lead.name;
    }
  } else if (parsed.input.taxpayer_type === "pf") {
    subject = "pessoa física";
  }

  const data: SimulatorDetailData = {
    input: parsed.input,
    result,
    createdAt: simulation.createdAt.toISOString(),
    subject,
    simulationId: simulation.id,
    resultUrl: null,
    gate: null,
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pt-12 pb-16 md:pt-20 md:pb-24">
      <SimulatorDetail data={data} />
    </section>
  );
}
