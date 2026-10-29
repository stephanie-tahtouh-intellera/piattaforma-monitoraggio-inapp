import { z } from "zod";
import { body, route } from "@/server/http";
import { approveSimulation, rejectSimulation, submitSimulation } from "@/server/commands";

export const runtime = "nodejs";
const B = z.object({ reason: z.string().max(2000).optional(), override: z.boolean().optional() });
export const POST = route(async ({ db, actor, req, params }) => {
  const b = await body(req, B);
  const op: string = "submit";
  if (op === "submit") await submitSimulation(db, actor!, params.id!);
  if (op === "approve") await approveSimulation(db, actor!, params.id!, b.reason ?? "", b.override ?? false);
  if (op === "reject") await rejectSimulation(db, actor!, params.id!, b.reason ?? "");
  return { ok: true };
});
