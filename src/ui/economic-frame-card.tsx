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
  incentive_method?: "FLAT_PCT" | "SCALED";
  incentive_total?: string;
  incentive_personnel?: string;
  incentive_fund?: string;
  irap?: string;
  incentives_reduce_available: boolean;
  incentive_over_cap: boolean;
  total: string;
}

/**
 * Righe della tassa gara e degli incentivi: valori già calcolati dal dominio (DEC-147).
 * Con il metodo a scaglioni mostra il dettaglio: incentivo complessivo, quota 80% e IRAP a carico, quota 20% al fondo.
 */
export function FrameCostRows({ frame }: { frame: FrameJson }) {
  const scaled = frame.incentive_method === "SCALED";
  return (
    <>
      <dt>Tassa gara (quota stazione appaltante)</dt>
      <dd className="num">{formatEuro(frame.anac_fee)}{frame.anac_fee === "0.00" ? " · esente" : ""}</dd>
      <dt>Incentivi funzioni tecniche</dt>
      <dd className="num">
        {frame.incentives_decision === "YES"
          ? scaled ? `${formatEuro(frame.incentive_total ?? "0.00")} · ${frame.incentive_pct}% della base` : `${frame.incentive_pct}% · ${formatEuro(frame.incentive)}`
          : frame.incentives_decision === "NO" ? "No" : "Da verificare"}
      </dd>
      {frame.incentives_decision === "YES" && scaled ? (
        <>
          <dt className="sub">di cui 80% a carico dell&apos;importo (art. 45 c. 2)</dt><dd className="num">{formatEuro(frame.incentive_personnel ?? "0.00")}</dd>
          <dt className="sub">IRAP sull&apos;80%</dt><dd className="num">{formatEuro(frame.irap ?? "0.00")}</dd>
          <dt className="sub">di cui 20% al fondo (art. 45 c. 5), non incluso</dt><dd className="num">{formatEuro(frame.incentive_fund ?? "0.00")}</dd>
        </>
      ) : null}
      {frame.incentive_over_cap ? <><dt>Verifica</dt><dd className="alert-box warning">Percentuale oltre il tetto del 2%</dd></> : null}
    </>
  );
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
        <FrameCostRows frame={frame} />
        <dt>Riduzione configurata</dt><dd>{frame.incentives_reduce_available ? "Sì" : "No (default)"}</dd>
        <dt className="total">Importo a disposizione della struttura</dt><dd className="num total">{formatEuro(frame.total)}</dd>
      </dl>
    </section>
  );
}
