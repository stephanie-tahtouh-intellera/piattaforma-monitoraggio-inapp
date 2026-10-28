import { DomainError } from "@/application/errors";
import { formatDateIt, formatEuro } from "@/contracts/format";
import { addDays } from "@/domain/dates";
import { configuredReferenceDate } from "@/infrastructure/clock";
import type { Db } from "@/infrastructure/db/connection";
import type { Actor } from "./auth";
import { require as requireAction } from "./authz";
import { dashboard, listProcedures, procedureDetail } from "./queries";

export interface AssistantAnswer {
  intent: string;
  text: string;
  facts: { label: string; value: string; source: string; href?: string }[];
  links: { label: string; href: string }[];
  missing: string[];
  examples?: string[];
}

const EXAMPLES = [
  "Qual è lo stato di OP04-S18?",
  "Quanto è stato pagato su P-004?",
  "Quali documenti mancano per P-007?",
  "Memorie in scadenza nei prossimi 30 giorni",
  "Quali procedure sono da riprogrammare?",
  "Qual è l'importo a rischio?",
  "Ultima riprogrammazione di P-002",
];

/** Esempi coerenti con il dataset caricato (portafoglio reale + casi dimostrativi, DEC-105). */
const EXAMPLES_INAPP = [
  "Qual è lo stato di OP04-S18?",
  "Qual è lo stato di CD-04?",
  "Quali documenti mancano per CD-07?",
  "Memorie in scadenza nei prossimi 30 giorni",
  "Quali procedure sono da riprogrammare?",
  "Qual è l'importo a rischio?",
  "Ultima riprogrammazione di CD-05",
];

export async function examplesFor(db: Db): Promise<string[]> {
  const d = (await db.prepare("SELECT value FROM system_meta WHERE key = 'dataset'").get()) as { value: string } | undefined;
  return d?.value === "inapp" ? EXAMPLES_INAPP : EXAMPLES;
}

const STATUS_IT: Record<string, string> = {
  MEMORY_EXPECTED: "memoria attesa",
  PRELIMINARY_REVIEW: "memoria presentata – istruttoria",
  TENDERING: "indetta – in gara",
  AWARDED: "aggiudicata",
  CONTRACTING: "in stipula",
  EXECUTION: "a contratto stipulato",
  CLOSING: "in chiusura",
  CLOSED: "chiusa",
  CANCELLED: "annullata",
};
const OWNER_IT: Record<string, string> = { STRUCTURE: "Struttura richiedente", PROCUREMENT: "Ufficio Gare", FINANCE: "Amministrazione", SUPPLIER: "Fornitore" };
const HEALTH_IT: Record<string, string> = { GREEN: "verde", AMBER: "ambra", RED: "rosso", NEUTRAL: "neutro" };

/**
 * Assistente deterministico (US-090/091/092, DEC-082): parser a regole, stessi use case
 * della dashboard e stesso RBAC. Non modifica dati e non prende decisioni. Nessun LLM.
 */
export async function ask(db: Db, actor: Actor, question: string): Promise<AssistantAnswer> {
  requireAction(actor, "assistant");
  const q = question.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 500);
  const codeMatch = question.match(/\b(P-\d{3}|OP\d{2}-S\d+|CD-\d{2}|BZ-\d{3})\b/i);
  const ref = await configuredReferenceDate(db);

  if (codeMatch) {
    const code = codeMatch[1]!.toUpperCase();
    let d: Awaited<ReturnType<typeof procedureDetail>>;
    try {
      d = await procedureDetail(db, actor, code);
    } catch (e) {
      if (e instanceof DomainError) return { intent: "PROCEDURE_NOT_ACCESSIBLE", text: `Non posso mostrare la procedura ${code}: ${e.message.toLowerCase()}.`, facts: [], links: [], missing: [] };
      throw e;
    }
    const href = `/procedure/${code}`;
    const ev = d.evaluation;
    if (/pagat|residu|import|liquidat|sal\b|pagament/.test(q)) {
      const facts = [
        { label: "Programmato", value: formatEuro(ev.programmed), source: "Versione corrente del Piano", href },
        { label: "Contrattualizzato", value: ev.contracted ? formatEuro(ev.contracted) : "n.d.", source: "Contratto", href: `${href}?tab=finance` },
        { label: "Pagato", value: formatEuro(ev.paid), source: "Pagamenti registrati", href: `${href}?tab=finance` },
        { label: "Liquidato", value: formatEuro(ev.liquidated), source: "SAL", href: `${href}?tab=finance` },
        { label: "Residuo da pagare", value: formatEuro(ev.residual), source: "Regola: base − pagamenti validi (guida §8.6)", href: `${href}?tab=finance` },
      ];
      const sals = d.sals.map((s) => `SAL ${s.seq} ${s.pct.replace(".", ",")}% = ${formatEuro(s.amount)} (${s.state.toLowerCase()})`);
      return {
        intent: "PROCEDURE_FINANCE",
        text: `${code}: pagato ${formatEuro(ev.paid)}, residuo ${formatEuro(ev.residual)}.${sals.length ? ` Piano SAL: ${sals.join("; ")}.` : " Piano SAL non disponibile."}`,
        facts,
        links: [{ label: "Apri la sezione Finanza", href: `${href}?tab=finance` }],
        missing: d.sals.length ? [] : ["Piano SAL e pagamenti non presenti nella fonte (workbook solo annuale)"],
      };
    }
    if (/document|mancan|fascicol/.test(q)) {
      const miss = (d.alerts as any[]).filter((a) => a.rule === "EXPECTED_DOCUMENT_MISSING" && a.status !== "AUTO_CLOSED").map((a) => a.message as string);
      return {
        intent: "PROCEDURE_DOCUMENTS",
        text: miss.length ? `${code}: ${miss.join("; ")}.` : `${code}: nessun documento atteso risulta mancante (${d.documents.length} documenti nel fascicolo).`,
        facts: (d.documents as any[]).map((x) => ({ label: x.doc_type ?? "Documento", value: x.file_name, source: `associazione ${x.association_method}`, href: `${href}?tab=documents` })),
        links: [{ label: "Apri il fascicolo", href: `${href}?tab=documents` }],
        missing: d.documents.length === 0 ? ["Fascicolo non caricato: la completezza documentale non è verificabile (DEC-103)"] : [],
      };
    }
    if (/riprogramm|simulaz|version/.test(q)) {
      const sims = d.simulations as any[];
      const last = sims[0];
      return {
        intent: "PROCEDURE_RESCHEDULE",
        text: last
          ? `Ultima simulazione ${last.code} (${last.status.toLowerCase()}): ${last.source_milestone} al ${formatDateIt(last.candidate_date)}, ${formatEuro(last.result.amount_shifted)} spostati tra annualità${last.result.criticalities.length ? `, criticità: ${last.result.criticalities.map((c: any) => c.message).join("; ")}` : ", nessuna criticità"}. Versioni: ${d.versions.map((v: any) => v.label).join(" → ")}.`
          : `${code}: nessuna simulazione registrata. Versioni: ${d.versions.map((v: any) => v.label).join(" → ")}.`,
        facts: [],
        links: [{ label: "Apri le simulazioni", href: `${href}?tab=simulations` }],
        missing: [],
      };
    }
    const nd = ev.nextDeadline;
    return {
      intent: "PROCEDURE_STATUS",
      text: `${code} «${d.procedure.title}» è ${STATUS_IT[ev.status] ?? ev.status}, health ${HEALTH_IT[ev.health]}.${d.process.activeStep ? ` Passo in corso: ${d.process.activeStep.label} (tocca a ${OWNER_IT[d.process.activeStep.owner] ?? d.process.activeStep.owner}).` : ""}${nd ? ` Prossima scadenza: ${nd.label} il ${formatDateIt(nd.due)} (${nd.daysUntil >= 0 ? `tra ${nd.daysUntil} giorni` : `scaduta da ${-nd.daysUntil} giorni`}).` : ""}${ev.rescheduleRequired ? " È richiesta una riprogrammazione." : ""}${ev.healthDrivers.length ? ` Motivi: ${ev.healthDrivers.map((x) => x.message).join("; ")}.` : ""}`,
      facts: [
        { label: "Fase", value: STATUS_IT[ev.status] ?? ev.status, source: "Regola: prima milestone obbligatoria non completata (DEC-023)", href: `${href}?tab=timeline` },
        { label: "Health", value: HEALTH_IT[ev.health] ?? ev.health, source: "Regole di health (guida §8.4)", href },
        ...(nd ? [{ label: "Prossima scadenza", value: formatDateIt(nd.due), source: `${nd.label} (versione corrente)`, href: `${href}?tab=timeline` }] : []),
        { label: "Importo a rischio", value: formatEuro(ev.atRisk.total), source: "DEC-051", href },
      ],
      links: [{ label: `Apri ${code}`, href }],
      missing: [],
    };
  }

  // Domande di portafoglio (US-091): stesse aggregazioni della dashboard
  const nDays = Number(/(\d{1,3})\s*giorn/.exec(q)?.[1] ?? "30");
  if (/memori/.test(q)) {
    const until = addDays(ref, nDays);
    const all = (await listProcedures(db, actor, { status: "MEMORY_EXPECTED", sort: "deadline", size: 100 })).items.filter((p) => p.nextDeadline && p.nextDeadline.target === "MEMORY_SUBMISSION" && p.nextDeadline.date <= until);
    const overdue = all.filter((p) => (p.nextDeadline?.days ?? 0) < 0);
    return {
      intent: "PORTFOLIO_MEMORIES_DUE",
      text: `${all.length} memorie attese entro il ${formatDateIt(until)} (${overdue.length} già scadute). Totale programmato: ${formatEuro(sumMoney(all.map((p) => p.programmed)))}.`,
      facts: all.slice(0, 10).map((p) => ({ label: p.code, value: `${formatDateIt(p.nextDeadline!.date)} · ${p.title}`, source: "Cronoprogramma", href: `/procedure/${p.code}` })),
      links: [{ label: "Apri il portafoglio filtrato", href: "/portafoglio?status=MEMORY_EXPECTED&sort=deadline" }],
      missing: [],
    };
  }
  if (/riprogramm/.test(q)) {
    const r = await listProcedures(db, actor, { reschedule: "1", sort: "deadline", size: 100 });
    return {
      intent: "PORTFOLIO_TO_RESCHEDULE",
      text: `${r.total} procedure richiedono una riprogrammazione (milestone bloccante oltre T+1). Importo a rischio complessivo: ${formatEuro(sumMoney(r.items.map((p) => p.atRisk)))}.`,
      facts: r.items.slice(0, 10).map((p) => ({ label: p.code, value: `${p.nextDeadline?.label ?? ""} scaduta il ${formatDateIt(p.nextDeadline?.date)}`, source: "Regola BR-004", href: `/procedure/${p.code}?tab=simulations` })),
      links: [{ label: "Apri il portafoglio filtrato", href: "/portafoglio?reschedule=1" }],
      missing: [],
    };
  }
  if (/rischio|copert|slitt/.test(q)) {
    const k = (await dashboard(db, actor)).kpi;
    return {
      intent: "PORTFOLIO_AT_RISK",
      text: `Importo a rischio: ${formatEuro(k.atRisk.total)} (non coperto ${formatEuro(k.atRisk.uncovered)}, in slittamento ${formatEuro(k.atRisk.slipping)}) su ${formatEuro(k.programmed)} programmati.`,
      facts: [
        { label: "Non coperto", value: formatEuro(k.atRisk.uncovered), source: "Fabbisogno oltre la disponibilità (DEC-051)" },
        { label: "In slittamento", value: formatEuro(k.atRisk.slipping), source: "Previsione dell'anno su procedure da riprogrammare (DEC-051)" },
      ],
      links: [{ label: "Portafoglio per importo a rischio", href: "/portafoglio?sort=risk&dir=desc" }],
      missing: [],
    };
  }
  if (/pagament|liquidat/.test(q)) {
    const r = await listProcedures(db, actor, { status: "EXECUTION,CLOSING", sort: "deadline", size: 100 });
    const due = r.items.filter((p) => p.nextDeadline && p.nextDeadline.days !== null && p.nextDeadline.days <= nDays && /pagamento|SAL/.test(p.nextDeadline.label ?? ""));
    return {
      intent: "PORTFOLIO_PAYMENTS",
      text: `${due.length} SAL o pagamenti in scadenza entro ${nDays} giorni (o scaduti) su ${r.total} contratti in esecuzione.`,
      facts: due.slice(0, 10).map((p) => ({ label: p.code, value: `${p.nextDeadline!.label} · ${formatDateIt(p.nextDeadline!.date)}`, source: "Piano SAL", href: `/procedure/${p.code}?tab=finance` })),
      links: [{ label: "Apri i contratti in esecuzione", href: "/portafoglio?status=EXECUTION,CLOSING&sort=deadline" }],
      missing: r.total && !due.length ? ["Per molte procedure reali il piano SAL non è nella fonte (workbook annuale)"] : [],
    };
  }
  if (/alert|critic|ritard/.test(q)) {
    const k = (await dashboard(db, actor)).kpi;
    return {
      intent: "PORTFOLIO_ALERTS",
      text: `${k.criticalAlerts} alert critici aperti; ${k.proceduresLate} procedure in ritardo su ${k.proceduresTotal}.`,
      facts: [],
      links: [{ label: "Centro alert – critici", href: "/alert?view=critical" }],
      missing: [],
    };
  }
  return {
    intent: "UNSUPPORTED",
    text: "Non ho riconosciuto la domanda. Posso rispondere su stato, scadenze, importi, documenti e riprogrammazioni di una procedura (indicando il codice) e su domande di portafoglio. Non invento risposte.",
    facts: [],
    links: [],
    missing: [],
    examples: await examplesFor(db),
  };
}

function sumMoney(xs: (string | null)[]): string {
  let c = 0n;
  for (const x of xs) {
    if (!x) continue;
    const [u, d = "00"] = x.split(".");
    c += BigInt(u!) * 100n + BigInt(d.padEnd(2, "0"));
  }
  return `${c / 100n}.${(c % 100n).toString().padStart(2, "0")}`;
}

export { EXAMPLES };
