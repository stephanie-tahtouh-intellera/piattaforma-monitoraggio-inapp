"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEuro } from "@/contracts/format";
import { AmountInput } from "./amount-input";
import { FrameCostRows, type FrameJson } from "./economic-frame-card";
import { api } from "./api-client";
import { DateInput } from "./date-input";

type Frame = FrameJson;

/** "47.600,00" → "47600.00"; solo formattazione del testo, nessun calcolo (i calcoli stanno nel dominio). */
const normalize = (v: string) => v.replace(/\./g, "").replace(",", ".").replace(/\s|€/g, "");
const isAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(normalize(v));

/** Modulo di creazione bozza con quadro economico calcolato dal server prima della memoria. */
export function DraftForm({ types, referenceDate, projects = [] }: { types: { value: string; label: string }[]; referenceDate: string; projects?: { code: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    title: "", project: "", type: types[0]?.value ?? "DIRECT_AWARD_MEPA", award: "", base: "", vat: "22,00", incentivesDecision: "TO_VERIFY" as "YES" | "NO" | "TO_VERIFY",
    y2026: "", y2027: "", y2028: "", y2029: "", due: referenceDate,
  });
  const [frame, setFrame] = useState<Frame | null>(null);
  const [frameErr, setFrameErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Anteprima: il server calcola IVA, incentivi e totale; qui si mostrano soltanto
  useEffect(() => {
    if (!isAmount(f.base)) {
      setFrame(null);
      setFrameErr(null);
      return;
    }
    // La risposta vale solo se i dati non sono cambiati nel frattempo (DEC-139): il
    // ritardo di rete non e' uguale per tutte le chiamate, e senza questa guardia la
    // risposta di un valore intermedio («70») poteva arrivare dopo quella del valore
    // finale («70.000,00») e restare a schermo.
    let superata = false;
    const t = setTimeout(async () => {
      try {
        const r = await api<Frame>("/api/procedures/economic-frame", "POST", {
          base: normalize(f.base),
          vat_pct: f.vat.replace(",", "."),
          incentives_decision: f.incentivesDecision,
        });
        if (superata) return;
        setFrame(r);
        setFrameErr(null);
      } catch (e) {
        if (superata) return;
        setFrame(null);
        setFrameErr(e instanceof Error ? e.message : "Errore");
      }
    }, 250);
    return () => {
      superata = true;
      clearTimeout(t);
    };
  }, [f.base, f.vat, f.incentivesDecision]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect?: string }>("/api/procedures", "POST", {
        title: f.title, type: f.type, ...(f.project ? { project: f.project } : {}), ...(f.award ? { award_criterion: f.award } : {}),
        base: normalize(f.base),
        vat_pct: f.vat.replace(",", "."),
        incentives_decision: f.incentivesDecision,
        ...Object.fromEntries((["y2026", "y2027", "y2028", "y2029"] as const).filter((k) => f[k]).map((k) => [k, normalize(f[k])])),
        memory_due: f.due,
      });
      router.push(res.redirect ?? "/portafoglio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="draft-form">
      {error ? <div className="alert-box error" role="alert">{error}</div> : null}
      <div className="draft-grid">
        <div className="stack">
          <h2>Procedura</h2>
          <div className="field"><label htmlFor="d-title">Oggetto (obbligatorio)</label><input id="d-title" type="text" required minLength={5} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
          {projects.length ? (
            <div className="field">
              <label htmlFor="d-project">Progetto (obbligatorio)</label>
              <select id="d-project" required value={f.project} onChange={(e) => set("project", e.target.value)}>
                <option value="">Scegli il progetto…</option>
                {projects.map((x) => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
              </select>
              <span className="help">Ogni gara è collegata a un progetto (Operazione / Attività).</span>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="d-type">Tipologia prevista</label>
            <select id="d-type" value={f.type} onChange={(e) => set("type", e.target.value)}>{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="d-award">Criterio di aggiudicazione (per le negoziate)</label>
            <select id="d-award" value={f.award} onChange={(e) => set("award", e.target.value)}>
              <option value="">Non applicabile</option>
              <option value="LOWEST_PRICE">Minor prezzo</option>
              <option value="MEAT">Offerta economicamente più vantaggiosa</option>
            </select>
          </div>
          <div className="field"><label htmlFor="d-due">Data obiettivo della memoria (obbligatorio)</label><DateInput id="d-due" value={f.due} onChange={(v) => set("due", v)} min={referenceDate} required /></div>
          <h2>Quadro economico</h2>
          <div className="field"><label htmlFor="d-base">Base di gara, IVA esclusa (obbligatorio)</label><AmountInput id="d-base" required value={f.base} onChange={(v) => set("base", v)} /></div>
          <div className="field"><label htmlFor="d-vat">Aliquota IVA %</label><input id="d-vat" type="text" inputMode="decimal" style={{ textAlign: "right", width: 100 }} value={f.vat} onChange={(e) => set("vat", e.target.value)} /><span className="help">22% come nel workbook INAPP (da validare).</span></div>
          <p className="help">La tassa gara (contributo ANAC, quota a carico della stazione appaltante) è calcolata dalla tabella per fasce sulla base di gara: esente sotto 40.000 €.</p>
          <div className="field">
            <label htmlFor="d-incentives">Incentivi funzioni tecniche</label>
            <select id="d-incentives" value={f.incentivesDecision} onChange={(e) => set("incentivesDecision", e.target.value)}>
              <option value="YES">Sì</option>
              <option value="NO">No</option>
              <option value="TO_VERIFY">Da verificare</option>
            </select>
            <span className="help">Scelta della Struttura richiedente. Con «Sì» l'incentivo è calcolato a scaglioni sulla base di gara IVA esclusa (2% fino alla soglia comunitaria, poi 1,5%, 1,2% e 1,0%); il criterio va validato con INAPP.</span>
          </div>
          <div className="frame-card narrow-only" aria-label="Quadro economico calcolato"><FramePreview frame={frame} frameErr={frameErr} /></div>
          <h2>Riparto per annualità</h2>
          {(["y2026", "y2027", "y2028", "y2029"] as const).map((k) => (
            <div className="field" key={k}><label htmlFor={`d-${k}`}>Riparto {k.slice(1)}</label><AmountInput id={`d-${k}`} value={f[k]} onChange={(v) => set(k, v)} /></div>
          ))}
          <p className="help">La somma del riparto deve coincidere con l&apos;importo a disposizione della struttura.</p>
          {frame ? (
            <div className="actions" role="group" aria-label="Assegna tutto il totale a un anno">
              <span className="small muted">Assegna tutto il totale a:</span>
              {(["y2026", "y2027", "y2028", "y2029"] as const).map((k) => (
                <button key={k} type="button" className="btn btn-secondary btn-sm" onClick={() => setF((x) => ({ ...x, y2026: "", y2027: "", y2028: "", y2029: "", [k]: formatEuro(frame.total).replace(/s*€/, "") }))}>{k.slice(1)}</button>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="frame-card wide-only" aria-label="Quadro economico calcolato"><FramePreview frame={frame} frameErr={frameErr} /></aside>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" type="submit" disabled={busy || !frame} aria-busy={busy}>{busy ? "Salvataggio in corso…" : "Crea bozza"}</button>
      </div>
    </form>
  );
}

/** Riquadro del quadro economico: i valori arrivano già calcolati dal server. */
function FramePreview({ frame, frameErr }: { frame: Frame | null; frameErr: string | null }) {
  return (
    <div aria-live="polite">
      <h2>Importo a disposizione della struttura</h2>
      {frameErr ? <div className="alert-box error">{frameErr}</div> : null}
      {frame ? (
        <dl className="kv frame-kv">
          <dt>Base di gara</dt><dd className="num">{formatEuro(frame.base)}</dd>
          <dt>IVA {frame.vat_pct}%</dt><dd className="num">{formatEuro(frame.vat)}</dd>
          <dt>Importo contrattuale (IVA inclusa)</dt><dd className="num">{formatEuro(frame.gross)}</dd>
          <FrameCostRows frame={frame} />
          <dt>Riduzione configurata</dt><dd>{frame.incentives_reduce_available ? "Sì" : "No (default)"}</dd>
          <dt className="total">Importo a disposizione della struttura</dt><dd className="num total">{formatEuro(frame.total)}</dd>
        </dl>
      ) : !frameErr ? (
        <p className="muted">Inserisci la base di gara per vedere il quadro economico completo di IVA, tassa gara e incentivi.</p>
      ) : null}
    </div>
  );
}
