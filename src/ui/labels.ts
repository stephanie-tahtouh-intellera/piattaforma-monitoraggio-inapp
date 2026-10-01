/** Dizionario delle etichette italiane (DEC-001). */
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  MEMORY_EXPECTED: "Memoria attesa",
  PRELIMINARY_REVIEW: "Memoria presentata – istruttoria",
  TENDERING: "Indetta – in gara",
  AWARDED: "Aggiudicata",
  CONTRACTING: "In stipula",
  EXECUTION: "Contratto in esecuzione",
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
export const OWNER_LABEL: Record<string, string> = { STRUCTURE: "Struttura", PROCUREMENT: "Ufficio Gare", FINANCE: "Amministrazione", VALIDATOR: "Validatore" };
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
  BLOCKING_CRITICALITY_REQUIRES_OVERRIDE: "Ci sono criticità bloccanti: serve un override motivato del Direttore Generale.",
};

export function daysText(days: number | null | undefined): string {
  if (days === null || days === undefined) return "";
  if (days === 0) return "oggi";
  if (days > 0) return days === 1 ? "tra 1 giorno" : `tra ${days} giorni`;
  return days === -1 ? "scaduta da 1 giorno" : `scaduta da ${-days} giorni`;
}
