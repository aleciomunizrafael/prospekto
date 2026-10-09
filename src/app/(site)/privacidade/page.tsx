import type { Metadata } from "next";
import { SectionHeader } from "@/components/site/section-header";
import { site } from "@/config/site";

// Política de privacidade (docs/site/estrutura-e-copy.md, seção 5.7). Base: Lei 13.709/2018 (LGPD).
// Os trechos [verificar] dependem de confirmação da Daniela e de revisão por advogado antes de
// publicar (seção 11, perguntas 5 e 6).
export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Como a Prospekto Consultoria & Projetos coleta, usa e protege os dados de quem usa o site e os formulários, conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

type Section = {
  id: string;
  title: string;
  // 3 para subseções (3.1), aninhadas sob o h2 anterior.
  level?: 2 | 3;
  paragraphs: string[];
  items?: string[];
};

const sections: Section[] = [
  {
    id: "quem-somos",
    title: "1. Quem somos",
    paragraphs: [
      `A controladora dos dados é a ${site.name}, CNPJ ${site.legal.cnpj ?? "[verificar]"}, com endereço em ${site.legal.address ?? "[verificar cidade e endereço]"}, ${site.region}. Contato: ${site.email}.`,
    ],
  },
  {
    id: "encarregado",
    title: "2. Encarregada ou encarregado de dados",
    paragraphs: [
      "Nome e e-mail do encarregado pelo tratamento de dados pessoais (LGPD, art. 41): [verificar: Daniela ou o sócio]. Enquanto não houver designação formal, os pedidos vão para projetos@prospekto.com.br.",
    ],
  },
  {
    id: "dados",
    title: "3. Dados que coletamos",
    paragraphs: ["Nos formulários do site, só o que você informa:"],
    items: [
      "nome, e-mail e telefone;",
      "empresa ou escritório, cargo, cidade e UF;",
      "regime tributário e faixa de imposto declarados, quando você usa o simulador ou pede o diagnóstico;",
      "mensagem livre, quando você escreve para nós.",
    ],
  },
  {
    id: "navegacao",
    title: "3.1 Dados de navegação",
    level: 3,
    paragraphs: [
      "Páginas visitadas, origem da visita (por exemplo, o parâmetro utm_source de um link), tipo de dispositivo e navegador, de forma agregada e sem cookies. CPF nunca é coletado no site. CNPJ só quando você opta por informar.",
    ],
  },
  {
    id: "finalidades",
    title: "4. Para que usamos",
    paragraphs: ["Usamos os dados para:"],
    items: [
      "responder às suas solicitações;",
      "marcar reuniões (simulação e diagnóstico);",
      "enviar materiais sobre incentivo fiscal à cultura, só quando você autoriza na caixa própria;",
      "calcular estimativas no simulador;",
      "operar os patrocínios contratados (termo, depósito, recibo, prestação de contas).",
    ],
  },
  {
    id: "bases-legais",
    title: "5. Bases legais",
    paragraphs: ["Tratamos dados com base na Lei 13.709/2018:"],
    items: [
      "consentimento (art. 7º, I), registrado com o texto exibido, a versão desta política e a data;",
      "execução de contrato ou de procedimentos preliminares (art. 7º, V), nos patrocínios contratados;",
      "legítimo interesse (art. 7º, IX) para contato profissional com empresas e escritórios, sempre com opção de saída.",
    ],
  },
  {
    id: "compartilhamento",
    title: "6. Com quem compartilhamos",
    paragraphs: [
      "Com os provedores necessários ao serviço: hospedagem do site e do CRM, e-mail transacional, WhatsApp (Meta), ferramenta de analytics agregado e inteligência artificial para apoio ao atendimento. Nunca vendemos dados. Patrocinador e proponente só conhecem os dados um do outro na etapa do termo de patrocínio.",
      "Usamos inteligência artificial (Anthropic, fornecedora da Claude API) para resumir o histórico de contato e preparar rascunhos de resposta, sempre revisados por uma pessoa da Prospekto antes de qualquer envio. Enviamos ao fornecedor só o necessário para isso: nome, empresa, cidade, o assunto do contato e o teor das conversas registradas; nunca e-mail, telefone, CPF ou dados bancários. Esses dados não são usados para treinar modelos e são apagados pelo fornecedor em até 30 dias. O ditado de notas pela equipe usa o reconhecimento de voz do próprio navegador.",
      "O fornecedor de inteligência artificial processa os dados fora do Brasil, sob cláusulas contratuais de proteção de dados (LGPD, art. 33, II, c) [verificar com o advogado].",
    ],
  },
  {
    id: "retencao",
    title: "7. Por quanto tempo",
    paragraphs: [
      "Dados de quem não contratou nada: 24 meses após o último contato [verificar com advogado]. Documentos de patrocínio: 5 anos após a prestação de contas, pela guarda exigida ao projeto.",
    ],
  },
  {
    id: "direitos",
    title: "8. Seus direitos",
    paragraphs: [
      "Pelo art. 18 da LGPD, você pode pedir: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação; portabilidade; informação sobre com quem compartilhamos; e revogação do consentimento a qualquer momento.",
      "Para exercer qualquer um deles, escreva para projetos@prospekto.com.br. Respondemos em até 15 dias [verificar prazo adotado]. Para deixar de receber materiais, basta responder a qualquer e-mail da Prospekto com a palavra SAIR ou escrever para o mesmo endereço.",
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies e analytics",
    paragraphs: [
      "O site não usa cookies de rastreamento. A ferramenta de analytics (Vercel Web Analytics) registra visitas de forma agregada, sem identificar a pessoa e sem cookies [verificar com o advogado à luz da LGPD e do guia de cookies da ANPD]. Os formulários guardam, só na sessão do seu navegador, a origem da visita para registrar de onde veio o contato.",
    ],
  },
  {
    id: "seguranca",
    title: "10. Segurança",
    paragraphs: [
      "Acesso restrito ao CRM, com login individual da equipe da Prospekto; criptografia em trânsito (HTTPS) e em repouso no banco de dados; registros de atividade sem dados pessoais.",
    ],
  },
  {
    id: "alteracoes",
    title: "11. Alterações",
    paragraphs: [
      "Esta política tem versão e data. Mudanças são publicadas nesta página e as versões anteriores ficam arquivadas. Quando uma mudança afetar o uso dos seus dados, pedimos novo consentimento.",
    ],
  },
  {
    id: "versao",
    title: "12. Versão",
    paragraphs: [
      `Versão ${site.policyVersion} [verificar revisão por advogado antes de publicar].`,
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 md:py-24">
      <SectionHeader
        as="h1"
        label="LGPD"
        title="Política de privacidade"
        subtitle={`Como a ${site.name} coleta, usa e protege os seus dados. Base: Lei 13.709/2018 (Lei Geral de Proteção de Dados Pessoais, LGPD).`}
      />
      <nav aria-label="Seções desta política" className="bg-sand rounded-lg p-5">
        <p className="site-label mb-3">Nesta página</p>
        <ol className="grid gap-1 text-[15px] sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline-offset-4 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-titulo`}
          className="flex flex-col gap-3"
        >
          {s.level === 3 ? (
            <h3 id={`${s.id}-titulo`} className="site-h3">
              {s.title}
            </h3>
          ) : (
            <h2 id={`${s.id}-titulo`} className="site-h3">
              {s.title}
            </h2>
          )}
          {s.paragraphs.map((p) => (
            <p key={p} className="site-prose">
              {p}
            </p>
          ))}
          {s.items ? (
            <ul className="site-prose flex list-disc flex-col gap-1 pl-5">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </section>
  );
}
