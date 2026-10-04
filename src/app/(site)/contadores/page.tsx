import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { CompetenceTable } from "@/components/site/competence-table";
import { AccountantForm } from "@/components/site/lead-forms/accountant-form";
import { AccountantWebinarForm } from "@/components/site/lead-forms/accountant-webinar-form";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { NumberBlock, SourceNotes } from "@/components/site/number-block";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { SectionHeader } from "@/components/site/section-header";
import { CONTADORES_SOURCES } from "@/components/site/segment-sources";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";
import { WEBINAR } from "@/lib/validation/forms/contadores-webinar";

// Para contadores (docs/site/estrutura-e-copy.md, seção 4.3). Página estática com dois formulários
// (diagnóstico da carteira e inscrição no webinar, seção 5.5). Sem menção a remuneração ao
// escritório: o programa é de co-marketing e formação.
export const metadata: Metadata = {
  title: { absolute: "Lei Rouanet para contadores: base legal e parceria · Prospekto" },
  description:
    "Ofereça incentivo cultural aos seus clientes no lucro real sem operar nada. Limites, base legal, divisão de competências e diagnóstico de carteira.",
  alternates: { canonical: "/contadores" },
};

const legalBasis = [
  {
    taxpayer: "Pessoa jurídica",
    regime: "Lucro real (trimestral ou anual)",
    limit:
      "Até 4% do IRPJ devido, em cesta compartilhada entre Rouanet (arts. 18 e 26), Lei do Audiovisual (arts. 1º e 1º-A) e esporte de inclusão social",
    base: "Imposto à alíquota de 15% sobre o lucro real. O adicional de 10% não entra na base e não admite dedução.",
    source: "Lei 9.532/1997, art. 6º, II; Lei 9.249/1995, art. 3º, § 4º; SC Cosit 4/2026",
  },
  {
    taxpayer: "Pessoa física",
    regime: "Declaração de ajuste anual pelo modelo completo",
    limit:
      "Até 6% do imposto devido, somando cultura, audiovisual, fundo da criança e fundo do idoso; 7% quando inclui esporte",
    base: "Imposto devido apurado na declaração",
    source: "Lei 9.532/1997, art. 22; Lei 9.250/1995, art. 12; Lei 14.439/2022",
  },
];

const incentives = [
  ["Rouanet art. 18", "4%", "3,6%", "Não", "6% (cesta PF)"],
  [
    "Rouanet art. 26",
    "4% (40% doação, 30% patrocínio)",
    "3,6%",
    "Sim",
    "6% (80% doação, 60% patrocínio)",
  ],
  ["Audiovisual art. 1º-A", "4% (mesma cesta)", "3,6%", "Não", "6% (cesta PF)"],
  ["Audiovisual art. 1º", "3% (mesma cesta)", "2,7%", "Sim", "3%"],
  ["Esporte", "2% (teto próprio)", "1,8%", "Não", "7% em conjunto"],
  ["FIA", "1%", "0,9%", "Não", "6% (cesta PF); 3% na própria declaração"],
  ["Fundo do Idoso", "1%", "0,9%", "Não", "6% (cesta PF); 3% na própria declaração"],
  ["Pronon e Pronas", "1% cada", "0,9%", "Não", "sem dedução em 2026 [verificar]"],
];

const advantages = [
  {
    title: "Diferenciação competitiva",
    text: "Posicionar o escritório como parceiro estratégico, acima da concorrência por preço.",
  },
  {
    title: "Valor institucional",
    text: "Economia tributária com impacto social concreto fortalece o vínculo com o cliente.",
  },
  {
    title: "Expansão de relacionamento",
    text: "Acesso a empresas e projetos engajados em governança.",
  },
];

const objections: Objection[] = [
  {
    id: "lista",
    question: "Vou ter de entregar minha lista de clientes?",
    answer:
      "Não. O escritório faz a triagem (regime e IRPJ) e apresenta a Prospekto só a quem quiser. A relação continua do contador.",
  },
  {
    id: "projeto-errado",
    question: "Se o projeto der errado, sobra para mim?",
    answer:
      "O incentivador de boa-fé mantém a dedução; a prestação de contas é da Prospekto e do proponente. O escritório lança apenas o recibo oficial.",
  },
  {
    id: "norma",
    question: "A norma muda todo ano.",
    answer:
      "A Prospekto manda ao escritório a atualização resumida (IN MinC 29/2026, SC Cosit 4/2026, LC 224/2025).",
  },
  {
    id: "presumido",
    question: "Meus clientes estão no presumido.",
    answer: "Para contribuintes de ICMS no RS existe a LIC-RS, que não exige lucro real.",
  },
  {
    id: "ganho",
    question: "O que o escritório ganha?",
    answer:
      "Não trabalhamos com comissão para o escritório: a norma limita e fiscaliza o que sai do orçamento do projeto (IN MinC 29/2026, art. 19, § 3º) e o contador tem o próprio código de ética (NBC PG 01/2019). O programa é de co-marketing e formação: kit do analista fiscal, webinar e treinamento da equipe, atendimento prioritário aos clientes indicados, menção como escritório parceiro no site e nos materiais, evento anual para os seus clientes. O ganho do escritório é na relação com o cliente: planejamento tributário mais completo e retenção.",
    source: "IN MinC 29/2026, art. 19, § 3º (fonte 12); NBC PG 01/2019",
  },
  {
    id: "interno",
    question: "Já fazemos isso internamente.",
    answer:
      "A diferença é a carteira de projetos aprovados e a operação no SALIC. Nenhum escritório precisa assumir prestação de contas de projeto cultural.",
  },
];

const kit = [
  "Passo a passo do lançamento no DARF e na ECF",
  "Modelo de memória de cálculo do limite",
  "Modelo de termo de patrocínio",
  "Checklist do depósito identificado",
  "Calendário fiscal do incentivo",
];

const cellClass = "border-border border-t px-3 py-3 align-top";

export default function ContadoresPage() {
  return (
    <>
      {/* Topo */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Para escritórios contábeis e consultorias tributárias"
          title="Ofereça incentivo cultural aos seus clientes sem operar nada."
          subtitle="Para o escritório, a Lei Rouanet é uma ferramenta de planejamento fiscal e de agregação de valor aos clientes no lucro real. A Prospekto traz os projetos aprovados, formaliza o patrocínio, emite o recibo no SALIC e presta contas. O escritório identifica os clientes elegíveis, calcula o limite e lança a dedução. E fica com o crédito pela ideia."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="#diagnostico-carteira" ctaId="contadores_hero_diagnostic">
            Pedir o diagnóstico da minha carteira
          </CtaLink>
          <CtaLink href="/guia" ctaId="contadores_hero_guide" variant="outline">
            Baixar o guia Contabilizando Cultura
          </CtaLink>
        </div>
      </section>

      {/* Base legal */}
      <section aria-labelledby="base-legal" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="base-legal" label="Base legal" title="Fundamentação técnica" />
          <div className="overflow-x-auto">
            <table className="border-border bg-background w-full min-w-[56rem] border-collapse rounded-lg border text-[15px]">
              <caption className="sr-only">Limites de dedução por contribuinte</caption>
              <thead className="bg-sand text-left">
                <tr>
                  {[
                    "Contribuinte",
                    "Regime ou modalidade",
                    "Limite de dedução",
                    "Base de cálculo",
                    "Fonte",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {legalBasis.map((row) => (
                  <tr key={row.taxpayer}>
                    <th scope="row" className={`${cellClass} text-left font-semibold`}>
                      {row.taxpayer}
                    </th>
                    <td className={`${cellClass} text-muted-foreground`}>{row.regime}</td>
                    <td className={`${cellClass} text-muted-foreground`}>{row.limit}</td>
                    <td className={`${cellClass} text-muted-foreground`}>{row.base}</td>
                    <td className={`${cellClass} text-muted-foreground text-[13px]`}>
                      {row.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-border bg-background max-w-[70ch] rounded-lg border p-4 font-medium">
            Não existe limite de 8% para pessoa física na legislação federal vigente. O art. 18 da
            Lei Rouanet dá dedução integral do aporte para artes cênicas, música erudita ou
            instrumental e outros segmentos, mas não altera o teto de 6%.{" "}
            <a
              href="#fonte-8"
              className="text-muted-foreground text-[13px] underline underline-offset-4"
            >
              fonte 8
            </a>
          </p>
        </div>
      </section>

      {/* Art. 18 e art. 26 */}
      <section
        aria-labelledby="art18-26"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="art18-26"
          label="Dedução integral ou parcial"
          title="Art. 18 e art. 26"
        />
        <div className="overflow-x-auto">
          <table className="border-border w-full min-w-[40rem] border-collapse rounded-lg border text-[15px]">
            <caption className="sr-only">
              Comparação entre o art. 18 e o art. 26 da Lei Rouanet
            </caption>
            <thead className="bg-sand text-left">
              <tr>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Critério
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Art. 18 (dedução integral)
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Art. 26 (dedução parcial)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Quanto do aporte vira dedução", "100%", "PJ: 40% da doação, 30% do patrocínio"],
                [
                  "Despesa operacional",
                  "Não (art. 18, § 2º)",
                  "Sim (art. 26, § 1º): reduz também a base do IRPJ e da CSLL",
                ],
                [
                  "Custo líquido para a PJ, dentro do teto",
                  "Zero",
                  "Maior que zero; depende da apuração da empresa",
                ],
              ].map(([label, a, b]) => (
                <tr key={label}>
                  <th scope="row" className={`${cellClass} text-left font-semibold`}>
                    {label}
                  </th>
                  <td className={`${cellClass} text-muted-foreground`}>{a}</td>
                  <td className={`${cellClass} text-muted-foreground`}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Planejamento em conjunto */}
      <section aria-labelledby="planejamento" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader
            id="planejamento"
            label="Todos os incentivos sobre o IR"
            title="Planejamento em conjunto"
            subtitle="Tabela resumida; a tabela completa, com base legal por linha, sai no PDF para o escritório [a produzir]."
          />
          <div className="overflow-x-auto">
            <table className="border-border bg-background w-full min-w-[56rem] border-collapse rounded-lg border text-[15px]">
              <caption className="sr-only">Limites por incentivo para PJ e PF</caption>
              <thead className="bg-sand text-left">
                <tr>
                  {[
                    "Incentivo",
                    "PJ lucro real",
                    "PJ com LC 224 [verificar]",
                    "Despesa operacional",
                    "PF (modelo completo)",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incentives.map(([name, ...cells]) => (
                  <tr key={name}>
                    <th scope="row" className={`${cellClass} text-left font-semibold`}>
                      {name}
                    </th>
                    {cells.map((c, i) => (
                      <td key={i} className={`${cellClass} text-muted-foreground tabular`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="site-prose max-w-[70ch]">
            Soma máxima teórica para uma PJ no lucro real: 10% do IR devido (9% na leitura da LC
            224/2025). Cultura é a fatia maior e a mais simples de ativar.{" "}
            <a
              href="#fonte-8"
              className="text-muted-foreground text-[13px] underline underline-offset-4"
            >
              fontes 8, 10 e 11
            </a>
          </p>
        </div>
      </section>

      {/* Divisão de competências */}
      <section
        aria-labelledby="competencias"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader id="competencias" label="Quem faz o quê" title="Divisão de competências" />
        <CompetenceTable
          caption="Divisão de competências entre o escritório contábil e a Prospekto"
          columns={["Escritório contábil", "Prospekto"]}
          rows={[
            {
              label: "Elegibilidade e projetos",
              cells: [
                "Identificar os clientes elegíveis no lucro real",
                "Disponibilizar projetos chancelados pelo Ministério da Cultura e pela Ancine",
              ],
            },
            {
              label: "Limite e formalização",
              cells: [
                "Calcular o limite nominal de dedução (4% do IRPJ)",
                "Conduzir a formalização do patrocínio",
              ],
            },
            {
              label: "Dedução e recibo",
              cells: [
                "Registrar a dedução na apuração do DARF e na ECF",
                "Emitir o recibo de mecenato no SALIC",
              ],
            },
            {
              label: "Conformidade e prestação de contas",
              cells: [
                "Orientar o cliente sobre conformidade",
                "Executar a prestação de contas e garantir as contrapartidas",
              ],
            },
          ]}
        />
      </section>

      {/* Vantagens e retorno */}
      <section aria-labelledby="vantagens" className="bg-sand">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-8">
            <SectionHeader
              id="vantagens"
              label="Para o escritório"
              title="Vantagens para o escritório"
            />
            <ul className="grid gap-6 sm:grid-cols-3">
              {advantages.map((a) => (
                <li key={a.title} className="flex flex-col gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-muted-foreground">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            <p className="site-label">Retorno econômico</p>
            <NumberBlock
              value="R$ 7,59"
              caption="de atividade econômica por R$ 1 incentivado pela Lei Rouanet em 2024; no Sul, R$ 9,81."
              source={{ ref: 3, label: "FGV para o MinC, jan/2026" }}
            />
            <p className="text-muted-foreground text-[15px]">
              A cadeia dos projetos gerou ou manteve 228 mil postos de trabalho e R$ 1,39 em
              tributos por R$ 1 de renúncia.
            </p>
          </div>
        </div>
      </section>

      {/* Objeções */}
      <section
        aria-labelledby="objecoes"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader id="objecoes" label="Perguntas que ouvimos" title="Objeções respondidas" />
        <ObjectionsAccordion items={objections} jsonLd />
      </section>

      {/* Diagnóstico de carteira */}
      <section aria-labelledby="diagnostico-carteira" className="bg-sand scroll-mt-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-8">
            <SectionHeader
              id="diagnostico-carteira"
              label="Diagnóstico de carteira"
              title="Como funciona"
              subtitle="O escritório informa quantos clientes estão no lucro real e em que faixa de IRPJ. Em até 5 dias úteis, devolvemos o potencial de destinação em reais, por cliente (sem nomes), e uma proposta de reunião conjunta com os três clientes mais aderentes. [verificar prazo com a Daniela]"
            />
            <div className="flex flex-col gap-3">
              <h3 className="site-h3">Kit do analista fiscal</h3>
              <p className="text-muted-foreground">O que o escritório recebe:</p>
              <ul className="flex flex-col gap-2">
                {kit.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-brand mt-2.5 size-2 shrink-0 rounded-full"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AccountantForm titleId="diagnostico-carteira" />
        </div>
      </section>

      {/* Webinar */}
      <section
        aria-labelledby="webinar"
        className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]"
      >
        <SectionHeader
          id="webinar"
          label="Webinar para contadores"
          title={WEBINAR.title}
          subtitle={`${WEBINAR.whenLabel}. Limites, base legal, lançamento no DARF e na ECF, e o que mudou com a IN MinC 29/2026. Inscreva-se para receber o link e a gravação.`}
        />
        <AccountantWebinarForm titleId="webinar" />
      </section>

      {/* CTA final */}
      <section aria-labelledby="cta-final" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-20">
          <h2 id="cta-final" className="site-h2 max-w-[30ch]">
            Junte-se aos escritórios contábeis que já estão transformando a forma como seus clientes
            investem o IR: com cultura, estratégia e impacto social.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href="#diagnostico-carteira"
              ctaId="contadores_final_diagnostic"
              className="bg-background text-primary hover:bg-background/90"
            >
              Pedir o diagnóstico da carteira
            </CtaLink>
            <CtaLink
              href="/guia"
              ctaId="contadores_final_guide"
              variant="outline"
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Baixar o guia
            </CtaLink>
            <WhatsappButton
              message={site.whatsappMessages.contadores}
              label="Falar no WhatsApp"
              context="page"
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
        <SourceNotes sources={CONTADORES_SOURCES} />
      </div>
    </>
  );
}
