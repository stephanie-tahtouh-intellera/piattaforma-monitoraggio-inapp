/** Dizionario delle etichette italiane (DEC-001). */
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  MEMORY_EXPECTED: "Memoria attesa",
  PRELIMINARY_REVIEW: "Memoria presentata – istruttoria",
  TENDERING: "Indetta – in gara",
  AWARDED: "Aggiudicata",
  CONTRACTING: "In stipula",
  EXECUTION: "Contratto stipulato",
  CLOSING: "Chiusura",
  CLOSED: "Chiusa",
  CANCELLED: "Annullata",
};
export const HEALTH_LABEL: Record<string, string> = { GREEN: "Verde", AMBER: "Ambra", RED: "Rosso", NEUTRAL: "Neutro" };
export const SEVERITY_LABEL: Record<string, string> = { LOW: "Bassa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica" };
export const TYPE_LABEL: Record<string, string> = {
  DIRECT_AWARD: "Affidamento diretto",
  DIRECT_AWARD_MEPA: "Trattativa diretta MePA",
  MEPA_ORDER: "Ordine diretto MePA (ODA)",
  CENTRAL_PURCHASING_ORDER: "Ordinativo su convenzione Consip",
  NEGOTIATED: "Procedura negoziata (RdO)",
  OPEN: "Procedura aperta UE",
  FRAMEWORK_AGREEMENT: "Accordo quadro",
};
export const MILESTONE_STATE_LABEL: Record<string, string> = {
  NOT_STARTED: "Non avviata",
  UPCOMING: "Prevista",
  DUE_SOON: "In scadenza",
  DUE_TODAY: "Scade oggi",
  OVERDUE: "Scaduta",
  COMPLETED: "Completata",
  SUSPENDED: "Sospesa",
  NOT_APPLICABLE: "Non applicabile",
  CANCELLED: "Annullata",
};
export const SAL_STATE_LABEL: Record<string, string> = {
  PLANNED: "Pianificato",
  SUBMITTED: "Presentato",
  UNDER_REVIEW: "In verifica",
  ACCEPTED: "Accettato",
  INVOICED: "Fatturato",
  LIQUIDATED: "Liquidato",
  PARTIALLY_PAID: "Pagato parzialmente",
  PAID: "Pagato",
  REJECTED: "Respinto",
  SUSPENDED: "Sospeso",
};
export const ALERT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aperto",
  ACKNOWLEDGED: "Preso in carico",
  SUSPENDED: "Sospeso",
  RESOLVED: "Risolto",
  AUTO_CLOSED: "Chiuso automaticamente",
};
export const SIM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  SUBMITTED: "Inviata",
  APPROVED: "Approvata",
  REJECTED: "Respinta",
  SUPERSEDED: "Superata",
  STALE: "Non aggiornata",
};
export const RULE_LABEL: Record<string, string> = {
  MILESTONE_DEADLINE: "Scadenza milestone",
  SAL_DEADLINE: "Scadenza SAL",
  PAYMENT_DEADLINE: "Scadenza pagamento",
  RESCHEDULE_REQUIRED: "Riprogrammazione richiesta",
  BUDGET_OVERFLOW: "Disponibilità superata",
  EXPECTED_DOCUMENT_MISSING: "Documento atteso mancante",
  DATE_SEQUENCE_INCONSISTENT: "Date incoerenti",
  DATE_IMPOSSIBLE: "Data impossibile",
  SAL_PLAN_NOT_100: "Piano SAL ≠ 100%",
  AMOUNTS_NOT_RECONCILED: "Importi non riconciliati",
  PAYMENT_OVER_CONTRACT: "Pagato oltre contratto",
  COMMITTED_ON_CANCELLED: "Impegni su procedura annullata",
};
export const DOC_TYPE_LABEL: Record<string, string> = {
  MEMORIA: "Memoria",
  DOCUMENTO_TECNICO: "Documento tecnico",
  DOCUMENTI_OPERATORE: "Documenti dell'operatore",
  DETERMINA_INDIZIONE: "Determina di indizione",
  DETERMINA_AGGIUDICAZIONE: "Determina di aggiudicazione",
  GARANZIA_DEFINITIVA: "Garanzia definitiva",
  CONTRATTO: "Contratto",
  ODA: "Ordine diretto (ODA)",
  ADDENDUM: "Addendum",
  DETERMINA_REVOCA: "Determina di revoca",
  VERBALE_SAL: "Verbale di SAL",
};
/** Ultima risorsa per un codice senza etichetta: niente underscore né maiuscole tecniche. */
export const humanize = (code: string | null | undefined) => {
  const s = (code ?? "").replace(/_/g, " ").trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
};
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  SEED: "Caricamento dati demo",
  RESET_DEMO: "Ripristino della demo",
  RUN_CHECKS: "Ricalcolo dei controlli",
  LOGIN: "Accesso",
  LOGIN_FAILED: "Accesso non riuscito",
  LOGOUT: "Uscita",
  IMPORT: "Importazione",
  IMPORT_DOCUMENTS: "Importazione documenti",
  EXPORT: "Esportazione",
  DRAFT_CREATE: "Creazione bozza",
  MEMORY_SUBMIT: "Consegna memoria",
  MILESTONE_COMPLETE: "Passo completato",
  CANCEL: "Annullamento",
  CLOSE: "Chiusura",
  DOCUMENT_UPLOAD: "Caricamento documento",
  DOCUMENT_PROCESSED: "Documento elaborato",
  DOCUMENT_CLASSIFY: "Classificazione documento",
  UPLOAD_REJECTED: "Caricamento rifiutato",
  SIMULATION_CREATE: "Simulazione creata",
  SIMULATION_SUBMIT: "Simulazione inviata",
  SIMULATION_APPROVE: "Simulazione approvata",
  SIMULATION_APPROVE_OVERRIDE: "Simulazione approvata in deroga",
  SIMULATION_REJECT: "Simulazione rifiutata",
  ALERT_ACKNOWLEDGE: "Alert preso in carico",
  ALERT_RESOLVE: "Alert risolto",
  ALERT_SUSPEND: "Escalation sospesa",
  LIQUIDATION: "Liquidazione",
  PAYMENT: "Pagamento",
  PAYMENT_REVERSE: "Storno del pagamento",
  CONFIG_UPDATE: "Configurazione modificata",
  CONFIG_MODULES: "Moduli modificati",
  PERMISSION_CHANGE: "Permessi modificati",
  STEP_AWARD: "Passo: aggiudicazione",
  STEP_SIGN: "Passo: controfirma del contratto",
  STEP_RESERVATIONS: "Passo: prenotazioni di spesa",
  STEP_COMMITMENTS: "Passo: impegni di spesa",
  STEP_OPERATOR: "Passo: operatore individuato",
};
export const ENTITY_LABEL: Record<string, string> = {
  PROCEDURE: "Procedura", SIMULATION: "Simulazione", DATASET: "Dati", DOCUMENT: "Documento", SESSION: "Sessione", USER: "Utente", ALERT: "Alert", STRUCTURE: "Struttura", SYSTEM: "Sistema", CONTRACT: "Contratto", SAL: "SAL", MILESTONE: "Passo",
};
export const SIM_KIND_LABEL: Record<string, string> = { FASTEST: "Più rapida", MIN_ANNUAL_IMPACT: "Minore impatto annuale", MANUAL: "Proposta manuale" };
export const CRITICALITY_LABEL: Record<string, string> = {
  BUDGET_OVERFLOW: "Disponibilità superata",
  COMMITMENT_MISMATCH: "Impegni non allineati",
  FUNDING_END_EXCEEDED: "Oltre la fine del finanziamento",
  MILESTONE_BEYOND_LIMIT: "Passo oltre il limite",
};
export const OUTBOX_LABEL: Record<string, string> = { PENDING: "in coda", SENT: "inviate", FAILED: "non riuscite" };
export const OWNER_LABEL: Record<string, string> = { STRUCTURE: "Struttura", PROCUREMENT: "Ufficio Gare", FINANCE: "Amministrazione", SUPPLIER: "Fornitore" };

/** Fasi e corsie dello schema di processo INAPP (DEC-107). */
export const STAGES: { n: number; title: string; sub: string; module: 1 | 2 }[] = [
  { n: 0, title: "Piano", sub: "Programmazione", module: 1 },
  { n: 1, title: "Fabbisogno", sub: "e memoria", module: 1 },
  { n: 2, title: "Istruttoria", sub: "e indizione", module: 1 },
  { n: 3, title: "Affidamento", sub: "e contratto", module: 1 },
  { n: 4, title: "Esecuzione", sub: "e monitoraggio", module: 2 },
  { n: 5, title: "Chiusura", sub: "e rendicontazione", module: 2 },
];
export const LANES: { owner: string; label: string }[] = [
  { owner: "STRUCTURE", label: "Struttura richiedente" },
  { owner: "PROCUREMENT", label: "Ufficio Gare" },
  { owner: "FINANCE", label: "Amministrazione / Contabilità" },
  { owner: "SUPPLIER", label: "Fornitore" },
];
export const MOVEMENT_LABEL: Record<string, string> = {
  RESERVATION: "Prenotazione",
  COMMITMENT: "Impegno",
  LIQUIDATION: "Liquidazione",
  PAYMENT: "Pagamento",
  RELEASE: "Rilascio",
  REVERSAL: "Storno",
};
export const ERROR_MESSAGE: Record<string, string> = {
  UNAUTHENTICATED: "Sessione scaduta: accedi di nuovo.",
  FORBIDDEN: "Non hai i permessi per questa operazione.",
  CSRF_REJECTED: "Richiesta non valida: ricarica la pagina e riprova.",
  FOUR_EYES_VIOLATION: "Chi ha proposto la riprogrammazione non può approvarla.",
  STALE_SIMULATION: "La procedura è cambiata dopo la simulazione: ricalcolala prima di decidere.",
  BLOCKING_CRITICALITY_REQUIRES_OVERRIDE: "Ci sono criticità bloccanti: serve un override motivato dell'Ufficio Gare.",
};

export function daysText(days: number | null | undefined): string {
  if (days === null || days === undefined) return "";
  if (days === 0) return "oggi";
  if (days > 0) return days === 1 ? "tra 1 giorno" : `tra ${days} giorni`;
  return days === -1 ? "scaduta da 1 giorno" : `scaduta da ${-days} giorni`;
}
