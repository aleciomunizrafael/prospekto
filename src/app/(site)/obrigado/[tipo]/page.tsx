import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ThanksTracker } from "@/components/analytics/thanks-tracker";
import { CtaLink } from "@/components/analytics/track-link";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site, thankYouWhatsappMessage } from "@/config/site";
import { THANKS_TYPES, type ThanksType } from "@/lib/validation/forms/common";
import { DIAGNOSTIC_GENERIC_NEXT_STEP, DiagnosticoNextStep } from "./diagnostico-next-step";
import { GuideDownloadLink } from "./guide-download-link";

// Página de obrigado (docs/site/estrutura-e-copy.md, seções 4.6 e 10.1): "Recebemos. Próximo
// passo:" com a mensagem por tipo e o botão de WhatsApp com a ação no lugar do trecho entre
// colchetes. Estática para os oito tipos; parâmetros de consulta só no cliente (analytics, token do
// guia e `v`, a variante do próximo passo do diagnóstico).
export const dynamicParams = false;

export function generateStaticParams() {
  return THANKS_TYPES.map((tipo) => ({ tipo }));
}

type ThanksContent = {
  title: string;
  // Ação no passado, para a mensagem de WhatsApp: "Acabei de [ação] no site...".
  action: string;
  nextStep: string;
  cta?: { href: "/simulador" | "/diagnostico" | "/projetos" | "/guia"; label: string; id: string };
};

const CONTENT: Record<ThanksType, ThanksContent> = {
  guia: {
    title: site.guide.available ? "baixar o guia." : "aguardar o aviso da edição revisada.",
    action: site.guide.available ? "baixar o guia" : "pedir o guia",
    nextStep:
      "Enquanto isso, o simulador mostra quanto do imposto da sua empresa pode virar cultura. Responda ao e-mail se quiser que a Daniela faça a conta com você.",
    cta: { href: "/simulador", label: "Abrir o simulador", id: "thanks_guide_simulate" },
  },
  contato: {
    title: "aguardar a resposta.",
    action: "enviar uma mensagem",
    nextStep:
      "A Daniela responde em até 1 dia útil [verificar com a Daniela]. Se for urgente, chame no WhatsApp.",
  },
  diagnostico: {
    title: "marcar o diagnóstico.",
    action: "pedir o diagnóstico",
    // Texto genérico (metadata e fallback); na tela, DiagnosticoNextStep varia pelo formato (`v`).
    nextStep: DIAGNOSTIC_GENERIC_NEXT_STEP,
  },
  contadores: {
    title: "combinar o diagnóstico da carteira.",
    action: "pedir o diagnóstico da carteira",
    nextStep:
      "A Daniela entra em contato em até 2 dias úteis. Para o diagnóstico, só a quantidade de clientes no lucro real e a faixa de IRPJ de cada um; sem nomes. O guia Contabilizando Cultura traz a divisão de competências e a tabela de limites.",
    cta: { href: "/guia", label: "Pedir o guia", id: "thanks_accountant_guide" },
  },
  municipios: {
    title: "marcar a conversa de diagnóstico.",
    action: "pedir o diagnóstico do fomento municipal",
    nextStep:
      "A Daniela entra em contato em até 5 dias úteis. Ajuda ter em mãos o plano de ação da PNAB e o saldo a executar, os editais vigentes ou previstos e a lei municipal de incentivo, se existir.",
  },
  proponentes: {
    title: "aguardar o parecer de captabilidade.",
    action: "enviar meu projeto para avaliação",
    nextStep:
      "Em até 10 dias úteis você recebe o parecer de captabilidade: uma página com a leitura do projeto, o que favorece a captação e o que precisa ser ajustado. Portaria, orçamento e deck ajudam a avaliação.",
    cta: { href: "/projetos", label: "Ver a carteira", id: "thanks_proponent_projects" },
  },
  mentoria: {
    title: "responder à pesquisa.",
    action: "entrar na lista de espera da mentoria",
    nextStep:
      "Você está na lista de espera. O formato da turma é definido com quem está na lista: a pesquisa de 3 minutos chega por e-mail. Depois vêm a aula aberta e a abertura da turma.",
  },
  "aviso-projetos": {
    title: "aguardar os novos projetos.",
    action: "pedir aviso de novos projetos",
    nextStep:
      "Quando um projeto aprovado com saldo a captar entrar na carteira da Prospekto, você recebe um aviso por e-mail, com cidade, mecanismo e saldo. Enquanto isso, o simulador mostra quanto do imposto pode virar cultura.",
    cta: { href: "/simulador", label: "Abrir o simulador", id: "thanks_notify_simulate" },
  },
};

function isThanksType(value: string): value is ThanksType {
  return (THANKS_TYPES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: PageProps<"/obrigado/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  if (!isThanksType(tipo)) return {};
  return {
    title: "Recebemos",
    description: `Recebemos. Próximo passo: ${CONTENT[tipo].title}`,
    robots: { index: false, follow: false },
  };
}

export default async function ObrigadoPage({ params }: PageProps<"/obrigado/[tipo]">) {
  const { tipo } = await params;
  if (!isThanksType(tipo)) notFound();
  const content = CONTENT[tipo];
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16 md:py-24">
      <Suspense fallback={null}>
        <ThanksTracker />
      </Suspense>
      <SectionHeader
        as="h1"
        label="Recebemos"
        title={`Recebemos. Próximo passo: ${content.title}`}
        subtitle={
          tipo === "diagnostico" ? (
            <Suspense fallback={<p>{content.nextStep}</p>}>
              <DiagnosticoNextStep />
            </Suspense>
          ) : (
            content.nextStep
          )
        }
      />
      {tipo === "guia" ? (
        <Suspense fallback={null}>
          <GuideDownloadLink />
        </Suspense>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <WhatsappButton
          message={thankYouWhatsappMessage(content.action)}
          label="Adiantar a conversa no WhatsApp"
          context="thanks_page"
          variant={content.cta ? "outline" : "primary"}
        />
        {content.cta ? (
          <CtaLink href={content.cta.href} ctaId={content.cta.id} variant="outline">
            {content.cta.label}
          </CtaLink>
        ) : null}
      </div>
      <p className="text-muted-foreground text-[14px]">
        Você vai receber um e-mail de confirmação de {site.email}. Se não chegar em alguns minutos,
        confira a caixa de spam.
      </p>
    </section>
  );
}
