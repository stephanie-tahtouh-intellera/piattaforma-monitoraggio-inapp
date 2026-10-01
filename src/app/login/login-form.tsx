"use client";
import { useState } from "react";

const USERS = [
  ["dirigente", "Direttore Generale", "approva le riprogrammazioni"],
  ["gare", "Ufficio Gare (RUP)", "simula e gestisce le gare"],
  ["amministrazione", "Amministrazione", "SAL, liquidazioni, pagamenti"],
  ["struttura.si", "Struttura richiedente", "Sistemi informativi"],
  ["validatore", "Validatore", "coda di validazione"],
  ["fornitore.alfa", "Fornitore", "solo contratti assegnati"],
  ["admin", "Amministratore", "configurazione e reset"],
] as const;

export function LoginForm() {
  const [login, setLogin] = useState("dirigente");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password }) });
    setBusy(false);
    if (res.ok) window.location.href = "/";
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
        <span className="help">Password demo: Demo2026! (configurabile con DEMO_PASSWORD)</span>
      </div>
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
