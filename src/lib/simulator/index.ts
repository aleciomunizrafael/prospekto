// API pública do simulador (simulador-spec.md, seção 12). Puro: sem Next, sem banco.
export {
  CONTRIBUTION_TYPES,
  DECLARATION_MODELS,
  LIC_RS_SEGMENTS,
  PERIODS,
  PF_INPUT_MODES,
  PF_INTERESTS,
  PF_TAX_BANDS,
  PJ_INPUT_MODES,
  PJ_INTERESTS,
  PJ_REGIMES,
  PJ_TAX_BANDS,
  SIMULATOR_MECHANISM_KEYS,
  TAXPAYER_TYPES,
  YES_NO_UNKNOWN,
  licRsRequested,
  parseSimulatorInput,
  pfSimulatorInputSchema,
  pjSimulatorInputSchema,
  simulatorInputSchema,
  type ParseResult,
  type ValidationIssue,
} from "./input";
export {
  MECHANISM_LABELS,
  PARAMS_STALE_DAYS,
  bandFor,
  bandRange,
  compareScenario,
  operatingSavingsRates,
  simulate,
  simulateLicRs,
  type SimulateOptions,
} from "./simulate";
export { formatBRL, formatPercent, formatRange, parseCurrencyBR, round2 } from "./format";
export {
  SIMULATOR_TEXTS,
  TEXTS_REVIEWED_AT,
  TEXT_KEYS,
  renderText,
  textsFor,
  type SimulatorText,
} from "./texts";
export {
  SIMULATOR_MECHANISMS,
  licRsAnnualLimit,
  loadParams,
  params,
  paramsAgeInDays,
  simulatorParamsSchema,
  type SimulatorParams,
  type TaxBandTable,
} from "./params";
export type * from "./types";
