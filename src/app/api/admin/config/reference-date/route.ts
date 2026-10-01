import { z } from "zod";
import { body, route } from "@/server/http";
import { adminSetReferenceDate } from "@/server/commands";

export const runtime = "nodejs";
export const PUT = route(async ({ db, actor, req }) => adminSetReferenceDate(db, actor!, (await body(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))).date));
export const POST = PUT;
