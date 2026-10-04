// Score de 0 a 100 por segmento e temperatura derivada (personas-e-funis.md, seções 2, 5.2 e 5.3).
// Puro: recebe os critérios já medidos; o adaptador `scoreInputFromLead` traduz os `attributes`
// do lead (seção 9.3) para esses critérios.
import type { LeadSegment, LeadSource, LeadTemperature } from "./enums";

export type ScoreBreakdown = Record<string, number>;
export type ScoreResult = {
  score: number;
  temperature: LeadTemperature;
  breakdown: ScoreBreakdown;
};

export function temperatureFor(score: number): LeadTemperature {
  if (score >= 70) return "quente";
  if (score >= 40) return "morno";
  return "frio";
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function finish(breakdown: ScoreBreakdown): ScoreResult {
  const score = clamp(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score, temperature: temperatureFor(score), breakdown };
}

// PJ
export type IrpjBand = "ate_100k" | "100k_500k" | "500k_2500k" | "acima_2500k" | "nao_sei";
export type PjScoreInput = {
  regimeConfirmedLucroReal: boolean; // informado e confirmado por contador ou ECF
  irpjBand?: IrpjBand | null;
  decisionMakerInContact: boolean;
  incentiveHistory: "usou" | "conhece" | "nenhum" | null | undefined;
  daysToPeriodClose?: number | null; // dias até o fechamento do período de apuração
  source: LeadSource;
};

const IRPJ_BAND_POINTS: Record<IrpjBand, number> = {
  ate_100k: 5,
  "100k_500k": 12,
  "500k_2500k": 20,
  acima_2500k: 25,
  nao_sei: 0,
};

export function scorePj(i: PjScoreInput): ScoreResult {
  const timing =
    i.daysToPeriodClose == null
      ? 0
      : i.daysToPeriodClose <= 90
        ? 10
        : i.daysToPeriodClose <= 180
          ? 5
          : 0;
  const origin =
    i.source === "indicacao_contador" || i.source === "indicacao_cliente"
      ? 10
      : i.source === "simulador" || i.source === "diagnostico"
        ? 7
        : i.source === "guia" || i.source === "linkedin" || i.source === "evento"
          ? 4
          : 2;
  return finish({
    regime: i.regimeConfirmedLucroReal ? 30 : 0,
    irpj: i.irpjBand ? IRPJ_BAND_POINTS[i.irpjBand] : 0,
    decisor: i.decisionMakerInContact ? 15 : 0,
    historico: i.incentiveHistory === "usou" ? 10 : i.incentiveHistory === "conhece" ? 5 : 0,
    timing,
    origem: origin,
  });
}

// PF
export type IrBand = "ate_20k" | "20k_80k" | "acima_80k" | "nao_sei";
export type PfScoreInput = {
  fullDeclarationModel: boolean;
  irBand?: IrBand | null;
  accountantIdentified: boolean;
  alreadyDonatesWithIncentive: boolean;
  month: number; // 1 a 12
  source: LeadSource;
};

const IR_BAND_POINTS: Record<IrBand, number> = {
  ate_20k: 5,
  "20k_80k": 15,
  acima_80k: 25,
  nao_sei: 0,
};

export function scorePf(i: PfScoreInput): ScoreResult {
  // "Origem (indicação ou empresa patrocinadora: 10; simulador: 7; demais: 3)": a empresa
  // patrocinadora chega como `indicacao_cliente`.
  const origin =
    i.source === "indicacao_contador" || i.source === "indicacao_cliente"
      ? 10
      : i.source === "simulador"
        ? 7
        : 3;
  return finish({
    modelo: i.fullDeclarationModel ? 30 : 0,
    imposto: i.irBand ? IR_BAND_POINTS[i.irBand] : 0,
    contador: i.accountantIdentified ? 15 : 0,
    doa: i.alreadyDonatesWithIncentive ? 10 : 0,
    timing: i.month >= 9 && i.month <= 12 ? 10 : 3,
    origem: origin,
  });
}

// CONT
export type LucroRealClientsBand = "nenhum" | "1_4" | "5_19" | "20_mais";
export type ContScoreInput = {
  lucroRealClientsBand?: LucroRealClientsBand | null;
  partnerInContact: boolean;
  alreadyFiledIncentive: boolean;
  location: "serra" | "rs" | "outro" | null | undefined;
  acceptedMeetingOrWebinar: boolean;
  source: LeadSource;
};

const CLIENTS_BAND_POINTS: Record<LucroRealClientsBand, number> = {
  nenhum: 0,
  "1_4": 10,
  "5_19": 20,
  "20_mais": 30,
};

export function scoreCont(i: ContScoreInput): ScoreResult {
  const origin =
    i.source === "indicacao_contador" || i.source === "indicacao_cliente" || i.source === "evento"
      ? 10
      : 4;
  return finish({
    clientes: i.lucroRealClientsBand ? CLIENTS_BAND_POINTS[i.lucroRealClientsBand] : 0,
    socio: i.partnerInContact ? 20 : 0,
    lancou: i.alreadyFiledIncentive ? 15 : 0,
    sede: i.location === "serra" ? 10 : i.location === "rs" ? 5 : 0,
    reuniao: i.acceptedMeetingOrWebinar ? 15 : 0,
    origem: origin,
  });
}

// MUN
export type MunScoreInput = {
  hasCultureDepartmentWithHead: boolean;
  pnabActiveOrBalance: boolean;
  canContractThisYear: boolean;
  secretaryOrMayorInContact: boolean;
  within60DaysOfDeadline: boolean;
  priorRelationship: boolean;
};

export function scoreMun(i: MunScoreInput): ScoreResult {
  return finish({
    setor: i.hasCultureDepartmentWithHead ? 15 : 0,
    pnab: i.pnabActiveOrBalance ? 20 : 0,
    dotacao: i.canContractThisYear ? 20 : 0,
    decisor: i.secretaryOrMayorInContact ? 20 : 0,
    timing: i.within60DaysOfDeadline ? 10 : 0,
    relacao: i.priorRelationship ? 15 : 0,
  });
}

// PROP
export type PropScoreInput = {
  hasValidAuthorization: boolean; // portaria SALIC, Ancine ou CHP vigente
  balanceInRangeAndDeadlineOver6Months: boolean; // R$ 100 mil a R$ 1,5 mi e prazo acima de 6 meses
  fullDeductionMechanism: boolean; // art. 18 ou art. 1º-A
  proponentRegular: boolean;
  regionalAppealAndPartners: boolean;
  fundraisingFeeBudgeted: boolean;
};

export function scoreProp(i: PropScoreInput): ScoreResult {
  return finish({
    portaria: i.hasValidAuthorization ? 30 : 0,
    saldo: i.balanceInRangeAndDeadlineOver6Months ? 20 : 0,
    enquadramento: i.fullDeductionMechanism ? 10 : 0,
    regular: i.proponentRegular ? 15 : 0,
    apelo: i.regionalAppealAndPartners ? 15 : 0,
    rubrica: i.fundraisingFeeBudgeted ? 10 : 0,
  });
}

// ALUNO
export type AlunoScoreInput = {
  objectiveDeclared: boolean;
  hasProjectOrWorksInCulture: boolean;
  willingToInvest: boolean;
  answeredSurvey: boolean;
  fromReferralOrOpenClass: boolean;
};

export function scoreAluno(i: AlunoScoreInput): ScoreResult {
  return finish({
    objetivo: i.objectiveDeclared ? 20 : 0,
    projeto: i.hasProjectOrWorksInCulture ? 25 : 0,
    investimento: i.willingToInvest ? 20 : 0,
    pesquisa: i.answeredSurvey ? 20 : 0,
    origem: i.fromReferralOrOpenClass ? 15 : 5,
  });
}

// Dias até o fim do período de apuração do IRPJ (Lei 9.430/1996, arts. 1º e 2º):
// trimestral: fim do trimestre corrente; anual: 31/12.
export function daysToPeriodClose(
  apuracao: "trimestral" | "anual" | string | null | undefined,
  now: Date,
): number | null {
  if (apuracao !== "trimestral" && apuracao !== "anual") return null;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const closeMonth = apuracao === "anual" ? 12 : (Math.floor(month / 3) + 1) * 3;
  const close = Date.UTC(year, closeMonth, 0, 23, 59, 59); // dia 0 do mês seguinte = último dia
  return Math.max(0, Math.ceil((close - now.getTime()) / 86_400_000));
}

// Adaptador: lê os `attributes` do lead (chaves de personas-e-funis.md, seção 9.3) e calcula o score.
// Critérios que o formulário não informa (decisor em contato, reunião aceita, relação prévia)
// vêm de `attributes` com chaves próprias do CRM, documentadas abaixo, e valem 0 quando ausentes.
// TODO(personas-e-funis.md, 5.2): confirmar com a Daniela as chaves do CRM para os critérios
// qualitativos (decisor_em_contato, reuniao_aceita, relacao_previa etc.).
export function scoreLead(
  segment: LeadSegment,
  source: LeadSource,
  attributes: Record<string, unknown>,
  now: Date = new Date(),
): ScoreResult {
  const a = attributes;
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : null);
  const bool = (k: string) => a[k] === true;
  switch (segment) {
    case "PJ": {
      const regime = str("regime_tributario");
      const confirmedBy = str("regime_confirmado_por");
      const usa = str("usa_incentivos");
      return scorePj({
        regimeConfirmedLucroReal:
          regime === "lucro_real" && (confirmedBy === "contador" || confirmedBy === "ecf"),
        irpjBand: str("irpj_faixa") as IrpjBand | null,
        decisionMakerInContact: bool("decisor_em_contato"),
        incentiveHistory:
          usa && usa !== "nenhum" ? "usou" : bool("conhece_incentivos") ? "conhece" : "nenhum",
        daysToPeriodClose: daysToPeriodClose(str("apuracao"), now),
        source,
      });
    }
    case "PF":
      return scorePf({
        fullDeclarationModel: str("modelo_declaracao") === "completa",
        irBand: str("ir_devido_faixa") as IrBand | null,
        accountantIdentified: !!str("contador_declaracao"),
        alreadyDonatesWithIncentive: bool("ja_doa_com_incentivo"),
        month: now.getUTCMonth() + 1,
        source,
      });
    case "CONT": {
      const uf = str("uf");
      const serra = bool("sede_serra_gaucha");
      return scoreCont({
        lucroRealClientsBand: str("clientes_lucro_real_faixa") as LucroRealClientsBand | null,
        partnerInContact: str("cargo") === "socio" || bool("socio_em_contato"),
        alreadyFiledIncentive: bool("ja_lancou_incentivo"),
        location: serra ? "serra" : uf === "RS" ? "rs" : uf ? "outro" : null,
        acceptedMeetingOrWebinar: bool("reuniao_aceita"),
        source,
      });
    }
    case "MUN": {
      const pnab = str("pnab_status");
      const cargo = str("cargo");
      return scoreMun({
        hasCultureDepartmentWithHead: !!str("orgao"),
        pnabActiveOrBalance: pnab === "ciclo_ativo" || pnab === "saldo_a_executar",
        canContractThisYear: bool("dotacao_consultoria"),
        secretaryOrMayorInContact: cargo === "secretario" || cargo === "prefeito_gabinete",
        within60DaysOfDeadline: bool("prazo_60_dias"),
        priorRelationship: bool("relacao_previa"),
      });
    }
    case "PROP": {
      const status = str("status_projeto");
      const mecanismo = str("mecanismo");
      return scoreProp({
        hasValidAuthorization: status === "aprovado_captando" || status === "em_execucao",
        balanceInRangeAndDeadlineOver6Months: bool("saldo_e_prazo_ok"),
        fullDeductionMechanism: mecanismo === "rouanet" || mecanismo === "audiovisual",
        proponentRegular:
          str("prestacao_contas_anterior") === "aprovada" ||
          str("prestacao_contas_anterior") === "nunca_teve",
        regionalAppealAndPartners: bool("apelo_regional"),
        fundraisingFeeBudgeted: bool("rubrica_captacao"),
      });
    }
    case "ALUNO": {
      const exp = str("experiencia");
      return scoreAluno({
        objectiveDeclared: !!str("objetivo"),
        hasProjectOrWorksInCulture: !!exp && exp !== "nenhuma",
        willingToInvest: !!str("faixa_investimento"),
        answeredSurvey: bool("pesquisa_respondida"),
        fromReferralOrOpenClass:
          source === "indicacao_cliente" || source === "indicacao_contador" || bool("aula_aberta"),
      });
    }
  }
}
