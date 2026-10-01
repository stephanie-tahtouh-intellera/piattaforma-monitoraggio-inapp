import { verifySync } from "@node-rs/argon2";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/application/errors";
import type { Role } from "@/domain/model";
import { writeAudit } from "@/infrastructure/audit";
import { systemNowIso } from "@/infrastructure/clock";
import { tx, type Db } from "@/infrastructure/db/connection";

export interface Actor {
  userId: number;
  login: string;
  name: string;
  role: Role;
  structureScope: string;
  supplierCode: string | null;
  impersonatedBy: string | null;
  sessionHash: string;
}

const IDLE_MS = 8 * 3600_000;
const ABS_MS = 12 * 3600_000;
export const SESSION_COOKIE = "inapp_session";
export const CSRF_COOKIE = "inapp_csrf";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const secret = () => process.env.SESSION_SECRET ?? "dev-only-secret-change-me";
const plusMs = (iso: string, ms: number) => new Date(new Date(iso).getTime() + ms).toISOString();

export function csrfFor(sessionHash: string): string {
  return createHmac("sha256", secret()).update(sessionHash).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// hash fittizio per tempi costanti sugli utenti inesistenti
const DUMMY = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$5C0aZz8j3q2vWQ5k6Kq8uY5zqTqgk7lB0fO7h1m3h0Q";

/** Login locale (US-002): la sessione è salvata solo come hash del token (DEC-097). */
export function login(db: Db, loginName: string, password: string, ip = "local"): { token: string; csrf: string; actor: Actor } {
  const u = db.prepare("SELECT * FROM users WHERE login = ?").get(loginName) as
    | { id: number; login: string; password_hash: string; active: number }
    | undefined;
  let ok = false;
  try {
    ok = verifySync(u?.password_hash ?? DUMMY, password);
  } catch {
    ok = false;
  }
  const now = systemNowIso();
  if (!u || !ok || u.active !== 1) {
    tx(db, () => writeAudit(db, { actor: loginName.slice(0, 64), action: "LOGIN_FAILED", entityType: "USER", entityId: loginName.slice(0, 64), reason: `ip ${ip}`, at: now }));
    throw new DomainError("INVALID_CREDENTIALS", "Credenziali non valide", 401);
  }
  return createSession(db, u.id, null, now);
}

export function createSession(db: Db, userId: number, impersonatedBy: number | null, now = systemNowIso()) {
  const token = randomBytes(32).toString("base64url");
  const hash = sha(token);
  tx(db, () => {
    db.prepare(
      "INSERT INTO sessions (id_hash, user_id, impersonated_by, csrf_secret, created_at, last_seen_at, idle_expires_at, absolute_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(hash, userId, impersonatedBy, "hmac", now, now, plusMs(now, IDLE_MS), plusMs(now, ABS_MS));
    const login = (db.prepare("SELECT login FROM users WHERE id = ?").get(userId) as { login: string }).login;
    writeAudit(db, { actor: login, action: impersonatedBy ? "IMPERSONATE_START" : "LOGIN", entityType: "SESSION", entityId: hash.slice(0, 12), at: now });
  });
  const actor = actorFromSession(db, token);
  if (!actor) throw new DomainError("INTERNAL_ERROR", "Sessione non creata", 500);
  return { token, csrf: csrfFor(hash), actor };
}

export function actorFromSession(db: Db, token: string | undefined | null): Actor | null {
  if (!token) return null;
  const hash = sha(token);
  const s = db
    .prepare(
      `SELECT s.*, u.login, u.name, u.role, u.structure_scope, u.supplier_code, u.active, iu.login AS imp_login
       FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN users iu ON iu.id = s.impersonated_by WHERE s.id_hash = ?`,
    )
    .get(hash) as
    | {
        user_id: number;
        login: string;
        name: string;
        role: Role;
        structure_scope: string;
        supplier_code: string | null;
        active: number;
        imp_login: string | null;
        revoked_at: string | null;
        idle_expires_at: string;
        absolute_expires_at: string;
      }
    | undefined;
  const now = systemNowIso();
  if (!s || s.revoked_at || s.active !== 1 || s.idle_expires_at < now || s.absolute_expires_at < now) return null;
  db.prepare("UPDATE sessions SET last_seen_at = ?, idle_expires_at = ? WHERE id_hash = ?").run(now, plusMs(now, IDLE_MS), hash);
  return {
    userId: s.user_id,
    login: s.login,
    name: s.name,
    role: s.role,
    structureScope: s.structure_scope,
    supplierCode: s.supplier_code,
    impersonatedBy: s.imp_login,
    sessionHash: hash,
  };
}

export function logout(db: Db, actor: Actor): void {
  tx(db, () => {
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id_hash = ?").run(systemNowIso(), actor.sessionHash);
    writeAudit(db, { actor: actor.login, impersonatedBy: actor.impersonatedBy, action: "LOGOUT", entityType: "SESSION", entityId: actor.sessionHash.slice(0, 12), at: systemNowIso() });
  });
}
