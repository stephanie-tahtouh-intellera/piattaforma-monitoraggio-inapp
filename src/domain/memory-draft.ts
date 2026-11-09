/**
 * Schema di testo per la memoria (DEC-111, incremento 6). Funzione pura e deterministica: usa solo dati testuali della bozza
 * (oggetto, struttura, progetto, tipo di procedura) e lascia segnaposto da completare. Non genera mai importi, date, stati
 * o simulazioni (regola del progetto: quei valori vengono solo dal dominio).
 */
export interface MemoryOutlineInput {
  title: string;
  structure: string;
  project: string | null;
  type: string;
  awardCriterion: string | null;
  incentivesDecision: "YES" | "NO" | "TO_VERIFY";
}

const TYPE_TEXT: Record<string, string> = {
  DIRECT_AWARD: "affidamento diretto",
  DIRECT_AWARD_MEPA: "affidamento diretto o trattativa diretta su MePA",
  MEPA_ORDER: "ordine diretto su MePA",
  CENTRAL_PURCHASING_ORDER: "ordinativo su convenzione o accordo di una centrale di committenza",
  NEGOTIATED: "procedura negoziata",
  OPEN: "procedura aperta",
  FRAMEWORK_AGREEMENT: "accordo quadro",
};

const CRITERION_TEXT: Record<string, string> = {
  LOWEST_PRICE: "criterio del minor prezzo",
  MEAT: "criterio dell'offerta economicamente più vantaggiosa",
};

export function buildMemoryOutline(i: MemoryOutlineInput): string {
  const typeText = TYPE_TEXT[i.type] ?? i.type;
  const criterion = i.awardCriterion ? ` (${CRITERION_TEXT[i.awardCriterion] ?? i.awardCriterion})` : "";
  const project = i.project ?? "[da indicare]";
  const incentives = { YES: "Sì", NO: "No", TO_VERIFY: "Da verificare" }[i.incentivesDecision];
  return [
    `OGGETTO: ${i.title}`,
    `Struttura richiedente: ${i.structure}`,
    `Progetto: ${project}`,
    `Procedura prevista: ${typeText}${criterion}`,
    "",
    "1. Premessa e contesto",
    `[Descrivere il contesto in cui nasce il fabbisogno e il collegamento con il progetto «${project}».]`,
    "",
    "2. Fabbisogno e obiettivi",
    "[Indicare il fabbisogno da soddisfare, gli obiettivi e i risultati attesi.]",
    "",
    "3. Descrizione della prestazione",
    "[Descrivere il servizio o la fornitura richiesti, in coerenza con il capitolato allegato.]",
    "",
    "4. Durata della prestazione",
    "[Indicare la durata prevista e le eventuali opzioni.]",
    "",
    "5. Quadro economico",
    `[Richiamare il quadro economico della bozza (base di gara, IVA, tassa gara e incentivi per funzioni tecniche: ${incentives}) senza ripetere gli importi a mano: sono quelli calcolati dal sistema.]`,
    "",
    "6. Motivazione della scelta della procedura",
    `[Motivare il ricorso a ${typeText}${criterion}.]`,
    "",
    "7. Allegati",
    "Capitolato (documento tecnico) e memoria.",
  ].join("\n");
}

export const MEMORY_ASSISTANT_NOTICE =
  "Testo proposto automaticamente: è uno schema da completare, riletto e firmato dalla Struttura. Non contiene importi, date né stati, che restano quelli del sistema.";
