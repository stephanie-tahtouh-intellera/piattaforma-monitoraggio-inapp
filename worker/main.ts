/* Worker (DEC-092): scheduler run_checks con leader lease, dispatcher outbox, heartbeat. */
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { bootstrap } from "@/application/bootstrap";
import { runChecks } from "@/application/run-checks";
import { processPendingDocuments } from "@/application/documents";
import { dbClock, systemNowIso } from "@/infrastructure/clock";
import { getDb, tx } from "@/infrastructure/db/connection";

const ID = `worker-${randomUUID().slice(0, 8)}`;
const CHECK_MS = Number(process.env.RUN_CHECKS_INTERVAL_MS ?? 5 * 60_000);
const OUTBOX_MS = 10_000;
const plus = (ms: number) => new Date(Date.now() + ms).toISOString();

const db = getDb();
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
  ignoreTLS: true,
  connectionTimeout: 3000,
});

function heartbeat() {
  db.prepare("INSERT INTO worker_heartbeat (worker_id, beat_at, version) VALUES (?, ?, ?) ON CONFLICT(worker_id) DO UPDATE SET beat_at = excluded.beat_at").run(ID, systemNowIso(), "0.1.0");
}

/** Lease del leader: un solo scheduler attivo anche con più worker. */
function isLeader(): boolean {
  return tx(db, () => {
    const now = systemNowIso();
    const row = db.prepare("SELECT holder, lease_until FROM leader_lease WHERE name = 'scheduler'").get() as { holder: string; lease_until: string } | undefined;
    if (!row || row.lease_until < now || row.holder === ID) {
      db.prepare("INSERT INTO leader_lease (name, holder, lease_until) VALUES ('scheduler', ?, ?) ON CONFLICT(name) DO UPDATE SET holder = excluded.holder, lease_until = excluded.lease_until").run(ID, plus(CHECK_MS * 2));
      return true;
    }
    return false;
  });
}

function scheduledChecks() {
  if (!isLeader()) return;
  const slot = Math.floor(Date.now() / CHECK_MS);
  const ins = db.prepare("INSERT OR IGNORE INTO jobs (type, dedupe_key, run_at, created_at, status, locked_by) VALUES ('RUN_CHECKS', ?, ?, ?, 'RUNNING', ?)").run(`run_checks@${slot}`, systemNowIso(), systemNowIso(), ID);
  if (!ins.changes) return;
  const id = Number(ins.lastInsertRowid);
  try {
    const r = runChecks(db, dbClock(db));
    db.prepare("UPDATE jobs SET status = 'DONE', result_json = ?, finished_at = ? WHERE id = ?").run(JSON.stringify(r), systemNowIso(), id);
    console.log(JSON.stringify({ level: "info", msg: "run_checks", ...r }));
  } catch (e) {
    db.prepare("UPDATE jobs SET status = 'FAILED', last_error = ?, finished_at = ? WHERE id = ?").run(String(e), systemNowIso(), id);
  }
}

/** Invio at-least-once: I/O fuori dalla transazione, Message-ID stabile. */
async function dispatchOutbox() {
  const rows = db.prepare("SELECT * FROM outbox WHERE status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= ?) ORDER BY id LIMIT 20").all(systemNowIso()) as Record<string, any>[];
  for (const m of rows) {
    try {
      await transport.sendMail({ from: "INAPP DEMO <noreply@inapp-demo.invalid>", to: m.recipient, subject: m.subject, text: m.body, messageId: m.message_id });
      db.prepare("UPDATE outbox SET status = 'SENT', sent_at = ?, attempts = attempts + 1 WHERE id = ?").run(systemNowIso(), m.id);
    } catch (e) {
      const attempts = (m.attempts as number) + 1;
      db.prepare("UPDATE outbox SET attempts = ?, last_error = ?, next_attempt_at = ?, status = ? WHERE id = ?").run(attempts, String(e).slice(0, 300), plus(Math.min(attempts * 30_000, 600_000)), attempts >= 20 ? "FAILED" : "PENDING", m.id);
      if (attempts === 1) console.log(JSON.stringify({ level: "warn", msg: "SMTP non raggiungibile: l'outbox resta in coda", error: String(e).slice(0, 120) }));
      break;
    }
  }
}

async function main() {
  await bootstrap(db, dbClock(db));
  console.log(JSON.stringify({ level: "info", msg: "worker avviato", id: ID }));
  heartbeat();
  scheduledChecks();
  setInterval(heartbeat, 30_000);
  setInterval(scheduledChecks, 60_000);
  setInterval(() => void dispatchOutbox(), OUTBOX_MS);
  // Elaborazione documenti (testo + OCR) fuori dalle transazioni, un lotto alla volta
  let docBusy = false;
  const docs = async () => {
    if (docBusy) return;
    docBusy = true;
    try {
      const r = await processPendingDocuments(db, "worker");
      if (r.processed) console.log(JSON.stringify({ level: "info", msg: "documenti elaborati", ...r }));
    } catch (e) {
      console.log(JSON.stringify({ level: "warn", msg: "elaborazione documenti", error: String(e).slice(0, 200) }));
    } finally {
      docBusy = false;
    }
  };
  setInterval(() => void docs(), 30_000);
  void docs();
  void dispatchOutbox();
}

void main();
