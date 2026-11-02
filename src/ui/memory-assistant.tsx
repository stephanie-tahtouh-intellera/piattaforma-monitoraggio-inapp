"use client";
import { useState } from "react";
import { api } from "./api-client";

/** Assistente alla memoria (DEC-111, incremento 6): propone uno schema di testo, che la Struttura rilegge e completa. Non salva nulla. */
export function MemoryAssistant({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<{ text: string; notice: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function propose() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      setRes(await api<{ text: string; notice: string }>(`/api/procedures/${code}/memory/draft-text`, "POST"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="step-upload" data-tour="memoria-assistente" style={{ margin: "12px 0" }}>
      <h3>Assistente alla memoria</h3>
      <p className="small muted">Propone uno schema di testo per la memoria. Non inserisce importi, date o stati e non salva nulla: il testo va riletto e completato.</p>
      <button type="button" className="btn btn-secondary" onClick={propose} disabled={busy} aria-busy={busy}>
        {busy ? "Preparazione…" : res ? "Proponi di nuovo" : "Proponi il testo della memoria"}
      </button>
      {error ? <div className="alert-box error" role="alert">{error}</div> : null}
      {res ? (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="alert-box info" role="status">{res.notice}</div>
          <label htmlFor={`ma-${code}`} className="label">Testo proposto (modificabile)</label>
          <textarea id={`ma-${code}`} defaultValue={res.text} key={res.text} rows={16} style={{ width: "100%" }} />
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const el = document.getElementById(`ma-${code}`) as HTMLTextAreaElement | null;
                try {
                  await navigator.clipboard.writeText(el?.value ?? res.text);
                  setCopied(true);
                } catch {
                  el?.select();
                }
              }}
            >
              Copia il testo
            </button>
            {copied ? <span className="small" role="status">Copiato negli appunti.</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
