import { z } from "zod";
import { body, route } from "@/server/http";
import { submitMemory } from "@/server/admin-commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(2000).optional() }));
  submitMemory(db, actor!, params.code!, b.date, b.note ?? null);
  return { ok: true };
});
