import { z } from "zod";
import { CONTRIBUTION_TYPES, INCENTIVE_MECHANISMS, LOST_REASONS } from "@/lib/domain/enums";
import { calendarDateSchema, moneySchema, positiveMoneySchema, uuidSchema } from "./common";

export const createContributionSchema = z.object({
  projectId: uuidSchema,
  leadId: uuidSchema,
  orgId: uuidSchema.optional(),
  type: z.enum(CONTRIBUTION_TYPES),
  mechanism: z.enum(INCENTIVE_MECHANISMS),
  proposedAmount: positiveMoneySchema,
  expectedCloseAt: calendarDateSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
});
export type CreateContributionInput = z.input<typeof createContributionSchema>;

export const signTermSchema = z.object({
  contributionId: uuidSchema,
  termSignedAt: calendarDateSchema,
  bankDetailsSentAt: calendarDateSchema.optional(),
});
export type SignTermInput = z.input<typeof signTermSchema>;

export const confirmDepositSchema = z.object({
  contributionId: uuidSchema,
  depositedAmount: positiveMoneySchema,
  depositedAt: calendarDateSchema,
});
export type ConfirmDepositInput = z.input<typeof confirmDepositSchema>;

export const issueReceiptSchema = z.object({
  contributionId: uuidSchema,
  receiptNumber: z.string().trim().min(1).max(80),
  receiptIssuedAt: calendarDateSchema,
  receiptSentToAccountantAt: calendarDateSchema.optional(),
});
export type IssueReceiptInput = z.input<typeof issueReceiptSchema>;

export const recordCommissionSchema = z.object({
  contributionId: uuidSchema,
  commissionDue: moneySchema,
  commissionPaidAt: calendarDateSchema.optional(),
});
export type RecordCommissionInput = z.input<typeof recordCommissionSchema>;

export const cancelContributionSchema = z.object({
  contributionId: uuidSchema,
  lostReason: z.enum(LOST_REASONS),
  notes: z.string().trim().max(4000).optional(),
});
export type CancelContributionInput = z.input<typeof cancelContributionSchema>;
