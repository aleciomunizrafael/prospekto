// pgEnum a partir de src/lib/domain/enums.ts (modelo-de-dados.md, seção 4).
import { pgEnum } from "drizzle-orm/pg-core";
import {
  ACTIVITY_TYPES,
  CONSENT_PURPOSES,
  CONTRIBUTION_STATUSES,
  CONTRIBUTION_TYPES,
  EMAIL_STATUSES,
  INCENTIVE_MECHANISMS,
  LEAD_INTERESTS,
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LEAD_TEMPERATURES,
  LOST_REASONS,
  ORGANIZATION_TYPES,
  REGIME_CONFIRMATIONS,
  TAXPAYER_KINDS,
  TAX_REGIMES,
} from "@/lib/domain/enums";

export const leadSegment = pgEnum("lead_segment", LEAD_SEGMENTS);
export const leadTemperature = pgEnum("lead_temperature", LEAD_TEMPERATURES);
export const leadSource = pgEnum("lead_source", LEAD_SOURCES);
export const leadInterest = pgEnum("lead_interest", LEAD_INTERESTS);
export const lostReason = pgEnum("lost_reason", LOST_REASONS);
export const taxRegime = pgEnum("tax_regime", TAX_REGIMES);
export const regimeConfirmation = pgEnum("regime_confirmation", REGIME_CONFIRMATIONS);
export const incentiveMechanism = pgEnum("incentive_mechanism", INCENTIVE_MECHANISMS);
export const activityType = pgEnum("activity_type", ACTIVITY_TYPES);
export const contributionType = pgEnum("contribution_type", CONTRIBUTION_TYPES);
export const contributionStatus = pgEnum("contribution_status", CONTRIBUTION_STATUSES);
export const consentPurpose = pgEnum("consent_purpose", CONSENT_PURPOSES);
export const organizationType = pgEnum("organization_type", ORGANIZATION_TYPES);
export const taxpayerKind = pgEnum("taxpayer_kind", TAXPAYER_KINDS);
export const emailStatus = pgEnum("email_status", EMAIL_STATUSES);
