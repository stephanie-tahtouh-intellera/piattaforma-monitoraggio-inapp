import { z } from "zod";
import { body, route } from "@/server/http";
import { closeProcedure } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req, params }) => {
  await closeProcedure(db, actor!, params.code!, (await body(req, z.object({ reason: z.string().max(2000) }))).reason);
  return { ok: true };
});
