import { logout } from "@/server/auth";
import { clearCookies, route } from "@/server/http";

export const runtime = "nodejs";
export const POST = route(async ({ db, actor }) => {
  if (actor) logout(db, actor);
  const headers = new Headers({ "content-type": "application/json" });
  for (const c of clearCookies()) headers.append("set-cookie", c);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});
