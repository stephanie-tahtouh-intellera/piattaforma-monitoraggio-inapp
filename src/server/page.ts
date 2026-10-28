import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type Db } from "@/infrastructure/db/connection";
import { SESSION_COOKIE, actorFromSession, type Actor } from "./auth";
import { ensureBootstrapped } from "./runtime";

/** Attore della pagina (Server Component): stessa autorizzazione delle API (DEC-091). */
export async function pageActor(): Promise<Actor> {
  await ensureBootstrapped();
  const jar = await cookies();
  const actor = await actorFromSession(await getDb(), jar.get(SESSION_COOKIE)?.value);
  if (!actor) redirect("/login");
  return actor;
}

export function db(): Promise<Db> {
  return getDb();
}

export function sp(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
