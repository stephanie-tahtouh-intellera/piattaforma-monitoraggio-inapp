import { z } from "zod";
import { body, route } from "@/server/http";
import { transitionSal } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ to: z.enum(["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "INVOICED"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(2000).optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  await transitionSal(db, actor!, params.code!, Number(params.seq), b.to, b.date, b.note ?? null);
  return { ok: true };
});
