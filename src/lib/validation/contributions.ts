import { z } from "zod";
import { CONTRIBUTION_TYPES, INCENTIVE_MECHANISMS, LOST_REASONS } from "@/lib/domain/enums";
import { calendarDateSchema, moneySchema, positiveMoneySchema, uuidSchema } from "./common";

// Mensagens em português por campo (o formulário mostra cada uma sob o campo).
const notesSchema = z
  .string()
  .trim()
  .max(4000, { error: "As notas podem ter no máximo 4.000 caracteres." })
  .optional();

export const createContributionSchema = z.object({
  projectId: z.uuid({ error: "Escolha o projeto." }),
  leadId: z.uuid({ error: "Busque e escolha o patrocinador na lista." }),
  orgId: uuidSchema.optional(),
  type: z.enum(CONTRIBUTION_TYPES, { error: "Escolha o tipo." }),
  mechanism: z.enum(INCENTIVE_MECHANISMS, { error: "Escolha o mecanismo do aporte." }),
  proposedAmount: positiveMoneySchema,
  expectedCloseAt: calendarDateSchema.optional(),
  notes: notesSchema,
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
  receiptNumber: z
    .string({ error: "Informe o número do recibo." })
    .trim()
    .min(1, { error: "Informe o número do recibo." })
    .max(80, { error: "O número pode ter no máximo 80 caracteres." }),
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
  lostReason: z.enum(LOST_REASONS, { error: "Escolha o motivo." }),
  notes: notesSchema,
});
export type CancelContributionInput = z.input<typeof cancelContributionSchema>;
