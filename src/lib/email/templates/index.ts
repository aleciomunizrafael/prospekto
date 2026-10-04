// Respostas automáticas por formulário (estrutura-e-copy.md, seção 5.6) e aviso interno.
// Cada template recebe o contexto comum (nome, ação, data, marketing) e dados próprios.
// Os templates de segmento (simulador, diagnostico, contadores, municipios, proponentes, mentoria)
// são usados pelos formulários da próxima onda.
import { site } from "@/config/site";
import { appUrl } from "@/lib/app-url";
import {
  DIAGNOSTIC_NEXT_STEP,
  diagnosticNextStepVariant,
} from "@/lib/validation/forms/diagnostico-options";
import { renderEmail, type EmailBlock, type EmailContext, type RenderedEmail } from "./layout";

export type { EmailContext, RenderedEmail } from "./layout";

export type EmailTemplateData = {
  guia: { downloadUrl?: string | null; guideAvailable: boolean };
  // amountPhrase já com a preposição ("até R$ X", "entre R$ X e R$ Y", "acima de R$ X"); null
  // quando não há limite (desqualificado sem LIC-RS, sem imposto).
  simulador: { amountPhrase: string | null; summaryLines: string[]; resultUrl?: string | null };
  diagnostico: { formato: "diagnostico" | "simulacao"; tipoPessoa: "PJ" | "PF" };
  contadores: { foraDoIcp: boolean };
  municipios: Record<string, never>;
  proponentes: Record<string, never>;
  mentoria: { surveyUrl?: string | null };
  contato: Record<string, never>;
  "aviso-projetos": Record<string, never>;
};

export type EmailTemplateId = keyof EmailTemplateData;

type Renderer<K extends EmailTemplateId> = (
  ctx: EmailContext,
  data: EmailTemplateData[K],
) => RenderedEmail;

const simulatorCta = (): EmailBlock => ({
  type: "cta",
  label: "Abrir o simulador",
  href: `${appUrl()}/simulador`,
});

const whatsappLine = (): EmailBlock => ({
  type: "paragraph",
  text: `Se preferir falar agora: WhatsApp ${site.whatsappDisplay}.`,
});

export const guia: Renderer<"guia"> = (ctx, data) =>
  renderEmail(
    ctx,
    "Seu guia Contabilizando Cultura",
    data.guideAvailable && data.downloadUrl
      ? [
          {
            type: "paragraph",
            text: "Seu guia está pronto. O link abaixo vale por 72 horas; depois disso, peça de novo pelo site.",
          },
          { type: "cta", label: "Baixar o guia (PDF)", href: data.downloadUrl },
          { type: "paragraph", text: "Três coisas para olhar primeiro:" },
          {
            type: "list",
            items: [
              "Os dois mitos sobre a Lei Rouanet e o que diz a lei.",
              "O passo a passo em seis etapas, da elegibilidade à dedução no DARF.",
              "A tabela de limites: até 4% do IRPJ devido (3,6% com a LC 224/2025) para empresas e até 6% do imposto devido para pessoas físicas.",
            ],
          },
          {
            type: "paragraph",
            text: "Quer ver quanto cabe na sua empresa? O simulador faz a conta em dois minutos.",
          },
          simulatorCta(),
          {
            type: "paragraph",
            text: "Responda a este e-mail se quiser que eu faça a conta com você.",
          },
        ]
      : [
          {
            type: "paragraph",
            text: "Recebi seu pedido. A edição revisada do guia Contabilizando Cultura, com os números atualizados e as fontes, está em fase final de revisão. Assim que estiver disponível, envio o link de download para este e-mail.",
          },
          {
            type: "paragraph",
            text: "Enquanto isso, o simulador mostra quanto do imposto da sua empresa pode virar cultura.",
          },
          simulatorCta(),
          {
            type: "paragraph",
            text: "Responda a este e-mail se quiser que eu faça a conta com você.",
          },
        ],
  );

export const simulador: Renderer<"simulador"> = (ctx, data) =>
  renderEmail(
    ctx,
    data.amountPhrase
      ? `Sua simulação: ${data.amountPhrase} para cultura`
      : "Sua simulação: outras formas de apoiar cultura",
    [
      { type: "paragraph", text: "Resumo da sua simulação:" },
      { type: "list", items: data.summaryLines },
      ...(data.resultUrl
        ? [{ type: "cta", label: "Ver o resultado detalhado", href: data.resultUrl } as EmailBlock]
        : []),
      {
        type: "paragraph",
        text: "Próximo passo: o diagnóstico gratuito, 30 minutos com o seu contador, para confirmar o limite e escolher o projeto.",
      },
      { type: "cta", label: "Agendar o diagnóstico", href: `${appUrl()}/diagnostico` },
      {
        type: "paragraph",
        text: "A simulação é uma estimativa com os dados informados; o cálculo final é do contador.",
      },
    ],
  );

export const diagnostico: Renderer<"diagnostico"> = (ctx, data) =>
  renderEmail(ctx, "Recebi seu pedido de diagnóstico", [
    {
      type: "paragraph",
      text: `Entro em contato em até 1 dia útil pelo WhatsApp ou telefone informado para ${DIAGNOSTIC_NEXT_STEP[diagnosticNextStepVariant(data.formato, data.tipoPessoa)]} Se quiser adiantar, responda com dois horários.`,
    },
    whatsappLine(),
  ]);

export const contadores: Renderer<"contadores"> = (ctx, data) =>
  renderEmail(ctx, "Diagnóstico da carteira: próximos passos", [
    data.foraDoIcp
      ? {
          type: "paragraph",
          text: "Pelo que você informou, o escritório ainda não tem clientes no lucro real. Nesse caso, o caminho mais direto é a LIC-RS (Lei de Incentivo à Cultura do Rio Grande do Sul), que usa o ICMS e alcança empresas no lucro presumido. Posso apresentar como funciona em uma conversa curta.",
        }
      : {
          type: "paragraph",
          text: "Entro em contato em até 2 dias úteis para combinar o diagnóstico da carteira. O que você recebe: o potencial de incentivo cultural da carteira em reais, por cliente no lucro real, com a base legal e o que o escritório precisa lançar. Para isso, vou pedir só a quantidade de clientes no lucro real e a faixa de IRPJ de cada um; sem nomes.",
        },
    {
      type: "paragraph",
      text: "O guia Contabilizando Cultura traz a divisão de competências entre a Prospekto e o escritório e a tabela de limites.",
    },
    { type: "cta", label: "Pedir o guia", href: `${appUrl()}/guia` },
    {
      type: "paragraph",
      text: "Quando houver webinar para contadores, você recebe o convite por aqui.",
    },
  ]);

export const municipios: Renderer<"municipios"> = (ctx) =>
  renderEmail(ctx, "Recebemos o pedido de diagnóstico do fomento municipal", [
    {
      type: "paragraph",
      text: "Entro em contato em até 5 dias úteis para marcar a conversa de diagnóstico.",
    },
    { type: "paragraph", text: "O que ajuda a ter em mãos na conversa:" },
    {
      type: "list",
      items: [
        "Plano de ação da PNAB (Política Nacional Aldir Blanc) e o saldo a executar, se houver.",
        "Editais vigentes ou previstos para o ano.",
        "Lei municipal de incentivo à cultura, se existir ou estiver em tramitação.",
      ],
    },
    whatsappLine(),
  ]);

export const proponentes: Renderer<"proponentes"> = (ctx) =>
  renderEmail(ctx, "Seu projeto foi recebido para avaliação", [
    {
      type: "paragraph",
      text: "Em até 10 dias úteis você recebe o parecer de captabilidade: uma página com a leitura do projeto, o que favorece a captação e o que precisa ser ajustado.",
    },
    { type: "paragraph", text: "O que ajuda a avaliação:" },
    {
      type: "list",
      items: [
        "Portaria de autorização (SALIC), despacho da Ancine ou o número do processo.",
        "Orçamento aprovado e saldo a captar.",
        "Apresentação do projeto (deck), se houver.",
      ],
    },
    {
      type: "paragraph",
      text: "A captação é remunerada dentro do limite legal (até 10% do valor do projeto, teto de R$ 150 mil, IN MinC 29/2026, art. 19) e só sobre o que for efetivamente captado.",
    },
  ]);

export const mentoria: Renderer<"mentoria"> = (ctx, data) =>
  renderEmail(ctx, "Você está na lista de espera da mentoria", [
    {
      type: "paragraph",
      text: "Obrigada pelo interesse. Você está na lista de espera da mentoria para escrever, inscrever e captar projetos culturais.",
    },
    ...(data.surveyUrl
      ? [
          {
            type: "paragraph",
            text: "O formato da turma é definido com quem está na lista. Responda à pesquisa (3 minutos):",
          } as EmailBlock,
          { type: "cta", label: "Responder à pesquisa", href: data.surveyUrl } as EmailBlock,
        ]
      : [
          {
            type: "paragraph",
            text: "O formato da turma é definido com quem está na lista: em breve você recebe uma pesquisa de 3 minutos.",
          } as EmailBlock,
        ]),
    {
      type: "paragraph",
      text: "O que vem a seguir: uma aula aberta e, depois, a abertura da turma. Você é avisado por este e-mail.",
    },
  ]);

export const contato: Renderer<"contato"> = (ctx) =>
  renderEmail(ctx, "Recebemos sua mensagem", [
    {
      type: "paragraph",
      text: "Obrigada pela mensagem. Respondo em até 1 dia útil.",
    },
    { type: "paragraph", text: `Se for urgente, chame no WhatsApp ${site.whatsappDisplay}.` },
  ]);

export const avisoProjetos: Renderer<"aviso-projetos"> = (ctx) =>
  renderEmail(ctx, "Você será avisado sobre novos projetos", [
    {
      type: "paragraph",
      text: "Quando um projeto aprovado com saldo a captar entrar na carteira da Prospekto, você recebe um aviso por este e-mail, com cidade, mecanismo e saldo.",
    },
    {
      type: "paragraph",
      text: "Enquanto isso, o simulador mostra quanto do imposto pode virar cultura.",
    },
    simulatorCta(),
  ]);

export const EMAIL_TEMPLATES: { [K in EmailTemplateId]: Renderer<K> } = {
  guia,
  simulador,
  diagnostico,
  contadores,
  municipios,
  proponentes,
  mentoria,
  contato,
  "aviso-projetos": avisoProjetos,
};

export function renderTemplate<K extends EmailTemplateId>(
  id: K,
  ctx: EmailContext,
  data: EmailTemplateData[K],
): RenderedEmail {
  return EMAIL_TEMPLATES[id](ctx, data);
}

// Aviso interno para LEAD_NOTIFY_EMAIL (estrutura-e-copy.md, seção 10.2: "cópia interna" com
// link para o lead no CRM). Vai por e-mail, não por log; por isso pode conter os dados do lead.
export function renderLeadNotification(input: {
  formId: string;
  segment: string;
  pipeline: string;
  stage: string;
  created: boolean;
  leadId: string;
  summary: Record<string, string>;
}): RenderedEmail {
  const crmUrl = `${appUrl()}/app/leads/${input.leadId}`;
  const subject = `${input.created ? "Novo lead" : "Lead atualizado"}: ${input.formId} (${input.segment})`;
  const lines = Object.entries(input.summary).map(([k, v]) => `${k}: ${v}`);
  const text = [
    subject,
    "",
    `Pipeline: ${input.pipeline} · Estágio: ${input.stage}`,
    "",
    ...lines,
    "",
    `Abrir no CRM: ${crmUrl}`,
  ].join("\n");
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:Inter,Helvetica,Arial,sans-serif;color:#1E2A32;font-size:15px;line-height:1.6;padding:16px">
<p style="margin:0 0 12px;font-weight:600">${esc(subject)}</p>
<p style="margin:0 0 12px">Pipeline: ${esc(input.pipeline)} · Estágio: ${esc(input.stage)}</p>
<ul style="margin:0 0 16px;padding-left:20px">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p><a href="${esc(crmUrl)}" style="color:#163B5C">Abrir no CRM</a></p>
</body></html>`;
  return { subject, text, html };
}
