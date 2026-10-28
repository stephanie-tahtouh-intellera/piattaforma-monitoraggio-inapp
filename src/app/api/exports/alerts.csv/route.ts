import { route } from "@/server/http";
import { alertsCsv } from "@/server/exports";

export const runtime = "nodejs";
export const GET = route(async ({ db, actor }) => {
  const { buf, sha } = await alertsCsv(db, actor!);
  return new Response(new Uint8Array(buf), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="alert_INAPP_DEMO.csv"', "x-export-sha256": sha } });
});
