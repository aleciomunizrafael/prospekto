import { z } from "zod";
import { TAXPAYER_KINDS } from "@/lib/domain/enums";
import { uuidSchema } from "./common";

export const createSimulationSchema = z.object({
  leadId: uuidSchema.optional(),
  kind: z.enum(TAXPAYER_KINDS),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  parametersVersion: z.string().trim().min(1).max(20),
  applyLc224: z.boolean(),
  resultTokenHash: z.string().trim().length(64).optional(),
  ipHash: z.string().trim().max(128).optional(),
});
export type CreateSimulationInput = z.input<typeof createSimulationSchema>;
