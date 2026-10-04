import type { Metadata } from "next";
import { CtaLink } from "@/components/analytics/track-link";
import { CompetenceTable } from "@/components/site/competence-table";
import { DeadlineBanner } from "@/components/site/deadline-banner";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { SourceNotes } from "@/components/site/number-block";
import { NumberedList } from "@/components/site/numbered-list";
import { ObjectionsAccordion, type Objection } from "@/components/site/objections-accordion";
import { ProjectCard } from "@/components/site/project-card";
import { PROJECTS_DISCLAIMER, mechanismInfo } from "@/components/site/project-mechanism";
import { SectionHeader } from "@/components/site/section-header";
import { EMPRESAS_SOURCES } from "@/components/site/segment-sources";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";
import { getPublicProjects } from "@/lib/site/public-projects";

// Para empresas (docs/site/estrutura-e-copy.md, seção 4.2). Estática; o bloco "Projetos em
// captação" lê a carteira pública pelo cache com a tag `projects` (src/lib/site/public-projects.ts).
export const metadata: Metadata = {
  title: { absolute: "Lei Rouanet para empresas no lucro real · Prospekto" },
  description:
    "Até 4% do IRPJ devido pode virar um projeto cultural na sua região. Veja como funciona, o que a empresa ganha e simule com os números da sua empresa.",
  alternates: { canonical: "/empresas" },
};

// Rede de segurança (ISR) além da tag `projects`; literal porque o Next exige valor estático.
export const revalidate = 3600;

const gains = [
  {
    title: "Visibilidade e reputação",
    text: "O marketing cultural posiciona a marca em contextos de alto valor simbólico, perto de públicos engajados e formadores de opinião, na cidade onde a empresa está.",
  },
  {
    title: "Compromisso com a comunidade",
    text: "Associar a marca a um projeto cultural da região fortalece o vínculo com clientes, colaboradores e poder público, e gera conteúdo para a comunicação interna e externa.",
  },
  {
    title: "Comprovante oficial",
    text: "O recibo de mecenato emitido no SALIC comprova o aporte perante a Receita Federal e serve de evidência para relatórios de ESG e de responsabilidade social.",
  },
];

const steps = [
  {
    title: "Confirmar a elegibilidade",
    text: "A empresa é tributada pelo lucro real e apura imposto de renda devido no período.",
  },
  {
    title: "Escolher o projeto",
    text: "Um projeto com portaria de autorização vigente no SALIC (Sistema de Apoio às Leis de Incentivo à Cultura, do Ministério da Cultura) ou despacho da Ancine.",
  },
  {
    title: "Formalizar",
    text: "Termo de patrocínio com o proponente, com valor, cronograma e contrapartidas.",
  },
  {
    title: "Depositar",
    text: "Transferência identificada para a conta vinculada do projeto, aberta no Banco do Brasil.",
  },
  {
    title: "Receber o recibo",
    text: "O recibo de mecenato é emitido no SALIC e enviado à empresa e ao contador.",
  },
  {
    title: "Deduzir",
    text: "O contador abate o valor do IRPJ no DARF (Documento de Arrecadação de Receitas Federais) do período e informa na ECF (Escrituração Contábil Fiscal).",
  },
  {
    title: "Ativar as contrapartidas",
    text: "Marca no material do projeto, cotas de ingressos, ações de relacionamento, acompanhadas pela Prospekto.",
  },
];

const objections: Objection[] = [
  {
    id: "receita",
    question: "Isso dá problema com a Receita Federal?",
    answer:
      "Não. É dedução prevista em lei (Lei 8.313/1991 e Lei 9.532/1997), com conta vinculada no Banco do Brasil, depósito identificado e recibo emitido no SALIC. O contador lança no DARF e informa na ECF. Não é brecha nem manobra: é um ato declaratório.",
    source: "Lei 8.313/1991; Lei 9.532/1997 (fonte 8)",
  },
  {
    id: "grande-empresa",
    question: "Isso é coisa de grande empresa?",
    answer:
      "Em 2025, mais de 6,2 mil CNPJs patrocinaram projetos pela Lei Rouanet, e cerca de 75% do valor veio de fora das dez maiores empresas. Em Caxias do Sul havia 42 projetos em execução.",
    source: "fontes 5 e 2",
  },
  {
    id: "gasto",
    question: "É gasto? Não tenho orçamento para isso.",
    answer:
      "Não é gasto novo. O valor sai do IRPJ que a empresa já vai pagar, dentro de 4% do imposto devido. No art. 18 da Lei Rouanet e no art. 1º-A da Lei do Audiovisual, a dedução é de 100% do aporte dentro do limite; o custo líquido é zero.",
    source: "Lei 8.313/1991, art. 18; Lei 8.685/1993, art. 1º-A (fontes 8 e 9)",
  },
  {
    id: "contador",
    question: "Meu contador nunca falou disso.",
    answer:
      "Menos de 3% das empresas no lucro real usam o incentivo [verificar]. A Prospekto trabalha com o escritório da sua empresa: ele valida o limite e lança a dedução; nós fazemos o resto. O contador pode participar do diagnóstico.",
    source: "fonte 4",
  },
  {
    id: "esporte",
    question: "Já patrocino esporte ou doo para o fundo da criança. Ainda cabe?",
    answer:
      "Cabe. Esporte (2%), fundo da criança e do idoso (1% cada) têm tetos próprios. A cesta cultural de 4% (Rouanet, Audiovisual e esporte de inclusão social) é separada.",
    source: "Solução de Consulta Cosit 4/2026 (fonte 10)",
  },
  {
    id: "presumido",
    question: "Minha empresa está no lucro presumido.",
    answer:
      "A Rouanet exige lucro real. Mas empresas contribuintes de ICMS no RS, fora do Simples, podem patrocinar pela Lei de Incentivo à Cultura do estado (LIC-RS), compensando o valor no ICMS. Fale conosco para avaliar.",
  },
  {
    id: "custo",
    question: "Quanto a Prospekto cobra da minha empresa?",
    answer:
      "Nada. A remuneração de captação sai do orçamento do projeto, dentro do limite legal (IN MinC 29/2026, art. 19). Se a empresa quiser consultoria própria (planejamento, ativação de marca), é contrato separado.",
    source: "IN MinC 29/2026, art. 19 (fonte 12)",
  },
  {
    id: "retorno",
    question: "Quero retorno financeiro.",
    answer:
      "Patrocínio incentivado não devolve dinheiro ao patrocinador; devolve dedução e contrapartidas de imagem. É vedação legal. Participação em receita existe só no art. 1º da Lei do Audiovisual (investimento em cotas), outro produto.",
  },
  {
    id: "outro-consultor",
    question: "Já tentei com outro consultor e deu trabalho.",
    answer:
      "A Prospekto assume termo, recibo, prestação de contas e contrapartidas. O patrocinador só deposita e lança.",
  },
  {
    id: "prejuizo",
    question: "Estamos com prejuízo este ano.",
    answer:
      "Sem IRPJ devido não há dedução. Deixe seu contato e voltamos no próximo período de apuração.",
  },
];

export default async function EmpresasPage() {
  const projects = (await getPublicProjects()).filter(
    (p) => mechanismInfo(p.mechanism).acceptsCompanies,
  );
  return (
    <>
      {/* Topo */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Para empresas no lucro real"
          title="Até 4% do seu IRPJ já tem destino. Você escolhe qual."
          subtitle="A Lei Federal de Incentivo à Cultura (Lei 8.313/1991) permite que empresas tributadas pelo lucro real destinem até 4% do imposto de renda devido a projetos culturais aprovados pelo Ministério da Cultura. Não é gasto adicional: é a prerrogativa legal de direcionar uma parcela do imposto que já seria recolhido."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="/diagnostico?tipo=PJ" ctaId="empresas_hero_diagnostic">
            Agendar diagnóstico gratuito de 30 minutos, com o seu contador
          </CtaLink>
          <CtaLink href="/simulador" ctaId="empresas_hero_simulate" variant="outline">
            Simular agora
          </CtaLink>
        </div>
      </section>

      <DeadlineBanner />

      {/* O que a sua empresa ganha */}
      <section
        aria-labelledby="ganhos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="ganhos"
          label="Por que investir em cultura"
          title="O que a sua empresa ganha"
        />
        <ul className="grid gap-8 md:grid-cols-3">
          {gains.map((g) => (
            <li key={g.title} className="flex flex-col gap-2">
              <h3 className="site-h3">{g.title}</h3>
              <p className="text-muted-foreground">{g.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Quanto cabe */}
      <section aria-labelledby="a-conta" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="a-conta" label="A conta" title="Quanto cabe" />
          <p className="site-prose max-w-[70ch]">
            Uma indústria com R$ 2 milhões de IRPJ devido (15% sobre o lucro real, sem contar o
            adicional de 10%) pode destinar até R$ 80 mil a projetos culturais. Com R$ 500 mil de
            IRPJ, até R$ 20 mil. Se a empresa também usar esporte (2%) e os fundos da criança, do
            idoso, Pronon e Pronas (1% cada), chega a 10% do IRPJ com outro destino.{" "}
            <a
              href="#fonte-8"
              className="text-muted-foreground text-[13px] underline underline-offset-4"
            >
              fonte 8
            </a>
          </p>
          <p className="border-border bg-background text-muted-foreground max-w-[70ch] rounded-lg border p-4 text-[15px]">
            A Lei Complementar 224/2025 prevê redução de 10% nos incentivos federais a partir de
            2026. Se prevalecer a leitura da Receita Federal, o limite de cultura fica em 3,6% do
            IRPJ devido; o Ministério da Cultura contesta. O simulador mostra os dois cenários.
            [verificar]{" "}
            <a href="#fonte-11" className="underline underline-offset-4">
              fonte 11
            </a>
          </p>
          <CtaLink href="/simulador" ctaId="empresas_conta_simulate" className="self-start">
            Simular com os números da minha empresa
          </CtaLink>
        </div>
      </section>

      {/* Como funciona */}
      <section
        aria-labelledby="como-funciona"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="como-funciona"
          label="Como funciona"
          title="Sete passos, do regime à contrapartida"
        />
        <NumberedList items={steps} columns={2} />
      </section>

      {/* Quem faz o quê */}
      <section aria-labelledby="quem-faz" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
          <SectionHeader id="quem-faz" label="Divisão de competências" title="Quem faz o quê" />
          <CompetenceTable
            caption="Divisão de competências entre a empresa com o seu contador e a Prospekto"
            columns={["Sua empresa e seu contador", "Prospekto"]}
            rows={[
              {
                label: "Regime e IRPJ",
                cells: [
                  "Confirmam o regime (lucro real) e projetam o IRPJ do período",
                  "Apresenta projetos com portaria vigente e saldo a captar",
                ],
              },
              {
                label: "Projeto e valor",
                cells: [
                  "Escolhem o projeto e aprovam o valor",
                  "Formaliza o termo de patrocínio com o proponente",
                ],
              },
              {
                label: "Depósito",
                cells: [
                  "Fazem o depósito identificado na conta vinculada",
                  "Acompanha o depósito e emite o recibo de mecenato no SALIC",
                ],
              },
              {
                label: "Dedução",
                cells: [
                  "Lançam a dedução no DARF e na ECF",
                  "Executa a prestação de contas perante o Ministério da Cultura",
                ],
              },
              {
                label: "Contrapartidas",
                cells: ["Usufruem das contrapartidas", "Entrega e comprova as contrapartidas"],
              },
            ]}
          />
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

      {/* Prazo */}
      <section aria-labelledby="prazo" className="bg-sand">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-12 md:py-16">
          <h2 id="prazo" className="site-h2 max-w-[28ch]">
            Prazo
          </h2>
          <p className="site-prose max-w-[70ch]">
            Para valer na apuração do ano, o depósito precisa acontecer até o último dia útil
            bancário de dezembro. Empresas com apuração trimestral decidem a cada trimestre.{" "}
            <a
              href="#fonte-8"
              className="text-muted-foreground text-[13px] underline underline-offset-4"
            >
              fonte 8
            </a>
          </p>
        </div>
      </section>

      {/* Projetos em captação */}
      <section
        aria-labelledby="projetos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24"
      >
        <SectionHeader
          id="projetos"
          label="Projetos em captação"
          title="Projetos aprovados, com saldo a captar, abertos a empresas."
          subtitle={PROJECTS_DISCLAIMER}
        />
        {projects.length ? (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6">
            A carteira pública é publicada conforme cada proponente autoriza a divulgação. Peça o
            diagnóstico: a Daniela apresenta dois ou três projetos da carteira na conversa.
          </p>
        )}
        <CtaLink href="/projetos" ctaId="empresas_projects" variant="link" className="self-start">
          Ver a carteira completa
        </CtaLink>
      </section>

      {/* CTA final */}
      <section aria-labelledby="cta-final" className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:py-20">
          <h2 id="cta-final" className="site-h2 max-w-[24ch]">
            Faça a conta com o seu contador presente.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink
              href="/diagnostico?tipo=PJ"
              ctaId="empresas_final_diagnostic"
              className="bg-background text-primary hover:bg-background/90"
            >
              Agendar diagnóstico gratuito
            </CtaLink>
            <WhatsappButton
              message={site.whatsappMessages.empresas}
              label="Falar no WhatsApp"
              context="page"
              className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
        <LegalDisclaimer />
        <SourceNotes sources={EMPRESAS_SOURCES} />
      </div>
    </>
  );
}
