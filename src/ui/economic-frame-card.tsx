import { formatEuro } from "@/contracts/format";

export interface FrameJson {
  base: string; vat_pct: string; vat: string; gross: string; anac_fee: string; has_dec: boolean;
  incentive_pct: string; incentive: string; incentive_personnel: string; incentive_fund: string; total: string;
}

/** Quadro economico della procedura (DEC-111): valori già calcolati dal dominio, qui solo presentati. */
export function EconomicFrameCard({ frame }: { frame: FrameJson }) {
  return (
    <section className="card" aria-labelledby="qe-h" data-tour="quadro-economico">
      <h2 id="qe-h">Quadro economico</h2>
      <dl className="kv frame-kv">
        <dt>Base di gara</dt><dd className="num">{formatEuro(frame.base)}</dd>
        <dt>IVA {frame.vat_pct}%</dt><dd className="num">{formatEuro(frame.vat)}</dd>
        <dt>Importo contrattuale (IVA inclusa)</dt><dd className="num">{formatEuro(frame.gross)}</dd>
        <dt>Tassa gara</dt><dd className="num">{formatEuro(frame.anac_fee)}</dd>
        <dt>Incentivi {frame.has_dec ? `${frame.incentive_pct}%` : "(nessun DEC)"}</dt><dd className="num">{formatEuro(frame.incentive)}</dd>
        {frame.has_dec ? (
          <>
            <dt className="sub">di cui personale</dt><dd className="num sub">{formatEuro(frame.incentive_personnel)}</dd>
            <dt className="sub">di cui fondo innovazione</dt><dd className="num sub">{formatEuro(frame.incentive_fund)}</dd>
          </>
        ) : null}
        <dt className="total">Importo a disposizione della struttura</dt><dd className="num total">{formatEuro(frame.total)}</dd>
      </dl>
    </section>
  );
}
