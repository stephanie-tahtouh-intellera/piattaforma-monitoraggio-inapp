import { bootstrap } from "@/application/bootstrap";
import { dbClock, type Clock } from "@/infrastructure/clock";
import { getDb } from "@/infrastructure/db/connection";

declare global {
  // eslint-disable-next-line no-var -- promessa di bootstrap condivisa nel processo
  var __inappBoot: Promise<unknown> | undefined;
}

/** Migrazioni + seed if-empty al primo accesso (US-001). */
export function ensureBootstrapped(): Promise<unknown> {
  if (!globalThis.__inappBoot) {
    globalThis.__inappBoot = (async () => {
      const db = await getDb();
      return bootstrap(db, await dbClock(db));
    })();
  }
  return globalThis.__inappBoot;
}

export async function clock(): Promise<Clock> {
  return dbClock(await getDb());
}
