import { yearOf, isoDate } from "@/domain/dates";
import { Money } from "@/domain/money";
import { writeAudit } from "@/infrastructure/audit";
import type { Clock } from "@/infrastructure/clock";
import type { Db } from "@/infrastructure/db/connection";
import { DomainError } from "./errors";

/**
 * Annullamento (BR-020): rilascia solo le prenotazioni non coperte da impegno.
 * Gli impegni restano (eventuale anomalia COMMITTED_ON_CANCELLED). Da chiamare dentro tx.
 */
export async function cancelProcedureTx(db: Db, procedureId: number, reason: string, actor: string, date: string, clock: Clock): Promise<Money> {
  const p = (await db.prepare("SELECT code, cancelled_at FROM procedures WHERE id = ?").get(procedureId)) as
    | { code: string; cancelled_at: string | null }
    | undefined;
  if (!p) throw new DomainError("NOT_FOUND", "Procedura non trovata", 404);
  if (p.cancelled_at) throw new DomainError("INVALID_TRANSITION", "Procedura già annullata", 409);
  const sum = async (type: string) =>
    Money.ofCents(
      BigInt(
        ((await db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS s FROM financial_movements WHERE procedure_id = ? AND type = ?").get(procedureId, type)) as {
          s: number;
        }).s,
      ),
    );
  const raw = (await sum("RESERVATION")).sub(await sum("COMMITMENT")).sub(await sum("RELEASE"));
  const release = raw.isNegative() ? Money.ZERO : raw;
  const now = clock.nowIso();
  if (release.gt(Money.ZERO)) {
    await db
      .prepare(
        "INSERT INTO financial_movements (procedure_id, type, amount_cents, year, date, reference, created_by, created_at) VALUES (?, 'RELEASE', ?, ?, ?, 'Rilascio per annullamento', ?, ?)",
      )
      .run(procedureId, release.cents, yearOf(isoDate(date)), date, actor, now);
  }
  await db.prepare("UPDATE procedures SET cancelled_at = ?, cancel_reason = ?, version = version + 1 WHERE id = ?").run(date, reason, procedureId);
  await db
    .prepare("UPDATE alerts SET status = 'AUTO_CLOSED', updated_at = ? WHERE procedure_id = ? AND status IN ('OPEN','ACKNOWLEDGED','SUSPENDED')")
    .run(now, procedureId);
  await writeAudit(db, {
    actor,
    action: "CANCEL",
    entityType: "PROCEDURE",
    entityId: p.code,
    procedureCode: p.code,
    before: { cancelled: false },
    after: { cancelled: true, release: release.toString() },
    reason,
    at: now,
  });
  return release;
}

export async function closeProcedureTx(db: Db, procedureId: number, reason: string, actor: string, date: string, clock: Clock): Promise<void> {
  const p = (await db.prepare("SELECT code, closed_at FROM procedures WHERE id = ?").get(procedureId)) as
    | { code: string; closed_at: string | null }
    | undefined;
  if (!p) throw new DomainError("NOT_FOUND", "Procedura non trovata", 404);
  if (p.closed_at) throw new DomainError("INVALID_TRANSITION", "Procedura già chiusa", 409);
  const now = clock.nowIso();
  await db.prepare("UPDATE procedures SET closed_at = ?, version = version + 1 WHERE id = ?").run(date, procedureId);
  await db
    .prepare("UPDATE alerts SET status = 'AUTO_CLOSED', updated_at = ? WHERE procedure_id = ? AND status IN ('OPEN','ACKNOWLEDGED','SUSPENDED')")
    .run(now, procedureId);
  await writeAudit(db, { actor, action: "CLOSE", entityType: "PROCEDURE", entityId: p.code, procedureCode: p.code, after: { closed: true }, reason, at: now });
}
