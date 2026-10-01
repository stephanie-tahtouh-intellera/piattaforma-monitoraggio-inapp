import { z } from "zod";
import { body, route } from "@/server/http";
import { cancelProcedure } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req, params }) => cancelProcedure(db, actor!, params.code!, (await body(req, z.object({ reason: z.string().max(2000) }))).reason));
