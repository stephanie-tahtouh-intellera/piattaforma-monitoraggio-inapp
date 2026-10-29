import { z } from "zod";
import { body, route } from "@/server/http";
import { reversePayment } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, z.object({ reason: z.string().max(2000) }));
  await reversePayment(db, actor!, Number(params.id), b.reason);
  return { ok: true };
});
