// Mensagens de WhatsApp que a Daniela envia manualmente, por pipeline e estágio
// (estrutura-e-copy.md, seção 5.6, e playbooks/linkedin.md, seção 6.2), parametrizadas por nome,
// empresa e faixa de imposto. O botão "Abrir WhatsApp" só aparece quando o lead tem telefone.
// A primeira mensagem sempre identifica a Prospekto e oferece saída ("responda SAIR").
import type { LeadSegment, LeadSource } from "@/lib/domain/enums";
import { ATTRIBUTE_VALUE_LABELS } from "./labels";

export type WhatsappLead = {
  name: string;
  segment: LeadSegment;
  pipeline: string;
  stage: string;
  source: LeadSource;
  phone: string | null;
  attributes: Record<string, unknown>;
  company?: string | null;
};

const SAIR = "Responda SAIR se não quiser mensagens por aqui.";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function bandLabel(attributes: Record<string, unknown>, segment: LeadSegment): string | null {
  const key = segment === "PF" ? "ir_devido_faixa" : "irpj_faixa";
  const value = attributes[key];
  if (typeof value !== "string" || value === "nao_sei") return null;
  return ATTRIBUTE_VALUE_LABELS[value] ?? value;
}

function companyOf(lead: WhatsappLead): string {
  if (lead.company) return lead.company;
  for (const key of ["empresa", "escritorio", "municipio", "proponente"]) {
    const v = lead.attributes[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "sua empresa";
}

function sponsorsNew(lead: WhatsappLead, nome: string, empresa: string): string {
  const faixa = bandLabel(lead.attributes, lead.segment);
  if (lead.segment === "PF") {
    const valor = faixa ? ` (faixa de IR ${faixa})` : "";
    return `Olá, ${nome}. Daniela, da Prospekto. Você pode destinar até 6% do seu IR devido${valor} para um projeto cultural da sua cidade. O depósito precisa ser feito até o último dia útil bancário de dezembro. Quer a lista de projetos que aceitam pessoa física? ${SAIR}`;
  }
  switch (lead.source) {
    case "diagnostico": {
      const formato = lead.attributes.formato;
      if (formato === "simulacao") {
        return `Olá, ${nome}. Aqui é a Daniela, da Prospekto. Recebi seu pedido de simulação para a ${empresa}: 20 minutos, eu levo a conta e dois ou três projetos. Tenho horários [dia] às [hora] e [dia] às [hora]. Qual prefere? ${SAIR}`;
      }
      return `Olá, ${nome}. Aqui é a Daniela, da Prospekto. Recebi seu pedido de diagnóstico para a ${empresa}. São 30 minutos com o seu contador na conversa. Tenho horários [dia] às [hora] e [dia] às [hora]. Qual prefere? Se não quiser receber mensagens por aqui, responda SAIR.`;
    }
    case "simulador": {
      const valor = faixa ? `na faixa de IRPJ ${faixa}, ` : "";
      return `Olá, ${nome}. Daniela, da Prospekto. Vi que você simulou: ${valor}até 4% do IRPJ da ${empresa} pode ir para um projeto cultural da região. Quer uma simulação de 20 minutos, em que eu mostro dois ou três projetos e deixo a conta pronta para o seu contador? ${SAIR}`;
    }
    case "guia":
      return `Olá, ${nome}. Daniela, da Prospekto. O guia já está no seu e-mail. Se quiser, marcamos uma simulação de 20 minutos e eu faço a conta de quanto cabe na ${empresa}. ${SAIR}`;
    default:
      return `Olá, ${nome}. Aqui é a Daniela, da Prospekto. Trabalho com incentivo fiscal à cultura na Serra (Rouanet, Audiovisual, LIC-RS). Parte do IRPJ da ${empresa} (até 4%) pode virar um projeto cultural com a sua marca. Posso explicar em 5 linhas como funciona? ${SAIR}`;
  }
}

function sponsorsMessage(lead: WhatsappLead): string {
  const nome = firstName(lead.name);
  const empresa = companyOf(lead);
  switch (lead.stage) {
    case "novo":
      return sponsorsNew(lead, nome, empresa);
    case "qualificado":
      return lead.segment === "PF"
        ? `${nome}, posso fazer a conta exata com você em 15 minutos (basta a estimativa do imposto devido deste ano) e te mostrar dois projetos daqui. Qual dia e horário funcionam?`
        : `${nome}, posso montar uma simulação com o IRPJ projetado da ${empresa}: quanto cabe no limite, quanto vira projeto e qual seria a contrapartida de marca. Leva 20 minutos e seu contador pode participar. Terça às 10h ou quinta às 15h funcionam para você?`;
    case "diagnostico":
      return `${nome}, obrigada pela conversa. Vou mandar dois ou três projetos que combinam com a ${empresa} e a conta de quanto cabe no limite. Qual o melhor e-mail para enviar a proposta?`;
    case "proposta":
      return `${nome}, ficou alguma dúvida sobre a proposta que enviei para a ${empresa}? Posso ajustar valor ou projeto; o depósito precisa acontecer até o último dia útil bancário de dezembro para valer neste ano.`;
    case "termo":
      return `${nome}, a minuta do termo está com você. Me avise se precisar de algum ajuste; assim que assinar, envio os dados da conta vinculada do projeto.`;
    case "aporte":
      return `${nome}, os dados da conta do projeto estão no e-mail. Me confirme quando o depósito for feito que eu providencio o recibo.`;
    case "recibo":
      return `${nome}, o recibo do aporte da ${empresa} está pronto e enviado ao seu contador. Qualquer dúvida na apuração, me chame.`;
    case "renovacao":
      return `Oi, ${nome}. Lembrei da ${empresa}: já temos projetos captando para este ano. Vale uma conversa sobre renovar o aporte?`;
    default:
      return `${nome}, imagino que o momento não seja esse, então não vou insistir. Fica o resumo: o depósito precisa acontecer até o último dia útil bancário de dezembro para valer na apuração deste ano. Se em algum momento fizer sentido, é só me chamar. Boa semana.`;
  }
}

function accountantsMessage(lead: WhatsappLead): string {
  const nome = firstName(lead.name);
  switch (lead.stage) {
    case "novo":
      return `Olá, ${nome}. Sou a Daniela, consultora em leis de incentivo à cultura na Serra. Escrevi um guia para escritórios contábeis sobre a dedução de IRPJ e IRPF (Rouanet, Audiovisual, LIC-RS). Quer o guia? ${SAIR}`;
    case "contato":
      return `${nome}, vou direto ao ponto: seus clientes no lucro real podem destinar até 4% do IRPJ para cultura, e somando esporte, FIA, Idoso, Pronon e Pronas chega a 10%. O escritório calcula o limite e lança na ECF; eu trago o projeto, faço o termo, o recibo no SALIC e a prestação de contas. Posso apresentar em 30 minutos na [dia] ou [dia]?`;
    case "apresentacao":
      return `${nome}, obrigada pelo tempo na apresentação. Posso devolver o diagnóstico da carteira (potencial em reais) em alguns dias; me diga quantos clientes no lucro real vocês têm hoje.`;
    case "parceria":
      return `${nome}, o acordo de parceria está com você. Assim que estiver de acordo, envio o kit para vocês oferecerem aos clientes.`;
    case "ativo":
      return `Oi, ${nome}. Passando para lembrar: cliente no lucro real anual decide em novembro e deposita até o último dia útil bancário de dezembro. Se aparecer alguém perguntando, me chame que eu atendo junto com vocês.`;
    default:
      return `${nome}, não vou insistir agora. Deixo só o lembrete que importa para o fechamento: cliente no lucro real anual decide em novembro e deposita até o último dia útil bancário de dezembro. Se aparecer um cliente perguntando, me chame. Abraço.`;
  }
}

function municipalitiesMessage(lead: WhatsappLead): string {
  const nome = firstName(lead.name);
  const municipio = companyOf(lead);
  switch (lead.stage) {
    case "novo":
      return `Olá, ${nome}. Sou a Daniela, da Prospekto. Trabalho com fomento cultural para municípios (PNAB, editais, lei de incentivo municipal). Recebi seu contato sobre ${municipio} e gostaria de marcar uma conversa de 30 minutos. ${SAIR}`;
    case "contato":
      return `${nome}, obrigada pela conversa. Para o diagnóstico do fomento de ${municipio} preciso do plano de ação da PNAB, dos editais vigentes e da lei municipal, se houver. Pode me enviar por aqui ou por e-mail?`;
    case "diagnostico":
      return `${nome}, o diagnóstico de ${municipio} está pronto. Posso apresentar para a secretaria e definir o escopo da consultoria?`;
    case "proposta":
      return `${nome}, ficou alguma dúvida sobre a proposta para ${municipio}? Posso ajustar o escopo ao orçamento da LDO e LOA.`;
    default:
      return `Oi, ${nome}. Passando para saber como está o andamento em ${municipio}. Posso ajudar em alguma etapa?`;
  }
}

function projectsMessage(lead: WhatsappLead): string {
  const nome = firstName(lead.name);
  const proponente = companyOf(lead);
  switch (lead.stage) {
    case "prospeccao":
      return `Olá, ${nome}. Sou a Daniela, da Prospekto. Trabalho com elaboração, inscrição e captação de projetos em leis de incentivo (Rouanet, Audiovisual, LIC-RS) no RS. Vocês têm projeto aprovado com saldo a captar neste ano? ${SAIR}`;
    case "avaliacao":
      return `${nome}, posso olhar o projeto de ${proponente} (portaria, saldo, prazo, enquadramento) e te dizer com franqueza se consigo captar e em que condições. Me mande o número Pronac ou o link do SALIC e marcamos 30 minutos.`;
    case "captando":
      return `Oi, ${nome}. O projeto de ${proponente} está na carteira e já apresentei para empresas da região. Me confirme se as contrapartidas e o deck continuam atualizados.`;
    default:
      return `Oi, ${nome}. Passando para alinhar o próximo passo do projeto de ${proponente}. Qual o melhor horário para conversarmos?`;
  }
}

function studentsMessage(lead: WhatsappLead): string {
  const nome = firstName(lead.name);
  switch (lead.stage) {
    case "lista_espera":
      return `Olá, ${nome}. Daniela, da Prospekto. Você entrou na lista de espera da mentoria de projetos culturais. Pode responder a pesquisa de 3 minutos que enviei por e-mail? Ela define a turma. ${SAIR}`;
    case "pesquisado":
      return `${nome}, obrigada por responder a pesquisa. Assim que abrir a turma eu te aviso por aqui com datas e valor.`;
    case "inscrito":
      return `${nome}, sua vaga está reservada. Me confirme o pagamento para garantir o lugar na turma.`;
    default:
      return `Oi, ${nome}. Tudo bem? Qualquer dúvida sobre a mentoria, me chame por aqui.`;
  }
}

export function whatsappMessageFor(lead: WhatsappLead): string {
  switch (lead.pipeline) {
    case "contadores":
      return accountantsMessage(lead);
    case "municipios":
      return municipalitiesMessage(lead);
    case "projetos":
      return projectsMessage(lead);
    case "alunos":
      return studentsMessage(lead);
    default:
      return sponsorsMessage(lead);
  }
}

// Link wa.me para o telefone do lead (E.164, +55...). null sem telefone válido.
export function whatsappHrefFor(lead: WhatsappLead): string | null {
  const digits = (lead.phone ?? "").replace(/\D/g, "");
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessageFor(lead))}`;
}
