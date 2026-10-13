// Mensagens de WhatsApp da prospecção (ADR-004, 6.6; plano, P9), na voz da Daniela: apresentação
// honesta do que a Prospekto faz, convite para a empresa contar como decide apoios e patrocínios,
// nenhuma suposição sobre a rotina ou a dor da empresa, nenhum número sem ressalva (a primeira
// mensagem não traz números), nenhuma promessa de retorno, e sempre a saída "Responda SAIR"
// (campanhas.md, 1.2, a mesma regra de whatsapp-messages.ts). Três variações para não parecer
// disparo em massa entre empresas que se conhecem; a escolhida vem de um hash estável do id do
// item (a mesma empresa abre sempre na mesma). Funções puras.

export const PROSPECTING_EXIT_LINE = "Responda SAIR se não quiser mensagens por aqui.";

// Como se referir à empresa sem errar o artigo ("aí na Vinícola…", "aí no Instituto…").
const LOCAL_FEM =
  /^(vinícola|vinicola|adega|cantina|cervejaria|cooperativa|associação|associacao|fundação|fundacao|fábrica|fabrica|metalúrgica|metalurgica|indústria|industria|empresa|construtora|transportadora|madeireira|loja|rede|agência|agencia|escola|faculdade|universidade|clínica|clinica|casa|pousada|distribuidora|editora|gráfica|grafica|farmácia|farmacia|padaria|confeitaria|serralheria|marcenaria|oficina|imobiliária|imobiliaria|livraria|academia)\b/i;
const LOCAL_MASC =
  /^(instituto|grupo|centro|hospital|espaço|espaco|núcleo|nucleo|condomínio|condominio|escritório|escritorio|hotel|restaurante|clube|colégio|colegio|estúdio|estudio|moinho|frigorífico|frigorifico|laboratório|laboratorio|parque|banco|supermercado|mercado|atacado|shopping|posto|sindicato|consórcio|consorcio|armazém|armazem|lar|solar)\b/i;

export function localRef(companyName: string): string {
  const n = companyName.trim();
  if (n.length > 0 && n.length <= 34) {
    if (LOCAL_FEM.test(n)) return `aí na ${n}`;
    if (LOCAL_MASC.test(n)) return `aí no ${n}`;
  }
  return "aí";
}

export function prospectingMessages(companyName: string): string[] {
  const local = localRef(companyName);
  return [
    `Olá, tudo bem? Aqui é a Daniela, da Prospekto.\n` +
      `Trabalho com patrocínio cultural por lei de incentivo na Serra: a empresa apoia um projeto da região com a própria marca e a conta é feita junto com o contador, sem promessa de retorno.\n` +
      `Antes de qualquer coisa, queria entender como vocês decidem apoios e patrocínios ${local}. Me conta?\n\n` +
      PROSPECTING_EXIT_LINE,
    `Olá! Daniela aqui, da Prospekto.\n\n` +
      `Ajudo empresas da Serra a patrocinar projetos culturais pelas leis de incentivo, com o contador acompanhando cada passo. Nada de pacote pronto: primeiro entendo como a empresa pensa apoios e patrocínios, depois vemos se faz sentido.\n\n` +
      `Posso te mandar um áudio de 40 segundos me apresentando melhor?\n\n` +
      PROSPECTING_EXIT_LINE,
    `Olá! Sou a Daniela, da Prospekto.\n` +
      `Trabalho com leis de incentivo à cultura (Rouanet, Audiovisual, LIC-RS) na Serra. A empresa apoia um projeto cultural com a própria marca e o contador confere tudo antes; não prometo retorno, cada caso é uma conta.\n` +
      `Quem seria a pessoa certa para essa conversa ${local}?\n\n` +
      PROSPECTING_EXIT_LINE,
  ];
}

// Variação estável por item: a mesma empresa abre sempre na mesma mensagem.
export function variantIndexFor(id: string, count: number): number {
  if (count <= 0) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % count;
}

// Celular brasileiro em E.164: +55, DDD, nono dígito 9 e mais oito (13 dígitos). Fixo (12 dígitos)
// e qualquer outro formato não servem para WhatsApp (ADR-004, 6.12).
const MOBILE_BR = /^\+55\d{2}9\d{8}$/;

export function isWhatsappMobile(phone: string | null | undefined): boolean {
  return !!phone && MOBILE_BR.test(phone);
}

// Link wa.me com o texto editado; null quando o telefone não é celular brasileiro.
export function whatsappHrefForPhone(
  phone: string | null | undefined,
  text: string,
): string | null {
  if (!isWhatsappMobile(phone)) return null;
  return `https://wa.me/${phone!.slice(1)}?text=${encodeURIComponent(text)}`;
}
