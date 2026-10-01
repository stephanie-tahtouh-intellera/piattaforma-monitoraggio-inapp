import { z } from "zod";
import { body, route } from "@/server/http";
import { adminReset } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req }) => {
  const b = await body(req, z.object({ confirm: z.string(), dataset: z.enum(["inapp", "scenarios"]).optional() }));
  const r = await adminReset(db, actor!, b.confirm, b.dataset);
  return { ok: true, reports: r.reports, redirect: "/login" };
});
