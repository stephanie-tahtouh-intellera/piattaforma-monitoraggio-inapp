import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DomainError } from "@/application/errors";
import { getDb, type Db } from "@/infrastructure/db/connection";
import { CSRF_COOKIE, SESSION_COOKIE, actorFromSession, csrfFor, safeEqual, type Actor } from "./auth";
import { ensureBootstrapped } from "./runtime";

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export interface Ctx {
  db: Db;
  actor: Actor | null;
  req: Request;
  correlationId: string;
  params: Record<string, string>;
}

export function errorResponse(e: unknown, correlationId: string): Response {
  if (e instanceof DomainError) {
    return Response.json({ error: { code: e.code, message: e.message, details: e.details, correlation_id: correlationId } }, { status: e.status });
  }
  if (e instanceof z.ZodError) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Dati non validi", details: { issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, correlation_id: correlationId } },
      { status: 422 },
    );
  }
  console.error(`[${correlationId}]`, e);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Errore interno", details: {}, correlation_id: correlationId } }, { status: 500 });
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Route handler con autenticazione, CSRF a doppio invio e error envelope (DEC-091, spec §10.2). */
export function route(
  handler: (ctx: Ctx) => Promise<unknown> | unknown,
  opts: { auth?: boolean; csrf?: boolean } = {},
) {
  return async (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    const correlationId = req.headers.get("x-correlation-id") ?? `corr-${randomUUID().slice(0, 8)}`;
    try {
      await ensureBootstrapped();
      const db = await getDb();
      const actor = await actorFromSession(db, cookie(req, SESSION_COOKIE));
      const auth = opts.auth ?? true;
      if (auth && !actor) throw new DomainError("UNAUTHENTICATED", "Accesso richiesto", 401);
      if (actor && UNSAFE.has(req.method) && (opts.csrf ?? true)) {
        const header = req.headers.get("x-csrf-token") ?? "";
        const expected = csrfFor(actor.sessionHash);
        const origin = req.headers.get("origin");
        const allowed = (process.env.APP_ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000").split(",");
        if (!safeEqual(header, expected) || (origin && !allowed.includes(origin))) {
          throw new DomainError("CSRF_REJECTED", "Richiesta non valida (CSRF)", 403);
        }
      }
      const params = (await routeCtx?.params) ?? {};
      const out = await handler({ db, actor, req, correlationId, params });
      if (out instanceof Response) return out;
      return Response.json(out ?? { ok: true }, { headers: { "cache-control": "no-store", "x-correlation-id": correlationId } });
    } catch (e) {
      return errorResponse(e, correlationId);
    }
  };
}

export async function body<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw);
}

export function sessionCookies(token: string, csrf: string): string[] {
  const secure = process.env.COOKIE_SECURE === "1" ? "; Secure" : "";
  return [
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure}`,
    `${CSRF_COOKIE}=${csrf}; Path=/; SameSite=Lax; Max-Age=43200${secure}`,
  ];
}

export function clearCookies(): string[] {
  return [`${SESSION_COOKIE}=; Path=/; Max-Age=0`, `${CSRF_COOKIE}=; Path=/; Max-Age=0`];
}
