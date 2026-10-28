import type { Role } from "@/domain/model";

/**
 * Contenuti della guida demo (DEC-106, DEC-107): il percorso principale segue una procedura
 * lungo lo schema di processo INAPP (Modulo 1, dal piano alla stipula) cambiando attore a ogni
 * passaggio di corsia; i percorsi per attore mostrano le attività di ciascun ruolo sui casi CD-xx.
 * Solo testo statico. I codici citati sono quelli del dataset "inapp" (DEC-105).
 */

export interface TourStep {
  /** Pagina del passo: percorso più eventuali parametri (es. "/procedure/CD-02?tab=iter"). */
  path: string;
  /** Selettore CSS dell'elemento da evidenziare (facoltativo). */
  target?: string;
  /** Percorso per fasi: ruolo che svolge il passo e fase dello schema. */
  role?: Role;
  stage?: number;
  title: string;
  body: string;
  /** Cosa può fare l'attore in questa pagina. */
  can?: string[];
  /** Azione suggerita da provare subito. */
  tryIt?: string;
}

export interface Tour {
  id: string;
  role?: Role;
  login?: string;
  title: string;
  persona: string;
  goal: string;
  cases: string[];
  steps: TourStep[];
  next?: string;
}

export const PROCESS_TOUR = "PROCESSO";

/** Utente demo di ciascun ruolo (per il cambio di attore del percorso per fasi). */
export const LOGIN_OF: Record<Role, string> = {
  STRUCTURE_USER: "struttura.si",
  PROCUREMENT_OFFICER: "gare",
  FINANCE_OFFICER: "amministrazione",
  SUPPLIER: "fornitore.alfa",
  EXECUTIVE: "dirigente",
  ADMIN: "admin",
};

/** Corsie dello schema e attori di supporto. */
export const TOUR_ORDER: Role[] = ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER", "EXECUTIVE", "ADMIN"];
export const LANE_ROLES: Role[] = ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER"];

const ITER = "/procedure/BZ-001?tab=iter";
const PASSO = "[data-tour='passo']";

const PROCESS: Tour = {
  id: PROCESS_TOUR,
  title: "Il processo dal piano alla stipula",
  persona: "Tutti gli attori, nell'ordine dello schema",
  goal: "Porta una procedura di esempio (BZ-001) dal piano di programmazione al contratto stipulato, passando da una corsia all'altra come nello schema INAPP.",
  cases: ["BZ-001 – Rinnovo licenze e supporto della piattaforma di business intelligence (85.400,00 €)"],
  steps: [
    {
      path: "/procedure/nuova", target: "main section.card", role: "STRUCTURE_USER", stage: 0,
      title: "0 · Piano: creazione della bozza",
      body: "Si parte dalla bozza: la Struttura inserisce oggetto, tipologia, data obiettivo della memoria e quadro economico (base di gara, IVA, tassa gara, riparto per annualità). La bozza non genera date effettive: la baseline si congela solo alla consegna della memoria.",
      tryIt: "Compila il modulo (es. «Rinnovo licenze e supporto della piattaforma di business intelligence», base di gara 70.000,00 € + IVA 22%, riparto 2026/2027) e crea la bozza. Poi prosegui con la bozza BZ-001 già presente nel piano.",
      can: ["Creare altre bozze con «Nuova procedura in bozza» (in alto a destra, anche da Dashboard e Portafoglio)"],
    },
    {
      path: "/procedure/BZ-001", target: ".phase-bar", role: "STRUCTURE_USER", stage: 0,
      title: "0 · La bozza nel piano di programmazione",
      body: "BZ-001 è nel piano della Struttura Sistemi informativi come bozza: oggetto, importo previsto (85.400,00 € IVA inclusa), riparto 2026/2027 e data obiettivo della memoria. La barra in alto mostra le fasi del Modulo 1; qui siamo alla fase 0.",
    },
    {
      path: "/procedure/BZ-001", target: "[data-tour='memoria']", role: "STRUCTURE_USER", stage: 1,
      title: "1 · Fabbisogno: redazione e consegna della memoria",
      body: "Memoria e documento tecnico sono già nel fascicolo (sezione Documenti). Alla consegna la data diventa effettiva, la baseline si congela e la pratica passa all'Ufficio Gare.",
      tryIt: "Consegna la memoria con data 01/10/2026 e protocollo «INAPP-DEMO 412/2026».",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 1,
      title: "1 · Presa in carico della pratica",
      body: "La sezione Iter mostra lo schema a corsie della procedura: il passo in corso è evidenziato e indica a chi tocca. Ora tocca all'Ufficio Gare, che assegna un funzionario.",
      tryIt: "Registra il passo con nota «Funzionario assegnato: dott.ssa Bianchi».",
    },
    {
      path: ITER, target: PASSO, role: "FINANCE_OFFICER", stage: 1,
      title: "1 · Verifica importi e prenotazioni di spesa",
      body: "L'Amministrazione verifica importo e fonte di finanziamento e registra le prenotazioni per annualità, proposte dal riparto della bozza. Il totale non può superare il programmato.",
      tryIt: "Conferma le prenotazioni 2026 (25.620,00 €) e 2027 (59.780,00 €) con nota «PN GDL – Priorità 1».",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 2,
      title: "2 · Istruttoria preliminare e richiesta documenti",
      body: "Per l'affidamento diretto su MePA l'Ufficio Gare individua l'operatore e gli chiede i documenti per la verifica dei requisiti, prima della determina di indizione. Da questo momento l'operatore vede la pratica.",
      tryIt: "Scegli «Fornitore Demo Alfa S.r.l.» e registra il passo.",
    },
    {
      path: ITER, target: "[data-tour='upload-passo']", role: "SUPPLIER", stage: 2,
      title: "2 · Il fornitore carica i documenti",
      body: "Il fornitore vede solo le pratiche in cui è operatore e solo i passi della propria corsia. Nel passo in corso, nello stesso riquadro, carica i documenti per la verifica dei requisiti (DGUE, DURC, dichiarazioni): PDF o ZIP, controllati per tipo, firma del contenuto e dimensione.",
      tryIt: "Scegli un PDF qualsiasi e premi il pulsante di caricamento: il documento compare nel fascicolo e nell'elenco dei documenti attesi.",
    },
    {
      path: ITER, target: PASSO, role: "SUPPLIER", stage: 2,
      title: "2 · Il fornitore registra l'invio",
      body: "Dopo il caricamento, nello stesso riquadro, il fornitore registra il passo con data e nota: la pratica torna all'Ufficio Gare per la verifica dei requisiti.",
      tryIt: "Registra il passo con nota «DGUE, DURC e dichiarazioni inviati».",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 2,
      title: "2 · Ricezione e verifica dei requisiti (FVOE)",
      body: "L'Ufficio Gare verifica la documentazione dell'operatore.",
      tryIt: "Registra il passo con nota «Verifica FVOE con esito positivo».",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 2,
      title: "2 · Determina di indizione ◆",
      body: "È una data chiave: con la determina si indice la procedura, si acquisisce il CIG, si nomina il RUP e si autorizzano gli impegni. Le date chiave hanno alert e riprogrammazione dedicati.",
      tryIt: "Registra la determina con nota «Det. n. 312 del 01/10/2026».",
    },
    {
      path: ITER, target: PASSO, role: "FINANCE_OFFICER", stage: 2,
      title: "2 · Assunzione degli impegni di spesa",
      body: "L'Amministrazione trasforma le prenotazioni in impegni per annualità. I movimenti finanziari sono in sola aggiunta: si correggono con storni, mai con cancellazioni.",
      tryIt: "Conferma gli impegni proposti (uguali alle prenotazioni).",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 2,
      title: "2 · Acquisizione CIG e predisposizione della procedura",
      body: "L'Ufficio Gare predispone la trattativa diretta o l'ordine su MePA.",
      tryIt: "Registra il passo con nota «TD MePA n. 5512345».",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 3,
      title: "3 · Verifica dei requisiti e proposta di aggiudicazione",
      body: "Inizia la fase di affidamento: istruttoria sull'offerta ricevuta e proposta di aggiudicazione.",
      tryIt: "Registra il passo.",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 3,
      title: "3 · Determina di aggiudicazione ◆",
      body: "Data chiave: operatore, importo e durata. L'importo aggiudicato genera il contratto da stipulare (netto e IVA sono calcolati dal sistema).",
      tryIt: "Indica 84.180,00 € (offerta con ribasso), inizio attività 15/10/2026, fine 14/10/2027.",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 3,
      title: "3 · Predisposizione e stipula del contratto",
      body: "L'Ufficio Gare predispone l'ordine o il contratto (es. ODA MePA) da inviare all'operatore.",
      tryIt: "Registra il passo.",
    },
    {
      path: ITER, target: PASSO, role: "PROCUREMENT_OFFICER", stage: 3,
      title: "3 · Acquisizione della garanzia definitiva",
      body: "Se prevista, la garanzia definitiva è acquisita sul portale gare prima della stipula.",
      tryIt: "Registra il passo con nota «Polizza fideiussoria n. 778/2026».",
    },
    {
      path: ITER, target: PASSO, role: "SUPPLIER", stage: 3,
      title: "3 · Accettazione dell'ordine e controfirma ◆",
      body: "Ultima data chiave del Modulo 1: il fornitore accetta l'ordine e controfirma il contratto. La stipula fissa la data di inizio della previsione di spesa.",
      tryIt: "Premi «Accetto l'ordine e controfirmo il contratto».",
    },
    {
      path: "/procedure/BZ-001", target: ".phase-bar", role: "EXECUTIVE", stage: 3,
      title: "Contratto stipulato: fine del Modulo 1",
      body: "La barra delle fasi è completa. Nella sezione Iter trovi le date chiave da programmate a effettive; nella sezione Audit ogni passo con autore, data e valori. L'esecuzione (Modulo 2) sarà sviluppata in seguito.",
      can: ["Consultare Iter, Finanza (prenotazioni e impegni) e Audit", "Scaricare il report PDF"],
    },
    {
      path: "/procedure/CD-05?tab=simulations", target: "[data-tour='simulazioni']", role: "PROCUREMENT_OFFICER",
      title: "Quando una data chiave salta",
      body: "CD-05 ha la determina di aggiudicazione scaduta il 14/09/2026: l'Amministrazione ha proposto di spostarla al 14/12/2026 (RS-CD05-001). Lo spostamento porta pagamenti oltre la disponibilità 2027 e 2028: solo l'Ufficio Gare può approvarla, con override motivato.",
      tryIt: "Sulla riga RS-CD05-001 spunta l'override e approva con motivazione «Copertura 2028 nella prossima variazione di bilancio».",
    },
  ],
};

const ROLE_TOURS: Tour[] = [
  {
    id: "STRUCTURE_USER", role: "STRUCTURE_USER", login: "struttura.si",
    title: "Struttura richiedente", persona: "Responsabile della Struttura Sistemi informativi",
    goal: "Inserisce il fabbisogno nel piano, redige e consegna memoria e documento tecnico.",
    cases: ["BZ-001 – bozza da consegnare", "CD-01 – memoria in scadenza il 07/10/2026", "CD-02, CD-07 – pratiche in corso presso Ufficio Gare e fornitore"],
    next: "PROCUREMENT_OFFICER",
    steps: [
      { path: "/", target: "section[aria-label='Indicatori principali']", title: "La tua dashboard", body: "Vedi solo le procedure della tua struttura: indicatori e totali sono calcolati sul tuo perimetro. Ogni indicatore apre il portafoglio filtrato.", can: ["Leggere procedure monitorate, alert critici e importo a rischio"] },
      { path: "/portafoglio", target: ".table-wrap", title: "Le pratiche della struttura", body: "Quattro procedure in fasi diverse: BZ-001 (bozza), CD-01 (memoria da consegnare), CD-02 (presa in carico dell'Ufficio Gare), CD-07 (in attesa della controfirma del fornitore). La colonna Owner indica a chi tocca.", can: ["Filtrare, ordinare, esportare", "Creare una nuova procedura in bozza"] },
      { path: "/procedure/nuova", target: "main form", title: "Inserimento nel piano", body: "Fase 0 dello schema: oggetto, tipologia, quadro economico (base di gara, IVA, tassa gara, incentivi se c'è il DEC), riparto per annualità e data obiettivo della memoria. Il riquadro a destra calcola l'importo a disposizione della struttura prima della memoria; il sistema sceglie il modello di procedura e calcola le date dei passi.", tryIt: "Crea «Servizi di hosting del portale», affidamento diretto MePA, base di gara 40.000,00 €, nessun DEC: il totale è 48.800,00 €, da ripartire sul 2027; memoria entro il 30/10/2026." },
      { path: "/procedure/CD-01?tab=iter", target: PASSO, title: "Memoria in scadenza", body: "CD-01 ha la memoria prevista per il 07/10/2026: mancano meno di 10 giorni, la procedura è ambra e hai ricevuto il reminder. Il passo è nella tua corsia.", tryIt: "Registra la consegna della memoria al 01/10/2026: il reminder si chiude e la pratica passa all'Ufficio Gare." },
      { path: "/procedure/CD-01?tab=documents", target: "[data-tour='upload']", title: "Fascicolo documentale", body: "Carica memoria e documento tecnico (PDF, Office o ZIP, controllati per tipo e contenuto). Il testo è estratto, anche con OCR, e i dati riconosciuti vanno in validazione.", can: ["Caricare documenti e archivi ZIP", "Aprire i documenti"] },
      { path: "/procedure/CD-07?tab=iter", target: ".iter-board", title: "Seguire una pratica fino alla stipula", body: "CD-07 è quasi alla fine del Modulo 1: aggiudicata, garanzia acquisita, ora tocca al fornitore controfirmare. La vista a corsie mostra chi ha fatto cosa e quando.", can: ["Consultare l'avanzamento senza poter registrare i passi delle altre corsie"] },
      { path: "/alert?view=mine", target: "nav.tabs", title: "Le tue notifiche", body: "La campanella e la vista «Miei» raccolgono gli alert della tua corsia. Prenderli in carico o risolverli non modifica date o importi.", can: ["Prendere in carico e risolvere alert"] },
      { path: "/assistente", target: "main", title: "Assistente", body: "Risponde sui dati del tuo perimetro citando le fonti, senza IA generativa.", tryIt: "Chiedi «Memorie in scadenza nei prossimi 30 giorni»." },
    ],
  },
  {
    id: "PROCUREMENT_OFFICER", role: "PROCUREMENT_OFFICER", login: "gare",
    title: "Ufficio Gare", persona: "Ufficio Gare (regia della procedura; il RUP è nominato con la determina di indizione)",
    goal: "Prende in carico le pratiche, conduce istruttoria, indizione e affidamento fino alla stipula; decide le riprogrammazioni proposte da altri: le approva, le rifiuta o le approva in deroga (override) se hanno criticità bloccanti.",
    cases: ["CD-02 – presa in carico da fare", "OP01-S5 – procedura reale con memoria scaduta da riprogrammare", "CD-05 – riprogrammazione con sforamento del bilancio da approvare con override", "OP04-S18 – fascicolo reale Stage4EU"],
    next: "FINANCE_OFFICER",
    steps: [
      { path: "/", target: "section[aria-labelledby='att']", title: "Cosa richiede attenzione", body: "Procedure rosse e ambra del Piano PN Giovani, Donne e Lavoro (82 reali) e dei casi dimostrativi, con la prossima scadenza.", can: ["Aprire una procedura dall'elenco"] },
      { path: "/procedure/CD-02?tab=iter", target: PASSO, title: "Presa in carico", body: "La memoria di CD-02 è stata consegnata il 28/09/2026: tocca a te prendere in carico la pratica entro il 02/10/2026.", tryIt: "Registra il passo con nota «Funzionario assegnato: dott. Verdi»." },
      { path: "/portafoglio?health=RED", target: ".table-wrap", title: "Portafoglio filtrato", body: "Qui sono le procedure rosse; per le ambra scegli un altro valore in Health. Il filtro è nell'indirizzo della pagina. La colonna Health spiega il motivo; «Riprogrammazione richiesta» segnala una data chiave scaduta.", can: ["Filtrare, ordinare, esportare"] },
      { path: "/procedure/OP01-S5?tab=iter", target: ".iter-board", title: "Una procedura reale nello schema", body: "OP01-S5 viene dal workbook: le date del Piano (V3 baseline, V4 corrente) sono mappate sulle date chiave; i passi intermedi sono dedotti. La memoria è scaduta e blocca il processo." },
      { path: "/procedure/OP01-S5/riprogrammazione", target: ".stepper", title: "Simulazione di riprogrammazione", body: "Cinque passi: causa, cronoprogramma, finanza per annualità, alternative (più rapida, minimo impatto, manuale), decisione. Salvare non cambia nulla: serve l'approvazione di un'altra persona.", tryIt: "Scegli l'alternativa più rapida, arriva alla decisione e salva." },
      { path: "/procedure/CD-05?tab=simulations", target: "[data-tour='simulazioni']", title: "Decidere con override", body: "L'Amministrazione ha inviato RS-CD05-001 (aggiudicazione al 14/12/2026): sposta spesa sul 2027–2028 oltre la disponibilità. Puoi approvarla solo con override motivato, oppure rifiutarla. Chi propone non può decidere: quattro occhi.", tryIt: "Sulla riga RS-CD05-001 conferma l'override e approva con motivazione «Copertura 2028 nella prossima variazione di bilancio»." },
      { path: "/alert", target: "nav.tabs", title: "Centro alert", body: "Alert dei passi (T-1 mese … T+1) e anomalie di dato. Puoi sospendere l'escalation fino a una data, con motivo.", can: ["Prendere in carico, risolvere, sospendere", "Esportare in CSV"] },
      { path: "/procedure/OP04-S18?tab=documents", target: "main table.data", title: "Il fascicolo reale", body: "I 6 atti di gara forniti sono associati a OP04-S18 per CIG; tre scansioni sono state lette con OCR locale.", can: ["Caricare nuovi atti", "Aprire i PDF originali"] },
      { path: "/procedure/OP04-S18?tab=documents", target: "[data-tour='classifica']", title: "Correggere la classificazione", body: "Se un atto è classificato male, scegli il documento, il nuovo tipo e, se serve, la procedura giusta, e scrivi la motivazione. La correzione è nell'audit e il passo dell'Iter che attende quell'atto si aggiorna.", can: ["Correggere tipo e procedura di un documento"] },
    ],
  },
  {
    id: "FINANCE_OFFICER", role: "FINANCE_OFFICER", login: "amministrazione",
    title: "Amministrazione / Contabilità", persona: "Ragioneria e controllo di gestione",
    goal: "Verifica importi e fonte di finanziamento, registra prenotazioni e impegni per annualità.",
    cases: ["CD-03 – verifica importi e prenotazioni in scadenza oggi", "CD-08 – impegni da assumere dopo la determina di indizione"],
    next: "SUPPLIER",
    steps: [
      { path: "/", target: "section[aria-labelledby='ann']", title: "Fabbisogno e disponibilità", body: "Per ogni anno il fabbisogno previsto è confrontato con la disponibilità di bilancio; l'importo a rischio somma il non coperto e la spesa in slittamento.", can: ["Leggere il dettaglio in tabella sotto il grafico"] },
      { path: "/procedure/CD-03?tab=iter", target: PASSO, title: "Verifica importi e prenotazioni", body: "CD-03 (rilevazione CATI, 244.000,00 €) attende la tua verifica entro oggi. Le prenotazioni sono proposte dal fabbisogno per annualità; il sistema blocca totali superiori al programmato.", tryIt: "Prova a prenotare 300.000,00 € (bloccato), poi registra 244.000,00 € sul 2027." },
      { path: "/procedure/CD-08?tab=iter", target: PASSO, title: "Assunzione degli impegni", body: "Per CD-08 la determina di indizione è del 25/09/2026: ora vanno assunti gli impegni, proposti uguali alle prenotazioni.", tryIt: "Registra gli impegni con nota «Impegno n. 1452/2026»." },
      { path: "/procedure/CD-08?tab=finance", target: "[data-tour='prenotazioni']", title: "Prenotazioni e impegni per annualità", body: "Il riepilogo confronta fabbisogno, prenotato e impegnato; sotto ci sono i movimenti in sola aggiunta.", can: ["Consultare annualità e movimenti"] },
      { path: "/portafoglio?year=2027&sort=risk&dir=desc", target: ".page-head .actions", title: "Esportazioni per il controllo di gestione", body: "Ordina per importo a rischio sul 2027 ed esporta in XLSX. Ogni esportazione è nell'audit.", can: ["Esportare CSV e XLSX della vista filtrata"] },
    ],
  },
  {
    id: "SUPPLIER", role: "SUPPLIER", login: "fornitore.alfa",
    title: "Fornitore", persona: "Fornitore Demo Alfa S.r.l.",
    goal: "Invia i documenti per la verifica dei requisiti, accetta l'ordine e controfirma il contratto.",
    cases: ["CD-04 – documenti per i requisiti da inviare entro il 05/10/2026", "CD-07 – ordine MePA da accettare entro il 06/10/2026"],
    next: "EXECUTIVE",
    steps: [
      { path: "/portafoglio", target: ".table-wrap", title: "Solo le tue pratiche", body: "Vedi le procedure in cui sei operatore individuato o contraente (CD-04 e CD-07). Il controllo è sul server, per ogni pagina e API." },
      { path: "/procedure/CD-04?tab=iter", target: "[data-tour='upload-passo']", title: "Carica i documenti", body: "Nel passo in corso allega DGUE, DURC e dichiarazioni: i file sono controllati per tipo, firma del contenuto e dimensione. Lo stesso caricamento è anche nella scheda Documenti.", can: ["Caricare PDF o ZIP"] },
      { path: "/procedure/CD-04?tab=iter", target: PASSO, title: "Invio per la verifica dei requisiti", body: "Il passo è nella tua corsia: registrandolo, la pratica torna all'Ufficio Gare per la verifica.", tryIt: "Registra l'invio con nota «Documentazione caricata»." },
      { path: "/procedure/CD-07?tab=iter", target: PASSO, title: "Accettazione dell'ordine e controfirma", body: "CD-07 è aggiudicata a te per 48.800,00 €: accettando l'ordine il contratto è stipulato e la procedura chiude il Modulo 1.", tryIt: "Premi «Accetto l'ordine e controfirmo il contratto»." },
      { path: "/procedure/CD-05", title: "Prova: una procedura non tua", body: "CD-05 riguarda un altro operatore: la piattaforma risponde «Accesso non consentito» senza mostrare dati." },
    ],
  },
  {
    id: "EXECUTIVE", role: "EXECUTIVE", login: "dirigente",
    title: "Direttore Generale", persona: "Direttore Generale (attore di supporto: firma le determine, visione d'insieme)",
    goal: "Ha la visione d'insieme sul portafoglio e sull'audit; firma le determine. Le riprogrammazioni le decide l'Ufficio Gare.",
    cases: ["Portafoglio reale PN GDL: 82 procedure"],
    next: "ADMIN",
    steps: [
      { path: "/", target: "section[aria-label='Indicatori principali']", title: "Dashboard direzionale", body: "Procedure monitorate per health, alert critici, programmato, contratti stipulati e importo a rischio, alla data di riferimento in alto.", can: ["Aprire l'elenco corrispondente a ogni indicatore"] },
      { path: "/portafoglio?health=RED", target: ".table-wrap", title: "Le procedure in rosso", body: "Le date chiave scadute rendono rossa la procedura; la colonna «A rischio» mostra la spesa scoperta o in slittamento." },
      { path: "/alert?view=critical", target: "nav.tabs", title: "Alert critici", body: "Le date chiave superate arrivano a te in escalation. Puoi sospendere l'escalation fino a una data.", can: ["Sospendere l'escalation con motivo"] },
      { path: "/audit", target: "form.filters", title: "Tracciabilità", body: "Filtra per azione, per esempio «Simulazione approvata in deroga» o «Passo: aggiudicazione»: ogni decisione ha autore, data, motivazione e valori prima/dopo." },
    ],
  },
  {
    id: "ADMIN", role: "ADMIN", login: "admin",
    title: "Amministratore", persona: "Amministratore della piattaforma",
    goal: "Configura data di riferimento, moduli, soglie, utenti; ripristina la demo.",
    cases: ["Spostare la data di riferimento per far scattare gli alert", "Reset della demo tra un incontro e l'altro"],
    steps: [
      { path: "/admin", target: "[data-tour='refdate']", title: "Data di riferimento", body: "La demo ragiona su una data di business configurabile. Spostandola in avanti scattano reminder, alert ed escalation.", tryIt: "Imposta il 20/10/2026, guarda la dashboard, poi ripristina il 01/10/2026." },
      { path: "/admin", target: "[data-tour='moduli']", title: "Moduli visibili", body: "La demo mostra il Modulo 1 (dalla programmazione alla stipula). Il Modulo 2 (esecuzione, SAL, pagamenti) è sviluppabile in seguito e resta nascosto." },
      { path: "/procedure/CD-02?tab=iter", target: PASSO, title: "Passi in demo", body: "Per far avanzare una pratica senza cambiare utente puoi registrare un passo al posto del suo owner (qui la presa in carico dell'Ufficio Gare). Il passo del Fornitore resta riservato all'operatore della pratica.", can: ["Registrare un passo per conto dell'owner"] },
      { path: "/admin", target: "[data-tour='impersona']", title: "Impersonazione", body: "Agisci come un altro utente senza uscire: la sessione è marcata e ogni azione resta attribuita anche a te." },
      { path: "/admin", target: "[data-tour='reset']", title: "Reset della demo", body: "Ricarica da zero il portafoglio reale con i casi dimostrativi, oppure le 12 procedure di collaudo. Tutte le sessioni vengono chiuse.", can: ["Scegliere il dataset e confermare digitando RESET"] },
      { path: "/admin", target: "[data-tour='import']", title: "Import del workbook", body: "Righe lette, importate e annullate, con le segnalazioni per riga e campo." },
      { path: "/admin", target: "[data-tour='soglie']", title: "Soglie e calendario", body: "Finestra di attenzione, reminder, termini e festività locali; ogni modifica è versionata e ricalcola gli alert." },
      { path: "/admin", target: "[data-tour='utenti']", title: "Utenti e ruoli", body: "Ruolo e ambito (struttura o fornitore) di ogni utente; le modifiche sono nell'audit." },
      { path: "/admin/modelli", target: "main section.card", title: "Modelli di procedura", body: "I modelli del Modulo 1 riportano per ogni passo corsia, fase, durata, date chiave e documenti attesi. Variante A (documenti richiesti all'operatore prima dell'indizione) per affidamenti diretti e adesioni; variante B (inviti, offerte, verifica sull'aggiudicatario) per negoziate, aperte e accordi quadro. Durate dimostrative da validare con INAPP." },
    ],
  },
];

export const TOURS: Record<string, Tour> = Object.fromEntries([PROCESS, ...ROLE_TOURS].map((t) => [t.id, t]));
export const ROLE_TOUR: Record<Role, Tour> = Object.fromEntries(ROLE_TOURS.map((t) => [t.role!, t])) as Record<Role, Tour>;

export interface PageHelp {
  title: string;
  summary: string;
  sections: [string, string][];
  actions: Partial<Record<Role | "ALL", string[]>>;
}

/** Aiuto contestuale per pagina (riconoscimento per percorso e scheda). */
export function pageHelp(pathname: string, tab: string | null): PageHelp | null {
  if (pathname === "/") return HELP.dashboard!;
  if (pathname === "/portafoglio") return HELP.portfolio!;
  if (pathname === "/procedure/nuova") return HELP.draft!;
  if (/^\/procedure\/[^/]+\/riprogrammazione$/.test(pathname)) return HELP.reschedule!;
  if (/^\/procedure\/[^/]+$/.test(pathname)) return HELP[`procedure.${tab ?? "iter"}`] ?? HELP["procedure.iter"]!;
  if (pathname === "/alert") return HELP.alerts!;
  if (pathname === "/assistente") return HELP.assistant!;
  if (pathname === "/audit") return HELP.audit!;
  if (pathname === "/admin") return HELP.admin!;
  if (pathname === "/admin/modelli") return HELP.templates!;
  if (pathname === "/guida") return HELP.guide!;
  return null;
}

const STEP_ACTIONS: Partial<Record<Role, string[]>> = {
  STRUCTURE_USER: ["Registrare i passi della corsia Struttura (memoria)"],
  PROCUREMENT_OFFICER: ["Registrare i passi della corsia Ufficio Gare (presa in carico, istruttoria, determine, stipula)"],
  FINANCE_OFFICER: ["Registrare prenotazioni e impegni per annualità"],
  SUPPLIER: ["Registrare l'invio dei documenti e la controfirma del contratto"],
  ADMIN: ["Registrare un passo per conto dell'owner (solo in demo)"],
};

const HELP: Record<string, PageHelp> = {
  dashboard: {
    title: "Dashboard",
    summary: "Sintesi del portafoglio visibile al tuo ruolo alla data di riferimento.",
    sections: [
      ["Indicatori", "Procedure monitorate (rosso/ambra/verde), in ritardo, da riprogrammare, alert critici, programmato, contrattualizzato, contratti stipulati, importo a rischio."],
      ["Fabbisogno per annualità", "Previsione di spesa confrontata con la disponibilità di bilancio, con tabella equivalente."],
      ["Procedure per fase", "Quante procedure sono in ciascuna fase del processo."],
      ["Richiede attenzione", "Procedure rosse e ambra con la prossima scadenza."],
    ],
    actions: { ALL: ["Aprire il portafoglio filtrato dagli indicatori", "Aprire una procedura dall'elenco"] },
  },
  portfolio: {
    title: "Portafoglio",
    summary: "Elenco delle procedure con filtri, ordinamento ed esportazione.",
    sections: [
      ["Filtri", "Ricerca per codice/oggetto/CIG, health, fase, struttura, tipologia, annualità, alert, riprogrammazione."],
      ["Tabella", "Fase, health con motivazione, prossima scadenza, programmato, importo a rischio, corsia a cui tocca il passo in corso (Owner)."],
    ],
    actions: {
      ALL: ["Filtrare e ordinare (i filtri restano nell'indirizzo)"],
      STRUCTURE_USER: ["Creare una nuova procedura in bozza", "Esportare CSV/XLSX"],
      PROCUREMENT_OFFICER: ["Esportare CSV/XLSX"],
      FINANCE_OFFICER: ["Esportare CSV/XLSX"],
      EXECUTIVE: ["Esportare CSV/XLSX"],
      ADMIN: ["Creare una bozza", "Esportare CSV/XLSX"],
    },
  },
  draft: {
    title: "Nuova procedura in bozza",
    summary: "Fase 0 dello schema: inserimento nel piano di programmazione da parte della Struttura.",
    sections: [["Dati della bozza", "Oggetto, tipologia, criterio, data obiettivo della memoria."], ["Quadro economico", "Base di gara, IVA, tassa gara e, se è previsto il DEC, incentivi per funzioni tecniche: il totale è calcolato dal sistema e va ripartito per annualità."]],
    actions: { STRUCTURE_USER: ["Creare la bozza"], ADMIN: ["Creare la bozza"] },
  },
  "procedure.overview": {
    title: "Scheda procedura · Panoramica",
    summary: "Fase del processo, a chi tocca il passo in corso, health e motivazioni, confronto baseline/previsione/effettivo, previsione di spesa.",
    sections: [
      ["Intestazione", "Codice, fase, health, tipologia, modello, CIG, importi, prossima scadenza e «Tocca a»."],
      ["Barra delle fasi", "0 Piano · 1 Fabbisogno · 2 Istruttoria · 3 Affidamento (Modulo 1)."],
      ["Perché questo stato", "Le regole che determinano l'health."],
      ["Previsione per annualità", "Fabbisogno contro disponibilità, importo a rischio, fonte del workbook e iter."],
    ],
    actions: {
      ALL: ["Navigare le sezioni della scheda"],
      PROCUREMENT_OFFICER: ["Avviare una simulazione di riprogrammazione", "Report PDF"],
      FINANCE_OFFICER: ["Avviare una simulazione di riprogrammazione", "Report PDF"],
      STRUCTURE_USER: ["Consegnare la memoria (se in bozza)", "Report PDF"],
      EXECUTIVE: ["Report PDF"],
    },
  },
  "procedure.iter": {
    title: "Scheda procedura · Iter",
    summary: "Lo schema di processo applicato alla procedura: corsie (chi) per fasi (quando), con il passo in corso evidenziato.",
    sections: [
      ["Corsie", "Struttura richiedente, Ufficio Gare, Amministrazione / Contabilità, Fornitore."],
      ["Riquadri", "Fatto (verde, con data effettiva), in corso (bordo blu, rosso se scaduto), da fare (data prevista). ◆ = data chiave. ✓/○ = documento atteso presente o mancante."],
      ["Date chiave", "Memoria, indizione, aggiudicazione, stipula: baseline, prevista, effettiva."],
      ["Passo in corso", "A chi tocca e, se tocca a te, il modulo per registrarlo."],
    ],
    actions: { ...STEP_ACTIONS, ALL: ["Consultare l'avanzamento di tutte le corsie"] },
  },
  "procedure.timeline": {
    title: "Scheda procedura · Cronoprogramma",
    summary: "Tutti i passi con owner, stato, date baseline/prevista/effettiva e Gantt.",
    sections: [["Tabella e Gantt", "Cerchio = baseline, rombo blu = prevista, verde = effettiva, rosso = scaduta; linea tratteggiata = data di riferimento."]],
    actions: { ALL: ["Consultare; i passi si registrano nella sezione Iter"] },
  },
  "procedure.finance": {
    title: "Scheda procedura · Finanza",
    summary: "Contratto (dopo l'aggiudicazione), prenotazioni e impegni per annualità, previsione di spesa e movimenti.",
    sections: [
      ["Contratto", "Operatore, netto/IVA/lordo, date di stipula, inizio e fine."],
      ["Prenotazioni e impegni", "Fabbisogno, prenotato e impegnato per anno."],
      ["Movimenti", "In sola aggiunta: si correggono con storni."],
    ],
    actions: { FINANCE_OFFICER: ["Prenotazioni e impegni si registrano nella sezione Iter"], ALL: ["Consultare"] },
  },
  "procedure.documents": {
    title: "Scheda procedura · Documenti",
    summary: "Fascicolo con stato di elaborazione (testo, OCR) e affidabilità dell'associazione.",
    sections: [["Fascicolo", "Documenti, pagine, elaborazione, metodo di associazione."], ["Correzione della classificazione", "Cambia il tipo di atto o sposta il documento in un'altra procedura, con motivazione."]],
    actions: {
      STRUCTURE_USER: ["Caricare memoria, documento tecnico e allegati"],
      PROCUREMENT_OFFICER: ["Caricare determine, ordini e verbali", "Correggere la classificazione dei documenti"],
      SUPPLIER: ["Caricare i documenti per la verifica dei requisiti"],
      ADMIN: ["Caricare documenti", "Elaborare i documenti in attesa (OCR)", "Correggere la classificazione dei documenti"],
    },
  },
  "procedure.alerts": {
    title: "Scheda procedura · Alert",
    summary: "Alert dei passi e anomalie di dato della procedura, con destinatari e stato.",
    sections: [["Alert", "Livello, scadenza, messaggio, stato."]],
    actions: {
      STRUCTURE_USER: ["Prendere in carico e risolvere"],
      PROCUREMENT_OFFICER: ["Prendere in carico, risolvere, sospendere l'escalation"],
      FINANCE_OFFICER: ["Prendere in carico e risolvere"],
      EXECUTIVE: ["Sospendere l'escalation"],
    },
  },
  "procedure.simulations": {
    title: "Scheda procedura · Simulazioni",
    summary: "Riprogrammazioni delle date chiave: simulate, inviate, approvate o rifiutate.",
    sections: [["Simulazioni", "Passo e nuova data, date cambiate, importo spostato, criticità, stato e autore."]],
    actions: {
      PROCUREMENT_OFFICER: ["Creare una nuova simulazione", "Inviare in approvazione", "Approvare, rifiutare o approvare con override le riprogrammazioni proposte da altri"],
      FINANCE_OFFICER: ["Creare una nuova simulazione", "Inviare in approvazione"],
      EXECUTIVE: ["Consultare portafoglio, alert e audit"],
    },
  },
  "procedure.audit": {
    title: "Scheda procedura · Audit",
    summary: "Tutti gli eventi della procedura con autore, prima/dopo e motivazione.",
    sections: [],
    actions: { ALL: ["Consultare la storia della procedura"] },
  },
  reschedule: {
    title: "Simulazione di riprogrammazione",
    summary: "Procedura guidata in 5 passi; nessun dato cambia finché un'altra persona non approva.",
    sections: [
      ["1 · Causa", "Passo da spostare, causa e nuova data (non prima della più rapida ammissibile)."],
      ["2 · Cronoprogramma", "Date ricalcolate a valle."],
      ["3 · Finanza", "Spostamento della spesa tra annualità e confronto con la disponibilità."],
      ["4 · Alternative", "Più rapida, minimo impatto annuale, manuale."],
      ["5 · Decisione", "Salvataggio della simulazione da inviare in approvazione."],
    ],
    actions: { PROCUREMENT_OFFICER: ["Simulare e salvare"], FINANCE_OFFICER: ["Simulare e salvare"] },
  },
  alerts: {
    title: "Centro alert",
    summary: "Coda unica di alert e anomalie del tuo ambito.",
    sections: [["Viste", "Tutti, Miei, Critici, Da riprogrammare, Finanziari."], ["Filtri", "Tipo (alert/anomalia) e stato (da gestire/chiusi)."]],
    actions: {
      ALL: ["Esportare in CSV"],
      STRUCTURE_USER: ["Prendere in carico e risolvere"],
      PROCUREMENT_OFFICER: ["Prendere in carico, risolvere, sospendere"],
      FINANCE_OFFICER: ["Prendere in carico e risolvere"],
      EXECUTIVE: ["Sospendere l'escalation"],
    },
  },
  assistant: {
    title: "Assistente",
    summary: "Domande in linguaggio naturale con risposte deterministiche e fonti citate.",
    sections: [["Esempi", "Stato e passo in corso di una procedura, memorie in scadenza, importo a rischio, procedure da riprogrammare."]],
    actions: { ALL: ["Fare una domanda o scegliere un esempio"] },
  },
  audit: {
    title: "Audit",
    summary: "Registro append-only di tutte le azioni, con verifica della catena di hash.",
    sections: [["Filtri", "Procedura, utente, azione."], ["Eventi", "Data, autore, azione, oggetto, prima/dopo, motivazione."]],
    actions: { ALL: ["Filtrare e consultare"] },
  },
  admin: {
    title: "Amministrazione",
    summary: "Configurazione della demo e stato del sistema.",
    sections: [
      ["Data di riferimento", "Data di business e controlli manuali."],
      ["Moduli visibili", "Modulo 1 sempre attivo; Modulo 2 nascosto nella demo."],
      ["Impersonazione e reset", "Agire come un altro utente; ricaricare il dataset."],
      ["Stato del sistema e import", "Worker, coda e-mail, report del workbook."],
      ["Soglie, calendario, utenti", "Parametri degli alert, festività locali, ruoli e ambiti."],
    ],
    actions: { ADMIN: ["Tutte le operazioni della pagina"] },
  },
  templates: {
    title: "Modelli di procedura",
    summary: "Passi, corsie, durate, date chiave e documenti attesi per tipologia di procedura.",
    sections: [["Modulo 1", "Modelli M1-*: variante A (affidamento diretto, adesione) e B (negoziata, aperta, accordo quadro)."], ["Collaudo", "Modelli v1 usati dalle 12 procedure di collaudo."]],
    actions: { ADMIN: ["Consultare (configurazione versionata nei file YAML)"] },
  },
  guide: {
    title: "Guida demo",
    summary: "Mappa del processo, percorso per fasi e percorsi per attore.",
    sections: [],
    actions: { ALL: ["Avviare il percorso per fasi o quello del ruolo attivo", "Cambiare attore"] },
  },
};

/** Casi da usare durante la presentazione (dataset "inapp"). */
export const DEMO_CASES: { code: string; title: string; shows: string; who: Role[] }[] = [
  { code: "BZ-001", title: "Rinnovo licenze e supporto della piattaforma di business intelligence", shows: "Procedura guida: il percorso per fasi la porta dal piano alla stipula", who: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "SUPPLIER"] },
  { code: "CD-01", title: "Help desk applicativo per i portali istituzionali", shows: "Fase 1 · memoria in scadenza il 07/10/2026", who: ["STRUCTURE_USER"] },
  { code: "CD-02", title: "Licenze e assistenza del sistema di protocollo informatico", shows: "Fase 1 · presa in carico dell'Ufficio Gare", who: ["PROCUREMENT_OFFICER"] },
  { code: "CD-03", title: "Rilevazione CATI per l'indagine sulla qualità del lavoro", shows: "Fase 1 · verifica importi e prenotazioni, in scadenza oggi", who: ["FINANCE_OFFICER"] },
  { code: "CD-04", title: "Segreteria organizzativa degli eventi territoriali PN GDL", shows: "Fase 2 · documenti dell'operatore per la verifica dei requisiti", who: ["SUPPLIER"] },
  { code: "CD-08", title: "Campagna di comunicazione sui servizi per l'occupazione giovanile", shows: "Fase 2 · impegni di spesa dopo la determina di indizione", who: ["FINANCE_OFFICER"] },
  { code: "CD-05", title: "Valutazione indipendente del PN GDL 2021-2027", shows: "Fase 3 · aggiudicazione scaduta: riprogrammazione con sforamento, override dell'Ufficio Gare", who: ["FINANCE_OFFICER", "PROCUREMENT_OFFICER"] },
  { code: "CD-06", title: "Rinnovo licenze software statistiche (Consip)", shows: "Fase 3 · riprogrammazione senza criticità, da approvare dall'Ufficio Gare", who: ["FINANCE_OFFICER", "PROCUREMENT_OFFICER"] },
  { code: "CD-07", title: "Servizi di hosting e gestione del portale istituzionale", shows: "Fase 3 · ordine da accettare e controfirmare; l'importo letto dall'OCR differisce dall'aggiudicazione", who: ["SUPPLIER"] },
  { code: "OP01-S5", title: "Procedura reale del Piano", shows: "Memoria scaduta: simulazione di riprogrammazione guidata", who: ["PROCUREMENT_OFFICER"] },
  { code: "OP04-S18", title: "Stage4EU – fascicolo reale", shows: "6 atti di gara reali associati per CIG, OCR, impegni letti dalla determina", who: ["PROCUREMENT_OFFICER"] },
];
