import { z } from "zod";
import { body, route } from "@/server/http";
import { handleAlert } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ note: z.string().max(2000).optional(), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  await handleAlert(db, actor!, Number(params.id), "resolve", b.note ?? null, b.until ?? null);
  return { ok: true };
});
