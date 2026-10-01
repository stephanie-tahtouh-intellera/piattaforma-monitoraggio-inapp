import { z } from "zod";
import { login } from "@/server/auth";
import { body, route, sessionCookies } from "@/server/http";

export const runtime = "nodejs";
const Body = z.object({ login: z.string().min(1).max(64), password: z.string().min(1).max(200) });

export const POST = route(
  async ({ db, req }) => {
    const b = await body(req, Body);
    const s = login(db, b.login, b.password, req.headers.get("x-forwarded-for") ?? "local");
    const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
    for (const c of sessionCookies(s.token, s.csrf)) headers.append("set-cookie", c);
    return new Response(JSON.stringify({ user: { login: s.actor.login, name: s.actor.name, role: s.actor.role } }), { status: 200, headers });
  },
  { auth: false, csrf: false },
);
