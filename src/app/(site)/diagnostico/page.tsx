import type { Metadata } from "next";
import { DiagnosticoForm } from "@/components/site/lead-forms/diagnostico-form";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { NumberedList } from "@/components/site/numbered-list";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";

// Diagnóstico gratuito (docs/site/estrutura-e-copy.md, seções 4.6 e 5.4). Página estática: a
// query string (tipo, empresa, regime, faixa, projeto, simulation_id, formato; nenhum dado pessoal)
// é lida no cliente pelo formulário depois da montagem, assim como os dados do gate do simulador
// guardados em sessionStorage; o carimbo de tempo vem por Server Action.
export const metadata: Metadata = {
  title: { absolute: "Diagnóstico gratuito de incentivo fiscal · Prospekto" },
  description:
    "Em 30 minutos, com o seu contador, veja quanto do IRPJ pode ir para cultura e quais projetos da região cabem. Ou comece pela simulação de 20 minutos.",
  alternates: { canonical: "/diagnostico" },
};

const outcomes = [
  {
    title: "Valor possível",
    text: "Quanto do IRPJ (ou do seu imposto de renda) pode ir para cultura, confirmado com quem apura o imposto.",
  },
  {
    title: "Projetos aderentes",
    text: "Dois ou três projetos da carteira que cabem no valor, na cidade e no perfil da empresa.",
  },
  {
    title: "Prazo",
    text: "Até quando o depósito precisa acontecer para valer na apuração do ano, com o calendário trimestral quando for o caso.",
  },
  {
    title: "Próximos passos com data",
    text: "Termo, depósito, recibo e lançamento: quem faz o quê e quando.",
  },
];

export default function DiagnosticoPage() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Diagnóstico gratuito"
          title="Faça a conta com a Daniela e com o seu contador."
          subtitle={
            <>
              <p>
                Para empresas: 30 minutos com o contador presente, com o IRPJ projetado, dois ou
                três projetos da carteira e um checklist para o contador. Para pessoas físicas: uma
                ligação de 15 minutos.
              </p>
              <p>
                Ainda não quer envolver o contador? Comece pela simulação de 20 minutos: a Daniela
                leva a conta do limite e os projetos; o contador entra depois. É o mesmo formulário,
                no campo &quot;Formato da conversa&quot;.
              </p>
            </>
          }
        />
      </section>

      <section aria-labelledby="sai-sabendo" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
          <SectionHeader id="sai-sabendo" label="Resultado" title="O que você sai sabendo" />
          <NumberedList items={outcomes} columns={2} />
        </div>
      </section>

      <section aria-labelledby="formulario-diagnostico">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-8">
            <SectionHeader
              id="formulario-diagnostico"
              label="Pedir meu diagnóstico"
              title="Conte sobre a empresa ou sobre a sua declaração."
              subtitle="A Daniela entra em contato em até 1 dia útil pelo WhatsApp ou telefone informado para marcar. Campos marcados com (obrigatório) precisam ser preenchidos."
            />
            <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
              <p className="site-label">Prefere falar agora?</p>
              <p className="text-muted-foreground">
                Chame no WhatsApp e adiante a conversa. Horário comercial [verificar].
              </p>
              <WhatsappButton
                message={site.whatsappMessages.empresas}
                label="Falar no WhatsApp"
                context="page"
                className="self-start"
              />
            </div>
          </div>
          <DiagnosticoForm titleId="formulario-diagnostico" />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
      </div>
    </>
  );
}
