import { z } from "zod";
import { body, route } from "@/server/http";
import { decideValidation } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ outcome: z.enum(["APPROVED", "CORRECTED", "REJECTED"]), value: z.string().max(500).optional(), note: z.string().max(2000).optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  decideValidation(db, actor!, Number(params.id), b.outcome, b.value ?? null, b.note ?? null);
  return { ok: true };
});
