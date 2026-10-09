// Único módulo com dados do tenant na Fase 1; vira `tenants.settings` na Fase 2 (ADR-001, seção 7).
// Textos de WhatsApp: docs/site/estrutura-e-copy.md, seção 10.1. Textos de consentimento: seção 5.1.
// Dados marcados com [verificar] não constam das fontes e aparecem assim no site até confirmação.
export const site = {
  tenantId: "prospekto",
  name: "Prospekto Consultoria & Projetos",
  shortName: "Prospekto",
  owner: "Daniela Sandrin Copat",
  email: "projetos@prospekto.com.br",
  whatsappNumber: "5554984032180",
  whatsappDisplay: "(54) 98403-2180",
  city: "Serra Gaúcha, RS",
  region: "Serra Gaúcha, Rio Grande do Sul",
  // Dados ainda não confirmados (estrutura-e-copy.md, seção 11, perguntas 5 e 9): ficam null até
  // a confirmação e as páginas omitem o item (rodapé, /contato, /sobre), em vez de mostrar o
  // marcador [verificar] ao visitante. A política de privacidade mantém o marcador no texto.
  legal: {
    cnpj: null as string | null,
    address: null as string | null,
  },
  social: {
    linkedin: null as string | null,
    instagram: null as string | null,
  },
  // Versão da política de privacidade exibida nos formulários (consents.policy_version).
  policyVersion: "2026-10-09",
  // Guia "Contabilizando Cultura" (estrutura-e-copy.md, seção 10.3). `available` vira true quando a
  // edição revisada for aprovada e o PDF estiver em src/assets/contabilizando-cultura-guia.pdf.
  guide: {
    available: false,
    version: "2026-10",
    fileName: "contabilizando-cultura-prospekto.pdf",
    assetPath: "src/assets/contabilizando-cultura-guia.pdf",
    tokenHours: 72,
  },
  // Prazo do depósito para valer no ano-calendário (campanhas.md, seção 3.1). A faixa de prazo
  // (DeadlineBanner) aparece em novembro e dezembro e conta os dias úteis bancários até o último
  // dia útil bancário de dezembro. 31/12 não tem expediente bancário (Febraban) e 24/12 também não;
  // a data de segurança é 30/12, recuando para o dia útil anterior quando cai no fim de semana
  // [verificar na Febraban e no Banco do Brasil, inclusive os feriados bancários de cada ano].
  deadline: {
    lastBankingDayOfDecember: 30,
    // Dias sem expediente bancário em novembro e dezembro (mês-dia), além de sábados e domingos:
    // Finados (02/11), Proclamação da República (15/11), Consciência Negra (20/11, Lei 14.759/2023),
    // 24/12 e 25/12 (Natal), 31/12 [verificar].
    nonBankingDays: ["11-02", "11-15", "11-20", "12-24", "12-25", "12-31"],
    verifyNote: "[verificar]",
  },
  // Ressalva legal obrigatória em toda página com número (estrutura-e-copy.md, seção 4).
  disclaimer:
    "O cálculo final do limite é feito pelo contador, conforme a legislação vigente. Conteúdo informativo; não substitui orientação contábil ou jurídica.",
  // Textos exatos das caixas de consentimento (seção 5.1). Gravados integralmente em consents.consent_text.
  consent: {
    contact:
      "Li a Política de Privacidade e autorizo a Prospekto Consultoria & Projetos a usar meus dados para responder a esta solicitação e entrar em contato por e-mail ou telefone sobre ela.",
    marketing:
      "Quero receber materiais da Prospekto sobre incentivo fiscal à cultura por e-mail e WhatsApp. Posso cancelar quando quiser.",
    footer:
      "Seus dados ficam no CRM da Prospekto e não são vendidos nem compartilhados com terceiros, exceto os provedores necessários ao serviço (hospedagem, e-mail, WhatsApp e inteligência artificial para apoio ao atendimento). Você pode pedir acesso, correção ou exclusão pelo e-mail projetos@prospekto.com.br.",
  },
  // Menu principal (estrutura-e-copy.md, seção 3). As páginas de segmento são da próxima onda.
  nav: [
    { href: "/empresas", label: "Empresas" },
    { href: "/contadores", label: "Contadores" },
    { href: "/pessoa-fisica", label: "Pessoa física" },
    { href: "/projetos", label: "Projetos" },
    { href: "/sobre", label: "Sobre" },
  ],
  footerPages: [
    { href: "/empresas", label: "Para empresas" },
    { href: "/contadores", label: "Para contadores" },
    { href: "/pessoa-fisica", label: "Para pessoas físicas" },
    { href: "/municipios", label: "Para municípios" },
    { href: "/proponentes", label: "Para proponentes" },
    { href: "/projetos", label: "Projetos em captação" },
    { href: "/simulador", label: "Simulador" },
    { href: "/diagnostico", label: "Diagnóstico gratuito" },
    { href: "/guia", label: "Guia gratuito" },
    { href: "/mentoria", label: "Mentoria" },
    { href: "/sobre", label: "Sobre" },
    { href: "/contato", label: "Contato" },
  ],
  // Páginas públicas indexáveis (sitemap.ts), que acrescenta /projetos/[slug] a partir do CRM.
  // Páginas de campanha, /obrigado, /entrar e /app ficam fora. /conteudo/[slug] é da próxima onda.
  publicPages: [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/empresas", priority: 0.9, changeFrequency: "monthly" },
    { path: "/contadores", priority: 0.9, changeFrequency: "monthly" },
    { path: "/pessoa-fisica", priority: 0.8, changeFrequency: "monthly" },
    { path: "/municipios", priority: 0.6, changeFrequency: "monthly" },
    { path: "/proponentes", priority: 0.6, changeFrequency: "monthly" },
    { path: "/projetos", priority: 0.8, changeFrequency: "weekly" },
    { path: "/simulador", priority: 0.9, changeFrequency: "monthly" },
    { path: "/guia", priority: 0.7, changeFrequency: "monthly" },
    { path: "/diagnostico", priority: 0.8, changeFrequency: "monthly" },
    { path: "/mentoria", priority: 0.5, changeFrequency: "monthly" },
    { path: "/sobre", priority: 0.6, changeFrequency: "yearly" },
    { path: "/contato", priority: 0.5, changeFrequency: "yearly" },
    { path: "/privacidade", priority: 0.2, changeFrequency: "yearly" },
  ] as const,
  whatsappMessages: {
    // Home e rodapé
    home: "Olá, Daniela. Vi o site da Prospekto e quero entender como minha empresa pode destinar parte do imposto para cultura.",
    // /empresas
    empresas:
      "Olá, Daniela. Minha empresa é [nome], tributada pelo lucro real, de [cidade]. Quero saber quanto do IRPJ pode ir para um projeto cultural.",
    // /contadores
    contadores:
      "Olá, Daniela. Sou do escritório [nome], em [cidade]. Quero entender a parceria para clientes no lucro real.",
    // /pessoa-fisica
    pessoaFisica:
      "Olá, Daniela. Declaro pelo modelo completo e quero destinar parte do meu IR para um projeto cultural. Como faço?",
    // /municipios
    municipios:
      "Olá, Daniela. Sou da [secretaria] de [município]. Quero conversar sobre fomento cultural e editais.",
    // /proponentes
    proponentes:
      "Olá, Daniela. Tenho um projeto cultural [aprovado ou em elaboração] e quero conversar sobre captação.",
    // Página de projeto (/projetos/[slug])
    project:
      "Olá, Daniela. Tenho interesse em patrocinar o projeto [nome]. Pode me explicar as cotas e o processo?",
    // Página de obrigado (/obrigado/[tipo]); o trecho entre colchetes é trocado por tipo (thankYouWhatsappMessage).
    thankYou:
      "Olá, Daniela. Acabei de [baixar o guia / simular / pedir o diagnóstico] no site e quero adiantar a conversa.",
  },
};

export const waLink = (message: string) =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;

// Mensagem da página de obrigado com a ação concreta no lugar do trecho entre colchetes.
export const thankYouWhatsappMessage = (action: string) =>
  site.whatsappMessages.thankYou.replace("[baixar o guia / simular / pedir o diagnóstico]", action);
