import { formatEuro } from "@/contracts/format";

export interface FrameJson {
  base: string;
  vat_pct: string;
  vat: string;
  gross: string;
  anac_fee: string;
  incentives_decision: "YES" | "NO" | "TO_VERIFY";
  incentive_pct: string;
  incentive: string;
  incentives_reduce_available: boolean;
  incentive_over_cap: boolean;
  total: string;
}

/** Quadro economico della procedura: valori già calcolati dal dominio, qui solo presentati. */
export function EconomicFrameCard({ frame }: { frame: FrameJson }) {
  return (
    <section className="card" aria-labelledby="qe-h" data-tour="quadro-economico">
      <h2 id="qe-h">Quadro economico</h2>
      <dl className="kv frame-kv">
        <dt>Base di gara</dt><dd className="num">{formatEuro(frame.base)}</dd>
        <dt>IVA {frame.vat_pct}%</dt><dd className="num">{formatEuro(frame.vat)}</dd>
        <dt>Importo contrattuale (IVA inclusa)</dt><dd className="num">{formatEuro(frame.gross)}</dd>
        <dt>Tassa gara</dt><dd className="num">{formatEuro(frame.anac_fee)}</dd>
        <dt>Incentivi funzioni tecniche</dt>
        <dd className="num">
          {frame.incentives_decision === "YES"
            ? `${frame.incentive_pct}% · ${formatEuro(frame.incentive)}`
            : frame.incentives_decision === "NO" ? "No" : "Da verificare"}
        </dd>
        {frame.incentive_over_cap ? <><dt>Verifica</dt><dd className="alert-box warning">Percentuale oltre il tetto del 2%</dd></> : null}
        <dt>Riduzione configurata</dt><dd>{frame.incentives_reduce_available ? "Sì" : "No (default)"}</dd>
        <dt className="total">Importo a disposizione della struttura</dt><dd className="num total">{formatEuro(frame.total)}</dd>
      </dl>
    </section>
  );
}
