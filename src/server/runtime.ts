import { bootstrap } from "@/application/bootstrap";
import { dbClock } from "@/infrastructure/clock";
import { getDb } from "@/infrastructure/db/connection";

declare global {
  // eslint-disable-next-line no-var -- promessa di bootstrap condivisa nel processo
  var __inappBoot: Promise<unknown> | undefined;
}

/** Migrazioni + seed if-empty al primo accesso (US-001). */
export function ensureBootstrapped(): Promise<unknown> {
  if (!globalThis.__inappBoot) {
    const db = getDb();
    globalThis.__inappBoot = bootstrap(db, dbClock(db));
  }
  return globalThis.__inappBoot;
}

export function clock() {
  return dbClock(getDb());
}
