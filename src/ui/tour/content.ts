import type { Role } from "@/domain/model";

/**
 * Contenuti della guida demo (DEC-106): un percorso per attore e l'aiuto di ogni pagina.
 * Solo testo statico: nessun dato calcolato. I codici citati sono quelli del dataset
 * "inapp" (portafoglio reale PN GDL + casi dimostrativi CD-xx e BZ-001, DEC-105).
 */

export interface TourStep {
  /** Pagina del passo: percorso più eventuali parametri (es. "/procedure/CD-02?tab=finance"). */
  path: string;
  /** Selettore CSS dell'elemento da evidenziare (facoltativo). */
  target?: string;
  title: string;
  body: string;
  /** Cosa può fare l'attore in questa pagina. */
  can?: string[];
  /** Azione suggerita da provare subito. */
  tryIt?: string;
}

export interface Tour {
  role: Role;
  login: string;
  persona: string;
  goal: string;
  cases: string[];
  steps: TourStep[];
  next?: Role;
}

export const TOUR_ORDER: Role[] = ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "VALIDATOR", "SUPPLIER", "FINANCE_OFFICER", "EXECUTIVE", "ADMIN"];

export const TOURS: Record<Role, Tour> = {
  STRUCTURE_USER: {
    role: "STRUCTURE_USER",
    login: "struttura.si",
    persona: "Responsabile della Struttura Sistemi informativi",
    goal: "Esprime il fabbisogno, prepara e consegna la memoria, verifica la regolare esecuzione dei SAL dei propri contratti.",
    cases: ["BZ-001 – bozza da consegnare", "CD-01 – memoria in scadenza il 07/10/2026", "CD-02 – SAL 2 presentato dal fornitore, da verificare"],
    next: "PROCUREMENT_OFFICER",
    steps: [
      {
        path: "/",
        target: "section[aria-label='Indicatori principali']",
        title: "La tua dashboard",
        body: "Vedi solo le procedure della tua struttura (ambito Sistemi informativi): gli indicatori e i totali sono calcolati sul tuo perimetro. Ogni indicatore è un collegamento al portafoglio già filtrato.",
        can: ["Leggere procedure monitorate, alert critici e importo a rischio", "Aprire il portafoglio filtrato con un clic su un indicatore"],
      },
      {
        path: "/portafoglio",
        target: "form.filters",
        title: "Portafoglio della struttura",
        body: "Le tre procedure della struttura: una bozza (BZ-001), una memoria da consegnare (CD-01) e un contratto in esecuzione (CD-02). I filtri restano nell'indirizzo della pagina, quindi una vista filtrata si può condividere.",
        can: ["Filtrare per health, fase, tipologia, annualità e alert", "Ordinare cliccando le intestazioni", "Esportare CSV o XLSX", "Creare una nuova procedura in bozza"],
      },
      {
        path: "/procedure/nuova",
        target: "main form",
        title: "Nuova procedura in bozza",
        body: "La bozza nasce dalla Struttura: oggetto, tipologia, importo IVA inclusa e riparto per annualità. Il sistema sceglie il modello di procedura e calcola le date previste a partire dalla data obiettivo della memoria.",
        can: ["Creare una bozza (il riparto deve coincidere con il programmato)"],
        tryIt: "Crea «Servizi di hosting del portale», affidamento diretto MePA, 48.800,00 € tutto sul 2027, memoria entro il 30/10/2026.",
      },
      {
        path: "/procedure/BZ-001",
        target: "[data-tour='memoria']",
        title: "Consegna della memoria",
        body: "BZ-001 è una bozza: non ha ancora date effettive. Alla consegna della memoria la baseline si congela (non cambierà più) e la titolarità passa all'Ufficio Gare.",
        can: ["Consegnare la memoria con data e numero di protocollo"],
        tryIt: "Consegna la memoria con data 01/10/2026 e protocollo «INAPP-DEMO 412/2026», poi guarda la scheda: compare la versione baseline.",
      },
      {
        path: "/procedure/CD-01?tab=timeline",
        target: "main table.data",
        title: "Cronoprogramma e scadenze",
        body: "CD-01 ha la memoria prevista per il 07/10/2026: mancano meno di 10 giorni, quindi la procedura è ambra e la Struttura riceve il reminder. Ogni milestone ha un responsabile (owner), una data baseline, una prevista e una effettiva.",
        can: ["Registrare il completamento della milestone attiva con data effettiva e riferimento all'atto"],
        tryIt: "Registra la consegna della memoria al 01/10/2026: l'alert si chiude da solo e l'health si ricalcola.",
      },
      {
        path: "/procedure/CD-01?tab=documents",
        target: "[data-tour='upload']",
        title: "Fascicolo documentale",
        body: "Qui stanno gli atti della procedura. Puoi caricare PDF, documenti Office o archivi ZIP (controllati per tipo, dimensione e contenuto). Il testo viene estratto, anche con OCR, e i campi riconosciuti vanno in validazione: nulla sovrascrive i dati validati.",
        can: ["Caricare documenti e archivi ZIP", "Aprire i documenti del fascicolo"],
      },
      {
        path: "/procedure/CD-02?tab=finance",
        target: "[data-tour='sal']",
        title: "Verifica del SAL",
        body: "Il fornitore ha presentato il SAL 2 (73.200,00 €) il 28/09/2026: la verifica va chiusa entro 30 giorni. La Struttura attesta l'esito tecnico; l'accettazione formale spetta al RUP (Ufficio Gare).",
        can: ["Mettere il SAL «In verifica» o rigettarlo con motivazione"],
        tryIt: "Registra «In verifica» con la nota «Collaudo funzionale in corso».",
      },
      {
        path: "/alert?view=mine",
        target: "nav.tabs",
        title: "Le tue notifiche",
        body: "La campanella e la vista «Miei» raccolgono gli alert indirizzati alla tua struttura. Prendere in carico o risolvere un alert non modifica mai milestone o importi.",
        can: ["Prendere in carico e risolvere alert", "Segnare le notifiche come lette"],
      },
      {
        path: "/assistente",
        target: "main",
        title: "Assistente",
        body: "Fa domande in linguaggio naturale sui dati della tua struttura e risponde citando le fonti. Non usa IA generativa: legge solo i dati del motore deterministico.",
        tryIt: "Chiedi «Memorie in scadenza nei prossimi 30 giorni».",
      },
    ],
  },
  PROCUREMENT_OFFICER: {
    role: "PROCUREMENT_OFFICER",
    login: "gare",
    persona: "Ufficio Gare (RUP)",
    goal: "Porta avanti le gare, aggiorna le milestone, simula le riprogrammazioni e accetta i SAL.",
    cases: ["OP01-S5 – procedura reale in rosso da riprogrammare", "CD-05 – riprogrammazione inviata con sforamento del bilancio", "CD-02 – SAL 2 da accettare", "OP04-S18 – fascicolo reale Stage4EU"],
    next: "VALIDATOR",
    steps: [
      {
        path: "/",
        target: "section[aria-labelledby='att']",
        title: "Cosa richiede attenzione",
        body: "La dashboard elenca le procedure rosse e ambra con la prossima scadenza. Sono i dati reali del Piano PN Giovani, Donne e Lavoro (82 procedure) più i casi dimostrativi CD-xx.",
        can: ["Aprire una procedura dall'elenco", "Leggere fabbisogno per annualità e procedure per fase"],
      },
      {
        path: "/portafoglio?health=RED,AMBER",
        target: ".table-wrap",
        title: "Portafoglio filtrato: rosse e ambra",
        body: "Il filtro è nell'indirizzo. La colonna Health spiega il motivo al passaggio del mouse; «Riprogrammazione richiesta» segnala una milestone bloccante scaduta.",
        can: ["Filtrare, ordinare, esportare", "Rimuovere un filtro con la × sul chip"],
      },
      {
        path: "/procedure/OP01-S5",
        target: ".proc-head",
        title: "Scheda di una procedura reale",
        body: "OP01-S5 viene dal workbook (foglio Gare_23-27): baseline = versione V3 del Piano, previsione corrente = V4. «Perché questo stato» elenca le regole che hanno portato al rosso; in fondo trovi l'iter riportato nel workbook.",
        can: ["Navigare le 7 sezioni della scheda", "Scaricare il report PDF", "Avviare una simulazione di riprogrammazione"],
      },
      {
        path: "/procedure/OP01-S5?tab=timeline",
        target: "main table.data",
        title: "Cronoprogramma",
        body: "Gantt con baseline (cerchio), prevista (rombo blu), effettiva (verde) e scaduta (rosso); la linea tratteggiata è la data di riferimento. Le date effettive non cambiano mai con una riprogrammazione.",
        can: ["Registrare il completamento della milestone attiva"],
      },
      {
        path: "/procedure/OP01-S5/riprogrammazione",
        target: ".stepper",
        title: "Simulazione di riprogrammazione",
        body: "Cinque passi: causa, impatto sul cronoprogramma, impatto per annualità, alternative (più rapida, minimo impatto sul bilancio, manuale) e decisione. Salvare la simulazione non cambia nessun dato: serve l'approvazione di un'altra persona.",
        can: ["Scegliere la nuova data (non prima della data più rapida ammissibile)", "Confrontare le alternative", "Salvare la bozza e inviarla in approvazione"],
        tryIt: "Scegli l'alternativa «più rapida», arriva alla decisione e salva la simulazione.",
      },
      {
        path: "/procedure/CD-05?tab=simulations",
        target: "[data-tour='simulazioni']",
        title: "Quattro occhi e criticità bloccanti",
        body: "Per CD-05 hai già inviato la riprogrammazione RS-CD05-001; accanto c'è la bozza automatica creata dal sistema al T+1, che puoi rivedere e inviare. La tua proposta: spostare l'aggiudicazione al 14/12/2026 sposta pagamenti sul 2027 e sul 2028 oltre la disponibilità (BUDGET_OVERFLOW). Non puoi approvarla tu: serve il Direttore Generale, con override motivato.",
        can: ["Inviare in approvazione le proprie bozze", "Vedere esito e motivazione delle decisioni"],
      },
      {
        path: "/procedure/CD-02?tab=finance",
        target: "[data-tour='sal']",
        title: "Accettazione del SAL",
        body: "Come RUP accetti il SAL 2 presentato dal fornitore: l'importo accettato diventa fatturabile per l'Amministrazione. Puoi anche rigettarlo con motivazione: il fornitore potrà ripresentarlo.",
        can: ["Accettare, mettere in verifica o rigettare un SAL"],
        tryIt: "Registra l'esito «Accettato» con nota «Collaudo superato».",
      },
      {
        path: "/alert",
        target: "nav.tabs",
        title: "Centro alert",
        body: "Coda unica di alert temporali (T-1 mese … T+1) e anomalie di dato. L'Ufficio Gare può sospendere l'escalation fino a una data, con motivo.",
        can: ["Prendere in carico, risolvere, sospendere l'escalation", "Esportare gli alert in CSV"],
      },
      {
        path: "/procedure/OP04-S18?tab=documents",
        target: "main table.data",
        title: "Il fascicolo reale",
        body: "I 6 atti di gara forniti sono associati a OP04-S18 per CIG. Tre erano scansioni: l'OCR locale ne ha estratto il testo e i campi (CIG, importi, impegni) sono passati in validazione.",
        can: ["Caricare nuovi atti", "Aprire i PDF originali"],
      },
    ],
  },
  VALIDATOR: {
    role: "VALIDATOR",
    login: "validatore",
    persona: "Validatore / operatore di monitoraggio",
    goal: "Controlla ciò che il sistema propone (dati estratti, associazioni, riprogrammazioni) prima che diventi un dato ufficiale.",
    cases: ["CD-02 – importo letto male dall'OCR (183.600 € invece di 183.000 €)", "OP04-S18 – 5 associazioni di documenti da confermare", "CD-06 – riprogrammazione senza criticità da approvare"],
    next: "SUPPLIER",
    steps: [
      {
        path: "/validazione",
        target: ".table-wrap",
        title: "Coda di validazione",
        body: "Ogni proposta mostra il valore proposto, quello già validato, la fonte (documento, pagina, estratto) e l'affidabilità. In CD-02 l'OCR ha letto 183.600,00 € contro i 183.000,00 € del contratto: è un conflitto da correggere o rifiutare.",
        can: ["Approvare la proposta", "Correggerla con il valore giusto (motivazione obbligatoria)", "Rifiutarla (motivazione obbligatoria)"],
        tryIt: "Sul conflitto di CD-02 scegli «Rifiuta» con motivazione «Errore di lettura OCR, il contratto riporta 183.000,00 €».",
      },
      {
        path: "/procedure/CD-02?tab=documents",
        target: "main table.data",
        title: "Verifica sulla fonte",
        body: "Prima di decidere apri il documento originale: ogni valore della piattaforma ha un'evidenza che punta al file e alla pagina da cui proviene.",
        can: ["Aprire il PDF del contratto e la relazione del SAL"],
      },
      {
        path: "/procedure/OP04-S18?tab=documents",
        target: "main table.data",
        title: "Documenti reali e OCR",
        body: "I documenti associati per CIG hanno affidabilità alta; quelli associati solo perché nello stesso fascicolo sono in coda come «Associazione». Il pulsante di elaborazione esegue testo e OCR sui file in attesa.",
        can: ["Elaborare i documenti in attesa (testo + OCR)", "Caricare documenti e archivi ZIP"],
      },
      {
        path: "/procedure/CD-06?tab=simulations",
        target: "[data-tour='simulazioni']",
        title: "Approvare una riprogrammazione",
        body: "L'Ufficio Gare ha inviato la riprogrammazione di CD-06 (aggiudicazione al 15/10/2026): nessuna criticità bloccante, i pagamenti restano nel 2026. Approvando nasce una nuova versione; la baseline resta intatta.",
        can: ["Approvare o rifiutare con motivazione", "Non puoi forzare criticità bloccanti: è riservato al Direttore Generale"],
        tryIt: "Sulla riga RS-CD06-001 (autore gare) approva con motivazione «Proroga coerente con la convenzione Consip».",
      },
      {
        path: "/procedure/CD-06",
        target: ".grid-2 .card",
        title: "Effetto dell'approvazione",
        body: "In «Baseline, previsione ed effettivo» la previsione è aggiornata mentre la baseline no; sotto la tabella compare la catena delle versioni. Gli alert vengono ricalcolati subito.",
      },
      {
        path: "/procedure/CD-02?tab=finance",
        target: "[data-tour='sal']",
        title: "SAL",
        body: "Il validatore può verificare e accettare i SAL quando il RUP lo delega.",
        can: ["Mettere in verifica, accettare o rigettare un SAL"],
      },
      {
        path: "/audit",
        target: ".page-meta",
        title: "Audit con catena di hash",
        body: "Ogni azione è registrata con autore, data, valori prima/dopo e motivazione. Gli eventi sono concatenati da hash: se qualcuno alterasse il database, la catena risulterebbe interrotta.",
        can: ["Filtrare per procedura, utente e azione"],
      },
    ],
  },
  SUPPLIER: {
    role: "SUPPLIER",
    login: "fornitore.alfa",
    persona: "Fornitore Demo Alfa S.r.l.",
    goal: "Vede solo i propri contratti, presenta i SAL e carica i deliverable.",
    cases: ["CD-03 – SAL 2 da presentare entro il 30/10/2026", "CD-02 – SAL 2 in verifica presso INAPP"],
    next: "FINANCE_OFFICER",
    steps: [
      {
        path: "/portafoglio",
        target: ".table-wrap",
        title: "Solo i tuoi contratti",
        body: "Il fornitore vede esclusivamente le procedure in cui è contraente: CD-02 e CD-03. Il controllo è fatto dal server su ogni pagina e su ogni API, non solo nascondendo i menu.",
      },
      {
        path: "/procedure/CD-03",
        target: "nav.tabs",
        title: "Vista ridotta",
        body: "La scheda mostra solo Panoramica, Finanza e Documenti: niente alert interni, simulazioni o audit dell'amministrazione.",
      },
      {
        path: "/procedure/CD-03?tab=finance",
        target: "[data-tour='sal']",
        title: "Presentare un SAL",
        body: "Il SAL 1 è già accettato. Il SAL 2 (60%, 146.400,00 €) scade il 30/10/2026: presentandolo parte il termine di verifica di 30 giorni per INAPP.",
        can: ["Presentare un SAL pianificato o ripresentare un SAL rigettato"],
        tryIt: "Presenta il SAL 2 con data 01/10/2026.",
      },
      {
        path: "/procedure/CD-03?tab=documents",
        target: "[data-tour='upload']",
        title: "Caricare il deliverable",
        body: "Allega la relazione del SAL: il file è controllato (tipo, firma del contenuto, dimensione) e conservato con il suo hash.",
        can: ["Caricare PDF o ZIP"],
      },
      {
        path: "/procedure/CD-04",
        title: "Prova: una procedura non tua",
        body: "CD-04 è il contratto di un altro fornitore. La piattaforma risponde «Accesso non consentito» senza mostrare alcun dato: è il controllo a livello di singolo oggetto.",
      },
    ],
  },
  FINANCE_OFFICER: {
    role: "FINANCE_OFFICER",
    login: "amministrazione",
    persona: "Amministrazione e Contabilità",
    goal: "Registra fatture, liquidazioni e pagamenti, controlla impegni e disponibilità per annualità.",
    cases: ["CD-03 – SAL 1 accettato da fatturare e liquidare", "CD-04 – pagamento da 48.800,00 € in scadenza il 01/10/2026"],
    next: "EXECUTIVE",
    steps: [
      {
        path: "/",
        target: "section[aria-labelledby='ann']",
        title: "Fabbisogno e disponibilità",
        body: "Il grafico confronta per ogni anno il fabbisogno previsto con la disponibilità di bilancio. L'importo a rischio somma il non coperto e la spesa dell'anno in slittamento.",
        can: ["Leggere il dettaglio in tabella sotto il grafico"],
      },
      {
        path: "/procedure/CD-03?tab=finance",
        target: "[data-tour='sal']",
        title: "Dal SAL accettato al pagamento",
        body: "Il ciclo è: accettato → fatturato → liquidato → pagato. Ogni passaggio crea un movimento finanziario che non si può cancellare.",
        can: ["Registrare la fattura", "Liquidare l'importo", "Registrare il pagamento"],
        tryIt: "Registra la fattura del SAL 1, poi liquida 97.600,00 €.",
      },
      {
        path: "/procedure/CD-04?tab=finance",
        target: "[data-tour='sal']",
        title: "Pagamento in scadenza",
        body: "La fattura è del 01/09/2026: il termine di 30 giorni scade oggi. Il sistema impedisce di pagare più del liquidato.",
        can: ["Registrare il pagamento con il riferimento del mandato"],
        tryIt: "Prova prima a pagare 50.000,00 € (bloccato), poi registra 48.800,00 € con riferimento «Mandato 2051/2026».",
      },
      {
        path: "/procedure/CD-04?tab=finance",
        target: "[data-tour='movimenti']",
        title: "Movimenti e storni",
        body: "Impegni, liquidazioni e pagamenti sono in sola aggiunta. Un errore si corregge con uno storno motivato, che resta visibile insieme al pagamento originale.",
        can: ["Stornare un pagamento con motivazione"],
      },
      {
        path: "/procedure/OP04-S18?tab=finance",
        target: "main",
        title: "Dati reali: impegni dagli atti",
        body: "Per OP04-S18 gli impegni 2025/2026 sono stati letti dalla determina reale e approvati in validazione; il piano SAL 20/50/30 è una proposta da validare.",
      },
      {
        path: "/portafoglio?year=2027&sort=risk&dir=desc",
        target: ".page-head .actions",
        title: "Esportazioni",
        body: "Ordina per importo a rischio sull'annualità 2027 ed esporta la vista in XLSX per il controllo di gestione. Ogni esportazione è registrata nell'audit.",
        can: ["Esportare CSV e XLSX della vista filtrata"],
      },
    ],
  },
  EXECUTIVE: {
    role: "EXECUTIVE",
    login: "dirigente",
    persona: "Direttore Generale",
    goal: "Ha la visione d'insieme, decide le riprogrammazioni e può forzare, motivando, le criticità bloccanti.",
    cases: ["CD-05 – riprogrammazione che sfora il bilancio 2027/2028: serve il tuo override", "Portafoglio reale PN GDL: 82 procedure"],
    next: "ADMIN",
    steps: [
      {
        path: "/",
        target: "section[aria-label='Indicatori principali']",
        title: "Dashboard direzionale",
        body: "Procedure monitorate con la ripartizione rosso/ambra/verde, alert critici, importo programmato e importo a rischio. Tutti i numeri sono calcolati dal motore alla data di riferimento indicata in alto.",
        can: ["Cliccare un indicatore per aprire l'elenco corrispondente"],
      },
      {
        path: "/portafoglio?health=RED",
        target: ".table-wrap",
        title: "Le procedure in rosso",
        body: "Dal portafoglio filtrato si apre ogni procedura; la colonna «A rischio» mostra quanto della spesa prevista è scoperto o in slittamento.",
      },
      {
        path: "/procedure/CD-05?tab=simulations",
        target: "[data-tour='simulazioni']",
        title: "Decidere con override",
        body: "L'Ufficio Gare propone di spostare l'aggiudicazione di CD-05 al 14/12/2026. La simulazione segnala lo sforamento della disponibilità 2027 e 2028: solo tu puoi approvarla, spuntando l'override e motivando. In alternativa la rifiuti.",
        can: ["Approvare con override motivato", "Rifiutare con motivazione"],
        tryIt: "Sulla riga RS-CD05-001 (autore gare) spunta l'override e approva con motivazione «Copertura 2028 da richiedere nella prossima variazione di bilancio». La riga di autore «system» è la bozza automatica generata al T+1.",
      },
      {
        path: "/procedure/CD-05",
        target: ".grid-2 .card:nth-child(2)",
        title: "Impatto per annualità",
        body: "Dopo l'approvazione il grafico mostra il fabbisogno spostato sul 2027–2028 e lo sforamento evidenziato. La baseline resta quella originale.",
      },
      {
        path: "/alert?view=critical",
        target: "nav.tabs",
        title: "Alert critici",
        body: "Gli alert critici (scadenze bloccanti superate) arrivano anche a te in escalation. Puoi sospendere l'escalation fino a una data.",
        can: ["Sospendere l'escalation con motivo e data", "Esportare gli alert"],
      },
      {
        path: "/audit",
        target: "form.filters",
        title: "Tracciabilità",
        body: "Filtra per azione «SIMULATION_APPROVE_OVERRIDE»: trovi la tua decisione, con motivazione e valori prima/dopo.",
      },
      {
        path: "/assistente",
        target: "main",
        title: "Assistente",
        body: "Risponde a domande sul portafoglio citando le fonti.",
        tryIt: "Chiedi «Qual è l'importo a rischio?» oppure «Qual è lo stato di OP04-S18?».",
      },
    ],
  },
  ADMIN: {
    role: "ADMIN",
    login: "admin",
    persona: "Amministratore della piattaforma",
    goal: "Configura soglie, calendario, utenti e data di riferimento; ripristina la demo.",
    cases: ["Spostare la data di riferimento per far scattare gli alert", "Reset della demo tra un incontro e l'altro"],
    steps: [
      {
        path: "/admin",
        target: "[data-tour='refdate']",
        title: "Data di riferimento",
        body: "La demo ragiona su una data di business configurabile, non sull'orologio del server. Spostandola in avanti si vedono scattare reminder, alert ed escalation.",
        can: ["Cambiare la data e ricalcolare", "Eseguire subito i controlli (run_checks)"],
        tryIt: "Imposta il 20/10/2026, poi torna sulla dashboard e guarda come cambiano gli indicatori. Ripristina il 01/10/2026 alla fine.",
      },
      {
        path: "/admin",
        target: "[data-tour='impersona']",
        title: "Impersonazione",
        body: "Per presentare la demo senza uscire e rientrare puoi agire come un altro utente: la sessione è marcata e ogni azione resta attribuita anche a te nell'audit.",
        can: ["Impersonare un utente demo"],
      },
      {
        path: "/admin",
        target: "[data-tour='reset']",
        title: "Reset della demo",
        body: "Ricarica da zero il portafoglio reale (con i casi dimostrativi) oppure le 12 procedure di collaudo P-001…P-012. Tutte le sessioni vengono chiuse.",
        can: ["Scegliere il dataset e confermare digitando RESET"],
      },
      {
        path: "/admin",
        target: "[data-tour='import']",
        title: "Import del workbook",
        body: "Il report dell'ultimo import del workbook reale: righe lette, importate, annullate e segnalazioni per riga e campo.",
      },
      {
        path: "/admin",
        target: "[data-tour='soglie']",
        title: "Soglie e calendario",
        body: "Finestra di attenzione, soglia di reminder, termini di verifica SAL e di pagamento, festività locali. Ogni modifica è versionata e ricalcola gli alert.",
        can: ["Modificare soglie e festività"],
      },
      {
        path: "/admin",
        target: "[data-tour='utenti']",
        title: "Utenti e ruoli",
        body: "Aggiungi o modifica utenti, ruolo e ambito (struttura o fornitore). Le modifiche dei permessi sono nell'audit.",
        can: ["Creare o disattivare utenti", "Assegnare ruolo e ambito"],
      },
      {
        path: "/admin/modelli",
        target: "main section.card",
        title: "Modelli di procedura",
        body: "I sei modelli (affidamento diretto, negoziate, aperta, accordo quadro, adesione) con milestone, durate minime, owner, documenti attesi e politica di alert. Sono dimostrativi: le durate vanno validate con INAPP.",
      },
    ],
  },
};

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
  if (/^\/procedure\/[^/]+$/.test(pathname)) return HELP[`procedure.${tab ?? "overview"}`] ?? HELP["procedure.overview"]!;
  if (pathname === "/alert") return HELP.alerts!;
  if (pathname === "/validazione") return HELP.validation!;
  if (pathname === "/assistente") return HELP.assistant!;
  if (pathname === "/audit") return HELP.audit!;
  if (pathname === "/admin") return HELP.admin!;
  if (pathname === "/admin/modelli") return HELP.templates!;
  if (pathname === "/guida") return HELP.guide!;
  return null;
}

const HELP: Record<string, PageHelp> = {
  dashboard: {
    title: "Dashboard",
    summary: "Sintesi del portafoglio visibile al tuo ruolo alla data di riferimento.",
    sections: [
      ["Indicatori", "Procedure monitorate (rosso/ambra/verde), alert critici, programmato, importo a rischio. Ogni riquadro apre l'elenco filtrato."],
      ["Fabbisogno per annualità", "Previsione di spesa confrontata con la disponibilità di bilancio, con tabella equivalente."],
      ["Procedure per fase", "Quante procedure sono in programmazione, gara, aggiudicazione, esecuzione."],
      ["Richiede attenzione", "Procedure rosse e ambra con la prossima scadenza."],
    ],
    actions: { ALL: ["Aprire il portafoglio filtrato dagli indicatori", "Aprire una procedura dall'elenco"] },
  },
  portfolio: {
    title: "Portafoglio",
    summary: "Elenco delle procedure con filtri, ordinamento ed esportazione.",
    sections: [
      ["Filtri", "Ricerca per codice/oggetto/CIG, health, fase, struttura, tipologia, annualità, alert, riprogrammazione."],
      ["Tabella", "Fase, health con motivazione, prossima scadenza, programmato, importo a rischio, owner corrente."],
    ],
    actions: {
      ALL: ["Filtrare e ordinare (i filtri restano nell'indirizzo)"],
      STRUCTURE_USER: ["Creare una nuova procedura in bozza", "Esportare CSV/XLSX"],
      PROCUREMENT_OFFICER: ["Esportare CSV/XLSX"],
      FINANCE_OFFICER: ["Esportare CSV/XLSX"],
      EXECUTIVE: ["Esportare CSV/XLSX"],
      VALIDATOR: ["Esportare CSV/XLSX"],
      ADMIN: ["Creare una bozza", "Esportare CSV/XLSX"],
    },
  },
  draft: {
    title: "Nuova procedura in bozza",
    summary: "La Struttura esprime il fabbisogno: il modello di procedura e le date previste sono calcolati dal sistema.",
    sections: [["Dati della bozza", "Oggetto, tipologia, criterio, importo IVA inclusa, riparto per annualità, data obiettivo della memoria."]],
    actions: { STRUCTURE_USER: ["Creare la bozza"], ADMIN: ["Creare la bozza"] },
  },
  "procedure.overview": {
    title: "Scheda procedura · Panoramica",
    summary: "Stato, health e motivazioni, confronto baseline/previsione/effettivo, previsione di spesa per annualità.",
    sections: [
      ["Intestazione", "Codice, fase, health, tipologia, modello, CIG, importi programmato/contrattualizzato/pagato, prossima scadenza."],
      ["Perché questo stato", "Le regole che determinano l'health, con riferimento."],
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
  "procedure.timeline": {
    title: "Scheda procedura · Cronoprogramma",
    summary: "Milestone con owner, stato, date baseline/prevista/effettiva e Gantt.",
    sections: [["Tabella e Gantt", "Cerchio = baseline, rombo blu = prevista, verde = effettiva, rosso = scaduta; linea tratteggiata = data di riferimento."]],
    actions: {
      STRUCTURE_USER: ["Registrare il completamento della milestone attiva"],
      PROCUREMENT_OFFICER: ["Registrare il completamento della milestone attiva"],
      FINANCE_OFFICER: ["Registrare il completamento della milestone attiva"],
      VALIDATOR: ["Registrare il completamento della milestone attiva"],
    },
  },
  "procedure.finance": {
    title: "Scheda procedura · Finanza",
    summary: "Contratto, piano SAL, annualità, righe di previsione, movimenti e pagamenti.",
    sections: [
      ["Contratto", "Operatore, netto/IVA/lordo, date di stipula, decorrenza e fine."],
      ["Piano SAL", "Stato di ogni SAL e azione disponibile per il tuo ruolo."],
      ["Movimenti", "Impegni, liquidazioni, pagamenti e storni: sola aggiunta."],
    ],
    actions: {
      SUPPLIER: ["Presentare un SAL"],
      STRUCTURE_USER: ["Presentare, mettere in verifica o rigettare un SAL"],
      PROCUREMENT_OFFICER: ["Accettare o rigettare un SAL"],
      VALIDATOR: ["Verificare, accettare o rigettare un SAL"],
      FINANCE_OFFICER: ["Registrare fattura, liquidazione e pagamento", "Stornare un pagamento"],
    },
  },
  "procedure.documents": {
    title: "Scheda procedura · Documenti",
    summary: "Fascicolo con stato di elaborazione (testo, OCR) e affidabilità dell'associazione.",
    sections: [["Fascicolo", "Documenti, tipo, pagine, elaborazione, metodo di associazione."], ["Proposte da validare", "Campi estratti in attesa di decisione."]],
    actions: {
      STRUCTURE_USER: ["Caricare documenti e ZIP"],
      PROCUREMENT_OFFICER: ["Caricare documenti e ZIP"],
      SUPPLIER: ["Caricare deliverable"],
      VALIDATOR: ["Caricare documenti", "Elaborare i documenti in attesa (OCR)"],
      ADMIN: ["Caricare documenti", "Elaborare i documenti in attesa (OCR)"],
    },
  },
  "procedure.alerts": {
    title: "Scheda procedura · Alert",
    summary: "Alert temporali e anomalie della procedura, con destinatari e stato.",
    sections: [["Alert", "Livello, scadenza, messaggio, stato."]],
    actions: {
      STRUCTURE_USER: ["Prendere in carico e risolvere"],
      PROCUREMENT_OFFICER: ["Prendere in carico, risolvere, sospendere l'escalation"],
      FINANCE_OFFICER: ["Prendere in carico e risolvere"],
      VALIDATOR: ["Prendere in carico e risolvere"],
      EXECUTIVE: ["Sospendere l'escalation"],
    },
  },
  "procedure.simulations": {
    title: "Scheda procedura · Simulazioni",
    summary: "Riprogrammazioni simulate, inviate, approvate o rifiutate, con criticità e decisione.",
    sections: [["Simulazioni", "Milestone e nuova data, date cambiate, importo spostato, criticità, stato e autore."]],
    actions: {
      PROCUREMENT_OFFICER: ["Creare una nuova simulazione", "Inviare in approvazione"],
      FINANCE_OFFICER: ["Creare una nuova simulazione", "Inviare in approvazione"],
      VALIDATOR: ["Approvare o rifiutare (non le proprie, non con criticità bloccanti)"],
      EXECUTIVE: ["Approvare, anche con override motivato, o rifiutare"],
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
      ["1 · Causa", "Milestone da spostare, causa e nuova data (non prima della più rapida ammissibile)."],
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
    sections: [
      ["Viste", "Tutti, Miei, Critici, Da riprogrammare, Finanziari."],
      ["Filtri", "Tipo (alert/anomalia) e stato (da gestire/chiusi)."],
    ],
    actions: {
      ALL: ["Esportare in CSV"],
      STRUCTURE_USER: ["Prendere in carico e risolvere"],
      PROCUREMENT_OFFICER: ["Prendere in carico, risolvere, sospendere"],
      FINANCE_OFFICER: ["Prendere in carico e risolvere"],
      VALIDATOR: ["Prendere in carico e risolvere"],
      EXECUTIVE: ["Sospendere l'escalation"],
    },
  },
  validation: {
    title: "Coda di validazione",
    summary: "Proposte del sistema (estrazioni, conflitti, associazioni, riprogrammazioni dal workbook) da decidere.",
    sections: [["Proposte", "Valore proposto e validato, fonte con estratto, metodo, affidabilità."], ["Schede", "Da decidere, approvate, corrette, rifiutate."]],
    actions: { VALIDATOR: ["Approvare, correggere o rifiutare (motivazione obbligatoria per correggere e rifiutare)"], ADMIN: ["Consultare"] },
  },
  assistant: {
    title: "Assistente",
    summary: "Domande in linguaggio naturale con risposte deterministiche e fonti citate.",
    sections: [["Esempi", "Stato di una procedura, memorie in scadenza, importo a rischio, procedure da riprogrammare."]],
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
      ["Reset demo", "Ricarica del dataset scelto."],
      ["Impersonazione", "Agire come un altro utente demo."],
      ["Stato del sistema e import", "Worker, coda e-mail, report del workbook."],
      ["Soglie e calendario", "Parametri degli alert e festività locali."],
      ["Utenti", "Ruoli e ambiti."],
    ],
    actions: { ADMIN: ["Tutte le operazioni della pagina"] },
  },
  templates: {
    title: "Modelli di procedura",
    summary: "Milestone, durate, owner e documenti attesi per tipologia di procedura.",
    sections: [],
    actions: { ADMIN: ["Consultare (configurazione versionata nei file YAML)"] },
  },
  guide: {
    title: "Guida demo",
    summary: "Percorsi guidati per attore e casi dimostrativi.",
    sections: [],
    actions: { ALL: ["Avviare la guida del ruolo attivo", "Cambiare attore"] },
  },
};

/** Casi da usare durante la presentazione (dataset "inapp"). */
export const DEMO_CASES: { code: string; title: string; shows: string; who: Role[] }[] = [
  { code: "BZ-001", title: "Rinnovo licenze e supporto della piattaforma di business intelligence", shows: "Bozza della Struttura: consegna della memoria e congelamento della baseline", who: ["STRUCTURE_USER"] },
  { code: "CD-01", title: "Help desk applicativo per i portali istituzionali", shows: "Memoria in scadenza (07/10/2026): reminder e health ambra", who: ["STRUCTURE_USER"] },
  { code: "CD-02", title: "Cruscotto di monitoraggio degli indicatori PN GDL", shows: "SAL presentato dal fornitore da verificare e accettare; importo letto male dall'OCR in validazione", who: ["STRUCTURE_USER", "PROCUREMENT_OFFICER", "VALIDATOR", "SUPPLIER"] },
  { code: "CD-03", title: "Rilevazione CATI per l'indagine sulla qualità del lavoro", shows: "SAL accettato da fatturare e liquidare; SAL successivo da presentare", who: ["FINANCE_OFFICER", "SUPPLIER"] },
  { code: "CD-04", title: "Segreteria organizzativa degli eventi territoriali PN GDL", shows: "Pagamento in scadenza; blocco dei pagamenti oltre il liquidato; storno", who: ["FINANCE_OFFICER"] },
  { code: "CD-05", title: "Valutazione indipendente del PN GDL 2021-2027", shows: "Riprogrammazione con sforamento del bilancio: override motivato del Direttore Generale", who: ["PROCUREMENT_OFFICER", "EXECUTIVE"] },
  { code: "CD-06", title: "Rinnovo licenze software statistiche (Consip)", shows: "Riprogrammazione senza criticità approvata dal Validatore (quattro occhi)", who: ["VALIDATOR"] },
  { code: "OP01-S5", title: "Procedura reale del Piano", shows: "Milestone bloccante scaduta: simulazione di riprogrammazione guidata", who: ["PROCUREMENT_OFFICER"] },
  { code: "OP04-S18", title: "Stage4EU – fascicolo reale", shows: "6 atti di gara reali associati per CIG, OCR, impegni letti dalla determina", who: ["PROCUREMENT_OFFICER", "VALIDATOR", "FINANCE_OFFICER"] },
];
