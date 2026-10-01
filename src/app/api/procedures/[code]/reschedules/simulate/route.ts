import { z } from "zod";
import { body, route } from "@/server/http";
import { createSimulation } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({
  source_milestone: z.string(),
  candidate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cause: z.string().min(1).max(64),
  kind: z.enum(["FASTEST", "MIN_ANNUAL_IMPACT", "MANUAL"]).default("MANUAL"),
  notes: z.string().max(2000).optional(),
});
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  return createSimulation(db, actor!, params.code!, { source: b.source_milestone, candidateDate: b.candidate_date, kind: b.kind, cause: b.cause, notes: b.notes ?? null });
});
