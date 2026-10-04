import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Simulator } from "@/components/simulator/simulator";
import { env } from "@/env";
import { SIMULATOR_GATE_COOKIE, verifyGateCookie } from "@/lib/simulation-token";

// Simulador de incentivo fiscal (docs/site/simulador-spec.md; estrutura-e-copy.md, 6.2). O cálculo
// roda no cliente; a página só lê o cookie assinado do gate (30 dias) para abrir o detalhe direto
// a quem já passou por ele. O código do simulador só é carregado nesta rota.
export const metadata: Metadata = {
  title: { absolute: "Simulador de incentivo fiscal à cultura · Prospekto" },
  description:
    "Calcule quanto do IRPJ da sua empresa ou do seu imposto de renda pode ser destinado a projetos culturais, por mecanismo, com a base legal.",
  alternates: { canonical: "/simulador" },
};

export default async function SimuladorPage() {
  const store = await cookies();
  const gate = verifyGateCookie(store.get(SIMULATOR_GATE_COOKIE)?.value);
  const gatePassed = gate !== null && gate.tenantId === env.DEFAULT_TENANT_ID;
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 pt-12 pb-16 md:pt-20 md:pb-24">
      <Simulator gatePassed={gatePassed} />
    </section>
  );
}
