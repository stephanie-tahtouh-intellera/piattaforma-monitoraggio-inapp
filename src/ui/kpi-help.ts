/**
 * Definizione di ogni indicatore della dashboard, mostrata al passaggio del mouse e al focus
 * da tastiera sulla card (07 §6.6: l'etichetta porta sempre la definizione del KPI).
 * Va tenuta allineata con le descrizioni di sezione in `src/ui/tour/content.ts` (HELP.dashboard).
 */
export const KPI_HELP = {
  // Panoramica
  proceduresTotal: "Tutte le procedure visibili al tuo ruolo alla data di riferimento, con la ripartizione per health: rosso, giallo, verde.",
  proceduresLate: "Procedure con almeno un passo obbligatorio scaduto rispetto alla data prevista.",
  toReschedule: "Procedure con una data chiave bloccante scaduta da oltre un giorno: serve una nuova versione approvata da un umano.",
  criticalAlerts: "Alert di severità critica ancora aperti alla data di riferimento: vanno presi in carico.",
  proceduresActive: "Procedure in lavorazione: né in bozza, né chiuse, né annullate.",
  proceduresToStart: "Procedure ancora in bozza, prima che la struttura abbia richiesto la memoria.",
  reprogramRequests: "Versioni approvate oltre la baseline. La baseline è immutabile: ogni versione successiva alla prima è una riprogrammazione decisa da un umano.",
  atRisk: "Somma del fabbisogno oltre la disponibilità di bilancio (non coperto) e della previsione dell'anno in corso sulle procedure da riprogrammare (in slittamento).",

  // Finanza
  programmed: "Totale programmato sulle procedure del perimetro, escluse le annullate. IVA inclusa.",
  base: "Somma degli importi a base di gara del perimetro, IVA esclusa.",
  contracted: "Valore dei contratti stipulati nel perimetro.",
  awardedNet: "Somma degli importi di aggiudicazione, IVA esclusa.",
  paid: "Totale liquidato e pagato; il residuo è la differenza rispetto al contrattualizzato.",
  signedCount: "Procedure che hanno completato il Modulo 1, cioè sono arrivate alla stipula del contratto.",

  // Affidamenti
  awardedCount: "Procedure con la determina di aggiudicazione registrata, su tutte quelle del perimetro.",
  ribasso: "(base di gara − aggiudicato) / base di gara, ponderato sugli importi. Calcolato solo sulle gare competitive: negoziata, aperta, accordo quadro.",
  competitiveShare: "Quota del programmato che passa da una procedura competitiva (negoziata, aperta, accordo quadro) invece che da un affidamento diretto o un ordine.",
  awardDuration: "Giorni medi tra la determina di indizione e quella di aggiudicazione, sulle sole procedure che hanno entrambe le date registrate.",

  // Grafici
  byType: "Quante procedure per ciascuna tipologia di affidamento, su tutto il perimetro. Con un filtro per tipo attivo le altre tipologie restano visibili ma attenuate, per non perdere il quadro d'insieme.",
  annual: "Previsione di spesa per annualità confrontata con la baseline e con la disponibilità di bilancio. Le barre mostrano lo scostamento dalla baseline e il margine sulla disponibilità; sotto, gli stessi dati in tabella.",

  // Avanzamento e attenzione
  byStatus: "Quante procedure si trovano in ciascuna fase del processo, dalla bozza alla chiusura. Le fasi restano in ordine di processo, non per quantità: così si vede dove si accumulano le procedure.",
  alertsByOwner: "Alert ancora aperti divisi per la corsia che deve prenderli in carico. Apri una barra per vedere l'elenco nel centro alert.",
  deadlines: "Quante procedure hanno la prossima scadenza obbligatoria già passata, divise per quanto sono indietro, e quante ce l'hanno davanti. Le procedure senza una scadenza aperta non compaiono.",
  overdue: "Procedure la cui prima scadenza obbligatoria è già passata alla data di riferimento. Non è il numero di alert: una stessa procedura può averne più d'uno.",
  dueSoon: "Procedure con la prossima scadenza obbligatoria entro una settimana. Sono quelle su cui si può ancora intervenire prima che diventino un ritardo.",
  red: "Procedure in stato Rosso: scadenza superata o conflitto finanziario critico. Accanto, quanto valgono sul programmato.",
  anomalies: "Incoerenze trovate nei dati importati (date, importi, campi mancanti). Vengono segnalate e basta: non correggono mai i dati da sole.",
  moneyByPhase: "Come si divide il programmato fra le fasi del processo: quanto è già arrivato alla stipula, quanto è in gara e quanto è ancora a monte. È il programmato delle procedure di ciascuna fase, non il valore dei contratti: quello è più basso, perché tiene conto dei ribassi. Apri una voce per vedere le procedure di quella fase.",
  lateByPhase: "Per ogni fase con almeno una procedura fuori tempo: quante sono, di quanti giorni in media e qual è quella più indietro. Il ritardo si misura sulla prima scadenza obbligatoria non rispettata.",
  attention: "Le procedure rosse e gialle con la scadenza più vicina: le prime cinque del perimetro, ordinate per severità; l’elenco completo è nel portafoglio.",
} satisfies Record<string, string>;
