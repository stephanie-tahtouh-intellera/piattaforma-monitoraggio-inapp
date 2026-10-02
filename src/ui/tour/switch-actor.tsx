"use client";
import { useState } from "react";
import { api } from "../api-client";
import { requestTourStart } from "./state";

/** Avvia la guida del ruolo attivo, oppure cambia attore (uscita o impersonazione) e la avvia. */
export function StartTourButton({ label = "Avvia il percorso" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        requestTourStart();
        window.location.href = "/";
      }}
    >
      {label}
    </button>
  );
}

export function SwitchActorButton({ login, label, impersonate }: { login: string; label: string; impersonate: boolean }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={async () => {
          setError(null);
          try {
            if (impersonate) {
              await api("/api/admin/impersonate", "POST", { login });
              requestTourStart();
              window.location.href = "/";
            } else {
              await api("/api/auth/logout", "POST");
              window.location.href = `/login?utente=${encodeURIComponent(login)}&guida=1`;
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Operazione non riuscita");
          }
        }}
      >
        {label}
      </button>
      {error ? <span role="alert" className="small" style={{ color: "var(--feedback-error-fg)" }}>{error}</span> : null}
    </>
  );
}
