import { getDb, missingTriggers } from "@/infrastructure/db/connection";
import { ensureBootstrapped } from "@/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Readiness (US-111): DB, seed e trigger obbligatori presenti (CR-39). */
export async function GET() {
  try {
    await ensureBootstrapped();
    const db = await getDb();
    const missing = await missingTriggers(db);
    const seeded = !!(await db.prepare("SELECT 1 FROM system_meta WHERE key='seeded_at'").get());
    const hb = (await db.prepare("SELECT beat_at FROM worker_heartbeat ORDER BY beat_at DESC LIMIT 1").get()) as { beat_at: string } | undefined;
    const ok = missing.length === 0 && seeded;
    return Response.json({ status: ok ? "ready" : "not_ready", db: "ok", seeded, missingTriggers: missing, worker: hb ? hb.beat_at : "non attivo" }, { status: ok ? 200 : 503 });
  } catch (e) {
    return Response.json({ status: "not_ready", error: e instanceof Error ? e.message : "errore" }, { status: 503 });
  }
}
