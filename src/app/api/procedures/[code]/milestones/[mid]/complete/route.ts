import { z } from "zod";
import { body, route } from "@/server/http";
import { completeMilestone } from "@/server/commands";

export const runtime = "nodejs";
const money = z.string().regex(/^\d+(\.\d{1,2})?$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const B = z.object({
  date: day,
  note: z.string().max(2000).optional(),
  // Azioni dei passi del Modulo 1 (DEC-107)
  operator: z.string().max(32).optional(),
  lines: z.array(z.object({ year: z.number().int().min(2020).max(2040), amount: money })).max(10).optional(),
  gross: money.optional(),
  start_date: day.optional(),
  end_date: day.optional(),
});
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  completeMilestone(db, actor!, params.code!, params.mid!, b.date, b.note ?? null, {
    operator: b.operator,
    lines: b.lines,
    gross: b.gross,
    startDate: b.start_date,
    endDate: b.end_date,
  });
  return { ok: true };
});
