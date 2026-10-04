// Único módulo com dados do tenant na Fase 1; vira `tenants.settings` na Fase 2 (ADR-001, seção 7).
// Textos de WhatsApp: docs/site/estrutura-e-copy.md, seção 10.1.
export const site = {
  tenantId: "prospekto",
  name: "Prospekto Consultoria & Projetos",
  owner: "Daniela Sandrin Copat",
  email: "projetos@prospekto.com.br",
  whatsappNumber: "5554984032180",
  whatsappDisplay: "(54) 98403-2180",
  city: "Serra Gaúcha, RS",
  policyVersion: "2026-10-03",
  whatsappMessages: {
    // Home e rodapé
    home: "Olá, Daniela. Vi o site da Prospekto e quero entender como minha empresa pode destinar parte do imposto para cultura.",
    // /empresas
    companies:
      "Olá, Daniela. Minha empresa é [nome], tributada pelo lucro real, de [cidade]. Quero saber quanto do IRPJ pode ir para um projeto cultural.",
    // /contadores
    accountants:
      "Olá, Daniela. Sou do escritório [nome], em [cidade]. Quero entender a parceria para clientes no lucro real.",
    // /pessoa-fisica
    individuals:
      "Olá, Daniela. Declaro pelo modelo completo e quero destinar parte do meu IR para um projeto cultural. Como faço?",
    // /municipios
    municipalities:
      "Olá, Daniela. Sou da [secretaria] de [município]. Quero conversar sobre fomento cultural e editais.",
    // /proponentes
    proponents:
      "Olá, Daniela. Tenho um projeto cultural [aprovado ou em elaboração] e quero conversar sobre captação.",
    // Página de projeto (/projetos/[slug])
    project:
      "Olá, Daniela. Tenho interesse em patrocinar o projeto [nome]. Pode me explicar as cotas e o processo?",
    // Página de obrigado (/obrigado/[tipo])
    thankYou:
      "Olá, Daniela. Acabei de [baixar o guia / simular / pedir o diagnóstico] no site e quero adiantar a conversa.",
  },
} as const;

export const waLink = (message: string) =>
  `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
