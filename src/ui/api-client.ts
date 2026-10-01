"use client";
import { ERROR_MESSAGE } from "./labels";
import { formatEuro } from "@/contracts/format";

function csrf(): string {
  const m = document.cookie.match(/(?:^|; )inapp_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : "";
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Client delle API con CSRF, Idempotency-Key e messaggi d'errore umani (07 §6.10). */
export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": csrf(), "idempotency-key": crypto.randomUUID() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: { code: string; message: string; details: Record<string, unknown> } }).error;
    let msg = (e && ERROR_MESSAGE[e.code]) ?? e?.message ?? `Errore ${res.status}`;
    if (e?.code === "FINANCIAL_INVARIANT_VIOLATION" && e.details.available) {
      msg = `${e.message} Puoi registrare al massimo ${formatEuro(String(e.details.available))}.`;
    }
    throw new ApiError(e?.code ?? "HTTP_" + res.status, msg, e?.details ?? {});
  }
  return data as T;
}
