// Enums do modelo de dados (modelo-de-dados.md, seção 4). Fonte única dos pgEnum em
// src/lib/db/schema/enums.ts e dos schemas Zod em src/lib/validation/. Valores que o
// negócio lê ficam em português sem acento, como em personas-e-funis.md.

export const LEAD_SEGMENTS = ["PJ", "PF", "CONT", "MUN", "PROP", "ALUNO"] as const;
export type LeadSegment = (typeof LEAD_SEGMENTS)[number];

export const LEAD_TEMPERATURES = ["frio", "morno", "quente"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const LEAD_SOURCES = [
  "site",
  "guia",
  "simulador",
  "diagnostico",
  "linkedin",
  "indicacao_contador",
  "indicacao_cliente",
  "evento",
  "campanha",
  "whatsapp",
  "outro",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_INTERESTS = [
  "rouanet",
  "audiovisual",
  "lic_rs",
  "lic_municipal",
  "pnab_editais",
  "consultoria",
  "mentoria",
  "nao_sei",
] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number];

export const LOST_REASONS = [
  "sem_irpj",
  "regime_inelegivel",
  "sem_decisor",
  "sem_interesse",
  "prazo_perdido",
  "escolheu_outro_captador",
  "escolheu_outro_incentivo",
  "vinculo_art27",
  "vantagem_indevida",
  "sem_resposta",
  "outro",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const TAX_REGIMES = [
  "lucro_real",
  "lucro_presumido",
  "lucro_arbitrado",
  "simples_nacional",
  "nao_sei",
] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const REGIME_CONFIRMATIONS = ["contador", "ecf", "declarado"] as const;
export type RegimeConfirmation = (typeof REGIME_CONFIRMATIONS)[number];

// Chaves de parametros-simulador.json (`mecanismos`) mais os valores de fomento direto
// e a LIC municipal (modelo-de-dados.md, seção 4.6).
export const INCENTIVE_MECHANISMS = [
  "rouanet_art18",
  "rouanet_art26_patrocinio",
  "rouanet_art26_doacao",
  "audiovisual_art1",
  "audiovisual_art1A",
  "audiovisual_art3",
  "audiovisual_art3A",
  "funcines",
  "lic_rs",
  "esporte",
  "fia",
  "idoso",
  "pronon",
  "pronas",
  "lic_municipal",
  "fsa_brde",
  "pnab",
  "edital",
] as const;
export type IncentiveMechanism = (typeof INCENTIVE_MECHANISMS)[number];

// Mecanismos de fomento direto: o projeto existe, mas não recebe aporte de incentivador (R-9).
export const DIRECT_FUNDING_MECHANISMS = [
  "fsa_brde",
  "pnab",
  "edital",
] as const satisfies readonly IncentiveMechanism[];

export const ACTIVITY_TYPES = [
  "ligacao",
  "reuniao",
  "email",
  "whatsapp",
  "visita",
  "nota",
  "tarefa",
  "formulario",
  "download",
  "sistema",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CONTRIBUTION_TYPES = ["patrocinio", "doacao"] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const CONTRIBUTION_STATUSES = [
  "proposta",
  "termo_assinado",
  "depositado",
  "recibo_emitido",
  "cancelado",
] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const CONSENT_PURPOSES = ["contato_comercial", "marketing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ["email", "whatsapp", "telefone"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const ORGANIZATION_TYPES = [
  "empresa",
  "contabilidade",
  "municipio",
  "proponente",
  "outro",
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const TAXPAYER_KINDS = ["pj", "pf"] as const;
export type TaxpayerKind = (typeof TAXPAYER_KINDS)[number];

export const EMAIL_STATUSES = ["ok", "bounced", "complained"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const USER_ROLES = ["owner", "operator"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;
export type Uf = (typeof UFS)[number];
