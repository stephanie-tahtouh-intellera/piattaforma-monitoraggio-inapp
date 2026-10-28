"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEuro } from "@/contracts/format";
import { AmountInput } from "./amount-input";
import { api } from "./api-client";
import { DateInput } from "./date-input";

interface Frame {
  base: string; vat_pct: string; vat: string; gross: string; anac_fee: string; has_dec: boolean;
  incentive_pct: string; incentive: string; incentive_personnel: string; incentive_fund: string; total: string;
}

/** "47.600,00" → "47600.00"; solo formattazione del testo, nessun calcolo (i calcoli stanno nel dominio). */
const normalize = (v: string) => v.replace(/\./g, "").replace(",", ".").replace(/\s|€/g, "");
const isAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(normalize(v));

/** Modulo di creazione bozza con quadro economico calcolato dal server prima della memoria (DEC-111). */
export function DraftForm({ types, referenceDate }: { types: { value: string; label: string }[]; referenceDate: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    title: "", type: types[0]?.value ?? "DIRECT_AWARD_MEPA", award: "", base: "", vat: "22,00", anac: "", hasDec: false, incentive: "2,00",
    y2026: "", y2027: "", y2028: "", y2029: "", due: referenceDate,
  });
  const [frame, setFrame] = useState<Frame | null>(null);
  const [frameErr, setFrameErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  // Anteprima: il server calcola IVA, incentivi e totale; qui si mostrano soltanto
  useEffect(() => {
    if (!isAmount(f.base)) {
      setFrame(null);
      setFrameErr(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api<Frame>("/api/procedures/economic-frame", "POST", {
          base: normalize(f.base), vat_pct: f.vat.replace(",", "."), anac_fee: f.anac && isAmount(f.anac) ? normalize(f.anac) : "0", has_dec: f.hasDec, incentive_pct: f.incentive.replace(",", "."),
        });
        setFrame(r);
        setFrameErr(null);
      } catch (e) {
        setFrame(null);
        setFrameErr(e instanceof Error ? e.message : "Errore");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [f.base, f.vat, f.anac, f.hasDec, f.incentive]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect?: string }>("/api/procedures", "POST", {
        title: f.title, type: f.type, ...(f.award ? { award_criterion: f.award } : {}),
        base: normalize(f.base), vat_pct: f.vat.replace(",", "."), anac_fee: f.anac ? normalize(f.anac) : "0", has_dec: f.hasDec, incentive_pct: f.incentive.replace(",", "."),
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
          <div className="field"><label htmlFor="d-anac">Tassa gara (contributo ANAC)</label><AmountInput id="d-anac" value={f.anac} onChange={(v) => set("anac", v)} /><span className="help">Importo a carico della stazione appaltante; 0 se la procedura ne è esente.</span></div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input id="d-dec" type="checkbox" checked={f.hasDec} onChange={(e) => set("hasDec", e.target.checked)} />
            <label htmlFor="d-dec">È previsto un DEC (direttore dell&apos;esecuzione): maturano gli incentivi per funzioni tecniche</label>
          </div>
          {f.hasDec ? (
            <div className="field"><label htmlFor="d-inc">Incentivi % sulla base di gara</label><input id="d-inc" type="text" inputMode="decimal" style={{ textAlign: "right", width: 100 }} value={f.incentive} onChange={(e) => set("incentive", e.target.value)} /><span className="help">Tetto del 2% (D.Lgs. 36/2023, art. 45); da validare.</span></div>
          ) : null}
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

/** Riquadro del quadro economico: i valori arrivano già calcolati dal server (DEC-111). */
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
          <dt>Tassa gara</dt><dd className="num">{formatEuro(frame.anac_fee)}</dd>
          <dt>Incentivi {frame.has_dec ? `${frame.incentive_pct}%` : "(nessun DEC)"}</dt><dd className="num">{formatEuro(frame.incentive)}</dd>
          {frame.has_dec ? (<><dt className="sub">di cui personale</dt><dd className="num sub">{formatEuro(frame.incentive_personnel)}</dd><dt className="sub">di cui fondo innovazione</dt><dd className="num sub">{formatEuro(frame.incentive_fund)}</dd></>) : null}
          <dt className="total">Totale da programmare</dt><dd className="num total">{formatEuro(frame.total)}</dd>
        </dl>
      ) : !frameErr ? (
        <p className="muted">Inserisci la base di gara per vedere il quadro economico completo di IVA, tassa gara e incentivi.</p>
      ) : null}
    </div>
  );
}
