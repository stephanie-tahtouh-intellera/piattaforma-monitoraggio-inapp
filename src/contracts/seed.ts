import { z } from "zod";

const money = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "importo come stringa a 2 decimali");
const pct = z.string().regex(/^\d{1,3}(\.\d{1,2})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SeedMilestone = z.object({
  actual: date.optional(),
  forecast: date.optional(),
  baseline: date.optional(),
  manualState: z.enum(["SUSPENDED", "NOT_APPLICABLE", "CANCELLED"]).optional(),
  blocker: z.string().optional(),
});

export const SeedSal = z.object({
  seq: z.number().int().positive(),
  pct,
  state: z.enum(["PLANNED", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "INVOICED", "LIQUIDATED", "PARTIALLY_PAID", "PAID", "REJECTED", "SUSPENDED"]),
  dueDate: date.optional(),
  submittedDate: date.optional(),
  invoiceDate: date.optional(),
  accepted: money.optional(),
  liquidated: money.optional(),
  deliverable: z.string().optional(),
});

export const SeedProcedure = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  structure: z.string().min(1),
  type: z.enum(["DIRECT_AWARD", "DIRECT_AWARD_MEPA", "MEPA_ORDER", "CENTRAL_PURCHASING_ORDER", "NEGOTIATED", "OPEN", "FRAMEWORK_AGREEMENT"]),
  awardCriterion: z.enum(["LOWEST_PRICE", "MEAT"]).optional(),
  instrument: z.enum(["MEPA", "OFF_MEPA", "CONSIP_AQ"]).optional(),
  programmed: money,
  cig: z.string().optional(),
  cup: z.string().optional(),
  sourceKey: z.string().optional(),
  operation: z.string().optional(),
  activityStart: date.optional(),
  activityEnd: date.optional(),
  sourceStatus: z.string().optional(),
  iterText: z.string().optional(),
  sourceRow: z.number().int().optional(),
  milestones: z.record(z.string(), SeedMilestone).default({}),
  contract: z
    .object({
      signed: z.boolean(),
      supplier: z.string().optional(),
      net: money,
      vat: money,
      gross: money,
      signedDate: date.optional(),
      startDate: date.optional(),
      endDate: date.optional(),
    })
    .optional(),
  sals: z.array(SeedSal).default([]),
  payments: z.array(z.object({ sal: z.number().int(), amount: money, date, reference: z.string().optional() })).default([]),
  lines: z.array(z.object({ date, amount: money, anchor: z.string(), source: z.string().optional() })).default([]),
  movements: z
    .array(z.object({ type: z.enum(["RESERVATION", "COMMITMENT", "LIQUIDATION", "PAYMENT", "RELEASE", "REVERSAL"]), amount: money, year: z.number().int(), date }))
    .default([]),
  budget: z.array(z.object({ year: z.number().int(), amount: money, source: z.string().optional() })).default([]),
  documents: z.array(z.object({ type: z.string(), subtype: z.string().optional(), file: z.string(), title: z.string().optional() })).default([]),
  events: z.array(z.object({ type: z.enum(["CANCEL", "CLOSE"]), date, reason: z.string() })).default([]),
  extractionProposals: z
    .array(z.object({ document: z.string(), field: z.string(), value: z.string(), page: z.number().int().optional(), excerpt: z.string(), confidence: z.string() }))
    .default([]),
  rescheduleProposal: z.object({ source: z.string(), candidate: date, note: z.string().optional() }).optional(),
});

export type SeedProcedure = z.infer<typeof SeedProcedure>;

export const SeedDataset = z.object({
  dataset: z.string(),
  description: z.string().optional(),
  procedures: z.array(SeedProcedure),
});
export type SeedDataset = z.infer<typeof SeedDataset>;

export const TemplateSchema = z.object({
  code: z.string(),
  label: z.string(),
  illustrative: z.boolean(),
  durationMonths: z.number().int(),
  selection: z.object({
    procedureTypes: z.array(z.string()),
    awardCriterion: z.enum(["LOWEST_PRICE", "MEAT"]).optional(),
    instrument: z.enum(["MEPA", "OFF_MEPA", "CONSIP_AQ"]).optional(),
  }),
  milestones: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      phase: z.string(),
      owner: z.enum(["STRUCTURE", "PROCUREMENT", "FINANCE"]),
      mandatory: z.boolean(),
      blocking: z.boolean(),
      offsetDays: z.number().int(),
      minDurationDays: z.number().int(),
      alertPolicy: z.enum(["MEMORY", "BLOCKING", "STANDARD"]),
      minLeadDays: z.number().int(),
      expectedDocuments: z.array(z.object({ type: z.string(), timing: z.enum(["WITH", "BEFORE"]), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) })),
    }),
  ),
});
