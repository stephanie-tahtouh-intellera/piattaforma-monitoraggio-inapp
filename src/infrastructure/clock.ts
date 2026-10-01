import { isoDate, type IsoDate } from "@/domain/dates";
import type { Db } from "./db/connection";

/** Clock di business (DEC-002): la data di riferimento non dipende dall'orologio di sistema. */
export interface Clock {
  referenceDate(): IsoDate;
  nowIso(): string;
}

export const DEFAULT_REFERENCE_DATE = "2026-10-01";

export function systemNowIso(): string {
  return new Date(Date.now()).toISOString();
}

export function configuredReferenceDate(db: Db | null): IsoDate {
  if (process.env.APP_REFERENCE_DATE) return isoDate(process.env.APP_REFERENCE_DATE);
  if (db) {
    const row = db.prepare("SELECT value_json FROM config WHERE key = 'demo.reference_date'").get() as { value_json: string } | undefined;
    if (row) return isoDate(JSON.parse(row.value_json) as string);
  }
  return isoDate(DEFAULT_REFERENCE_DATE);
}

export function dbClock(db: Db): Clock {
  return { referenceDate: () => configuredReferenceDate(db), nowIso: systemNowIso };
}

export function fixedClock(date: string, now = "2026-10-01T08:00:00.000Z"): Clock {
  return { referenceDate: () => isoDate(date), nowIso: () => now };
}
