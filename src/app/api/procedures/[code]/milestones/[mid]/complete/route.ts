import { z } from "zod";
import { body, route } from "@/server/http";
import { completeMilestone } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(2000).optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  completeMilestone(db, actor!, params.code!, params.mid!, b.date, b.note ?? null);
  return { ok: true };
});
