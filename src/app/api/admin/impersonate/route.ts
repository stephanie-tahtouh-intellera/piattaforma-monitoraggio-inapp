import { z } from "zod";
import { body, route, sessionCookies } from "@/server/http";
import { impersonate } from "@/server/commands";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor, req }) => {
  const s = await impersonate(db, actor!, (await body(req, z.object({ login: z.string() }))).login);
  const headers = new Headers({ "content-type": "application/json" });
  for (const c of sessionCookies(s.token, s.csrf)) headers.append("set-cookie", c);
  return new Response(JSON.stringify({ ok: true, redirect: "/" }), { status: 200, headers });
});
