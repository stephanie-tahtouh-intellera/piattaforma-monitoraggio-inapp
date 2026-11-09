import { z } from "zod";
import { body, route } from "@/server/http";
import { updateEconomicSettings } from "@/server/admin-commands";

export const runtime = "nodejs";
const B = z.object({ incentivesReduceAvailable: z.enum(["true", "false"]).transform((value) => value === "true") });

export const PUT = route(async ({ db, actor, req }) => {
  const b = await body(req, B);
  return updateEconomicSettings(db, actor!, b);
});
