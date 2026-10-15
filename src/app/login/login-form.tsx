"use client";
import { useState } from "react";
import { requestTourStart } from "@/ui/tour/state";

const USERS = [
  ["dirigente", "Direttore Generale", "visione d'insieme, firma le determine"],
  ["gare", "Ufficio Gare (RUP)", "gestisce le gare, decide le riprogrammazioni"],
  ["amministrazione", "Amministrazione", "SAL, liquidazioni, pagamenti"],
  ["struttura.si", "Struttura richiedente", "Sistemi informativi"],
  ["fornitore.alfa", "Fornitore", "solo contratti assegnati"],
  ["admin", "Amministratore", "configurazione, reset e passi in demo"],
] as const;

export function LoginForm({ initialLogin, startTour = false }: { initialLogin?: string | undefined; startTour?: boolean }) {
  const known = USERS.some(([l]) => l === initialLogin);
  const [login, setLogin] = useState(known ? initialLogin! : "dirigente");
  const [password, setPassword] = useState(known ? "Demo2026!" : "");
  const [tour, setTour] = useState(startTour);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password }) });
    setBusy(false);
    if (res.ok) {
      if (tour) requestTourStart();
      window.location.href = "/";
    }
    else setError("Credenziali non valide. La password demo è indicata nel README.");
  }

  return (
    <form className="login-form" onSubmit={submit} aria-describedby={error ? "login-error" : undefined}>
      <h2>Accesso demo</h2>
      {error ? (
        <div id="login-error" className="alert-box error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="login">Utente</label>
        <input id="login" type="text" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <span className="help">Password demo: Demo2026! (configurabile)</span>
      </div>
      <label className="check">
        <input type="checkbox" checked={tour} onChange={(e) => setTour(e.target.checked)} /> Avvia la guida demo del ruolo dopo l'accesso
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Accesso in corso…" : "Accedi"}
      </button>
      <div>
        <p className="label" style={{ margin: "0 0 8px" }}>Account dimostrativi (un clic seleziona l'utente)</p>
        <div className="demo-users">
          {USERS.map(([l, role, what]) => (
            <button type="button" key={l} onClick={() => { setLogin(l); setPassword("Demo2026!"); }} aria-label={`Seleziona ${role}`}>
              <strong>{role}</strong>
              <span>{l} · {what}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
