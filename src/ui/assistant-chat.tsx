"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "./api-client";

interface Answer {
  intent: string;
  text: string;
  facts: { label: string; value: string; source: string; href?: string }[];
  links: { label: string; href: string }[];
  missing: string[];
  examples?: string[];
}

export function AssistantChat({ examples }: { examples: string[] }) {
  const [msgs, setMsgs] = useState<{ q: string; a: Answer | null; err?: string }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setQ("");
    setMsgs((m) => [...m, { q: question, a: null }]);
    try {
      const a = await api<Answer>("/api/assistant/query", "POST", { question });
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, a } : x)));
    } catch (e) {
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, err: e instanceof Error ? e.message : "Errore" } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 280px" }}>
      <section className="card">
        <div className="chat" aria-live="polite">
          {msgs.length === 0 ? <p className="muted">Fai una domanda, ad esempio: «{examples[0]}»</p> : null}
          {msgs.map((m, i) => (
            <div key={i} className="chat">
              <div className="msg user">{m.q}</div>
              <div className="msg bot">
                {m.err ? <span className="field-error">{m.err}</span> : !m.a ? "Sto cercando…" : (
                  <>
                    <div>{m.a.text}</div>
                    {m.a.facts.length ? (
                      <table className="data" style={{ marginTop: 8 }}>
                        <caption className="sr-only">Dati e fonti</caption>
                        <thead><tr><th>Dato</th><th>Valore</th><th>Fonte</th></tr></thead>
                        <tbody>{m.a.facts.map((f, k) => <tr key={k}><td>{f.label}</td><td>{f.value}</td><td className="small">{f.href ? <Link href={f.href}>{f.source}</Link> : f.source}</td></tr>)}</tbody>
                      </table>
                    ) : null}
                    {m.a.missing.length ? <div className="alert-box warning" style={{ marginTop: 8 }}>Informazioni mancanti: {m.a.missing.join("; ")}</div> : null}
                    {m.a.links.length ? <div className="actions" style={{ marginTop: 8 }}>{m.a.links.map((l) => <Link key={l.href} className="btn btn-secondary btn-sm" href={l.href}>{l.label}</Link>)}</div> : null}
                    {m.a.examples ? <ul>{m.a.examples.map((e) => <li key={e}><button className="linkbtn" onClick={() => send(e)}>{e}</button></li>)}</ul> : null}
                    <div className="small muted" style={{ marginTop: 6 }}>Intento: {m.a.intent} · risposta deterministica, nessuna decisione automatica</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <form className="actions" style={{ marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); void send(q); }}>
          <label htmlFor="ask" className="sr-only">Domanda</label>
          <input id="ask" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scrivi una domanda…" style={{ flex: 1 }} maxLength={500} />
          <button className="btn btn-primary" disabled={busy}>Chiedi</button>
        </form>
      </section>
      <aside className="card">
        <h2>Domande d'esempio</h2>
        <ul>{examples.map((e) => <li key={e}><button className="linkbtn" onClick={() => send(e)}>{e}</button></li>)}</ul>
      </aside>
    </div>
  );
}
