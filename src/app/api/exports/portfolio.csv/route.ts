import { route } from "@/server/http";
import { portfolioCsv } from "@/server/exports";

export const runtime = "nodejs";
export const GET = route(async ({ db, actor, req }) => {
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  const f = { q: g("q"), health: g("health"), status: g("status"), structure: g("structure"), type: g("type"), year: g("year"), reschedule: g("reschedule"), alerts: g("alerts"), sort: g("sort"), dir: g("dir") };
  const { buf, sha } = await portfolioCsv(db, actor!, f);
  return new Response(new Uint8Array(buf), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="portafoglio_INAPP_DEMO.csv"', "x-export-sha256": sha } });
});
