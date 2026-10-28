# Registro decisioni e deviazioni

Registro **append-only**: non si cancella nulla. Le correzioni si fanno con una nuova voce che rimanda a quella superata.

- **DEC-001…DEC-099**: decisioni di default nella [guida §3](02_guida_sviluppo_agente.md#3-decisioni-di-default-dec), scritte prima dello sviluppo.
- **DEC-100 e successive**: decisioni prese dall'agente durante lo sviluppo, secondo la guida §2.3.
- **DEV-xxx**: deviazioni dalla specifica o dall'oracle, con motivazione e impatto.
- **ADR**: le scelte irreversibili vanno anche in `docs/adr/NNNN-titolo.md`.

Formato:

```
### DEC-1xx | DEV-xxx — Titolo
- Data: AAAA-MM-GG · Autore: agente | nome
- Contesto: cosa era ambiguo o in conflitto (rif. spec §, US-, CR-)
- Decisione: cosa si fa
- Alternative scartate: …
- Configurabile: sì (chiave `…`) | no
- Stato: DA VALIDARE | VALIDATA (da chi, quando) | SUPERATA da …
- Impatto su test/oracle: …
```

---

### DEV-001 — Conteggi del seed diversi dai minimi della §7.1
- Data: 2026-10-01 · Autore: analisi preliminare
- Contesto: la §7.1 chiede 8 strutture, almeno 8 contratti e almeno 14 SAL; il portafoglio della §7.2/7.3 implica 10 strutture, 6 contratti e 21 SAL (CR-12).
- Decisione: prevale il portafoglio, cioè 10 strutture, 6 contratti (P-004, P-005 in bozza, P-006, P-009, P-010, P-012 in bozza) e 21 SAL (contrattuali + piani pre-contratto).
- Alternative scartate: inventare contratti aggiuntivi, che altererebbero le fasi della tabella 7.2.
- Configurabile: no (dato seed) · Stato: DA VALIDARE
- Impatto: nessuno sul DoD.

### DEV-002 — P-001 senza contratto, riparto su 120.000
- Data: 2026-10-01 · Autore: analisi preliminare
- Contesto: la §7.3 attribuisce a P-001 (fase Memoria) un "contratto €119.560" e un riparto 23.912 / 95.648, mentre il programmato è 120.000 e S-01 usa 120.000 (CR-13).
- Decisione: nessun contratto in MEMORY_EXPECTED; riparto 20/50/30 su 120.000 → 2026: 24.000; 2027: 96.000; residuo 120.000.
- Alternative scartate: mantenere 119.560 come "importo stimato" (genererebbe un'anomalia `AMOUNTS_NOT_RECONCILED` non prevista).
- Configurabile: no · Stato: DA VALIDARE
- Impatto: riga P-001 della tabella 7.3 diversa; DoD invariato.

### DEV-003 — Righe di previsione di P-002 e P-008 ancorate alla milestone in ritardo
- Data: 2026-10-01 · Autore: analisi preliminare
- Contesto: i totali annui della §7.3 per P-002 e P-008 non sono compatibili con i modelli temporali (pagamenti nel 2026 prima dell'aggiudicazione) (CR-02, CR-32).
- Decisione: righe datate ancorate a `MEMORY_SUBMISSION` (P-002) e ad `AWARD` (P-008), scelte in modo che le regole producano esattamente €150.000 / €80.000 e €250.000 / €100.000.
- Stato: DA VALIDARE (se INAPP vuole dati realistici, cambiano anche i valori attesi del DoD).

### DEV-004 — Stack Next.js fullstack + SQLite al posto di FastAPI + PostgreSQL
- Data: 2026-10-01 · Autore: riprogettazione su richiesta del cliente
- Contesto: la specifica §4.1/§4.4/§11.3 indica Python/FastAPI, PostgreSQL, worker Python, Pytest e mypy; il cliente chiede un solo stack Next.js (TypeScript) con SQLite (CR-37).
- Decisione: Next.js 16 fullstack, SQLite (better-sqlite3 + Drizzle), worker Node con lo stesso codebase, Vitest + Playwright. Principi §2.4, API §10, NFR e oracle invariati. Dettagli in docs/06_architettura_nextjs_sqlite.md e ADR-0001.
- Alternative scartate: mantenere FastAPI/PostgreSQL (rifiutato dal cliente); Next.js + PostgreSQL (più robusto, ma richiede un servizio DB in più e non rispetta la richiesta).
- Configurabile: no · Stato: DA VALIDARE (presa d'atto di INAPP dei limiti della §2.11 e del criterio di migrazione della §2.12)
- Impatto su test/oracle: nessuno sui valori attesi; cambiano strumenti e layout dei test (DEC-093).

### DEV-005 — P-002 resta procedura negoziata pur essendo sopra la soglia UE
- Data: 2026-10-01 · Autore: integrazione di 05/08
- Contesto: P-002 vale ≈ 393.000 € netti, sopra la soglia UE sub-centrale di 216.000 € (CR-31, [08 §4](08_risposte_criticita.md)). Una procedura negoziata senza bando non è plausibile.
- Decisione: opzione B, cioè la tipologia `NEGOTIATED` (NEG-4M) resta. Passare a `OPEN` porterebbe `date_changes` di S-02 da 7 a 8, contro la specifica §10.4.
- Alternative scartate: opzione A, `OPEN`/OPEN-9M, più realistica; si adotta se INAPP lo chiede, aggiornando l'oracle.
- Configurabile: no · Stato: DA VALIDARE
- Impatto su test/oracle: nessuno. L'anomalia `PROCEDURE_TYPE_THRESHOLD_MISMATCH` resta disattivata nel seed.

### DEV-006 — Adeguamento a documenti reali e normativa (guida v1.1)
- Data: 2026-10-01 · Autore: integrazione di 05/06/07/08
- Contesto: l'analisi del workbook e degli atti reali ([05](05_analisi_documenti_reali.md)) e la verifica normativa ([08](08_risposte_criticita.md)) correggono diversi default della guida v1.0.
- Decisione:
  - **Modelli di procedura** (guida §9): scelta per tipologia, criterio di aggiudicazione e strumento. `OPEN-7M` diventa `OPEN-9M`; nascono `NEG-7M` e `FA-ADH-2M`. I minimi rispettano gli artt. 18 e 71; i codici delle milestone restano invariati, le etichette diventano quelle reali; la garanzia definitiva è richiesta in tutti i modelli; si aggiungono le determine fra i documenti attesi.
  - **Tipologie del dataset**: P-004 `DIRECT_AWARD` → `NEGOTIATED`; P-009 `MEPA_ORDER` → `CENTRAL_PURCHASING_ORDER`.
  - **Documenti seed**: da 18 a 22, con layout reale, e `procedures.xlsx` con le intestazioni del workbook INAPP.
  - **Modelli**: da 4 a 6. Per i conteggi questo aggiorna DEV-001.
  - **Nuove DEC**: 014, 015, 026, 034–037, 071, 081, 082.
- Verifica: ricalcolo a mano e con script delle simulazioni con i nuovi modelli. S-02 dà `date_changes` 7, S-04 1, S-05 3. Importi, overflow, health, alert (9), notifiche (17 in-app / 19 e-mail), anomalie (3) e KPI sono invariati.
- Stato: DA VALIDARE (circolare INAPP del 26/04/2022, modalità dell'accordo quadro)
- Impatto su test/oracle: **nessuno** sui valori della guida §10.3–10.6.

### DEV-007 — Dati reali INAPP e logo ufficiale nella demo
- Data: 2026-10-01 · Autore: indicazione del cliente
- Contesto: la guida v1.1 vietava i dati reali (DEC-071) e il logo ufficiale (07 §5.1). Il cliente chiede di usare i dati forniti, che giudica realistici e privi di problemi di privacy, e il logo e i colori INAPP.
- Decisione: i dati reali sono copiati in `seed/inapp/` e importati con `DEMO_DATASET=inapp` (default della demo). Le 12 procedure sintetiche (`DEMO_DATASET=scenarios`) restano l'oracle di test e DoD. Il logo bianco ufficiale si usa nell'header e nel login.
- Stato: VALIDATA dal cliente (01/10/2026). Supera DEC-071 v1.1 e 07 §5.1.
- Impatto su test/oracle: nessuno sull'oracle (profilo `scenarios`). Per il profilo `inapp` si verificano il report di import e gli invarianti, non valori attesi puntuali.

### DEC-101 — SQL scritto a mano con better-sqlite3 al posto di Drizzle
- Data: 2026-10-01 · Autore: agente
- Contesto: DEC-096 prevede Drizzle; drizzle-kit ricrea le tabelle e può perdere i trigger (CR-39).
- Decisione: migrazioni SQL numerate (`db/migrations/*.sql`) e repository con prepared statement. Trigger in `db/sql/triggers.sql` riapplicati a ogni avvio e verificati da test e `/ready`.
- Alternative scartate: Drizzle (rischio trigger, doppia definizione dello schema).
- Stato: attiva · Impatto: nessuno su oracle.

### DEC-102 — Livelli applicativi semplificati
- Data: 2026-10-01 · Autore: agente
- Decisione: `src/domain` resta puro (verificato da `scripts/guards.ts`); `src/application`, `src/infrastructure` e `src/server` possono usare il DB. Le pagine (Server Component) leggono solo tramite `src/server/queries.ts` con l'attore della sessione; le mutazioni passano solo dalle route `/api/*`.
- Alternative scartate: porte/adapter completi e dependency-cruiser (rinviati: costo alto per l'MVP).
- Stato: attiva.

### DEC-103 — Completezza documentale solo per fascicoli caricati
- Data: 2026-10-01 · Autore: agente
- Contesto: nel dataset reale c'è un solo fascicolo; l'anomalia `EXPECTED_DOCUMENT_MISSING` scattava su 63 procedure senza documenti caricati.
- Decisione: flag `procedures.documents_tracked`; il controllo di completezza (e il blocco BEFORE) vale solo con fascicolo caricato. Nel dataset `scenarios` tutte le procedure sono tracciate (oracle invariato).
- Stato: DA VALIDARE.

### DEC-104 — CSS sui token INAPP invece di Tailwind/shadcn
- Data: 2026-10-01 · Autore: agente
- Decisione: foglio di stile applicativo (`src/app/globals.css`) costruito solo sui token di `docs/design/tokens.css`; componenti React propri (badge, tabelle, stepper, grafico SVG accessibile). Recharts e shadcn non usati.
- Motivo: meno dipendenze, controllo diretto su contrasto e accessibilità; nessuna differenza visiva rispetto a 07.
- Stato: attiva.

### DEV-008 — Ambito non ancora implementato al termine della sessione del 01–02/10/2026
- Non implementati: OCR (`tesseract.js`) e generazione dei 22 PDF sintetici del dataset `scenarios` (I6, T-015/T-016); upload e import ZIP con protezioni (US-020, US-112 upload); UI di configurazione di modelli e calendario (US-100/101 UI), gestione utenti (US-102), dizionari (US-103), creazione bozza (US-013); test E2E Playwright e axe; collaudo Docker.
- Impatto: i test T-015, T-016, T-022 (via UI) e i test E2E restano da fare; la logica di dominio e le API del vertical slice sono complete e testate.

### DEC-105 — Casi dimostrativi inventati accanto al portafoglio reale
- Data: 2026-10-02 · Autore: agente, su richiesta del cliente («inventa altri casi realistici se necessario»)
- Contesto: nel portafoglio reale tutte le 82 procedure sono della struttura «PN GDL (da assegnare)», i contratti non hanno fornitore e non ci sono SAL né pagamenti. Struttura, Fornitore e Amministrazione non avevano nulla da fare in demo; nessuna riprogrammazione era in attesa di approvazione.
- Decisione: il dataset `inapp` carica anche `seed/inapp/casi-demo.json` (6 procedure CD-01…CD-06, `procedures.dataset = 'casi-demo'`, fornitori fittizi, CIG `CIG-DEMO-CDxx`) con 8 PDF sintetici in `seed/inapp/casi-demo/` (`pnpm exec tsx scripts/generate-seed-documents.ts casi`). Le azioni iniziali passano dai comandi applicativi (`src/server/demo-cases.ts`): bozza BZ-001 creata da `struttura.si`, simulazioni RS-CD05-001 (bloccante) e RS-CD06-001 (senza criticità) create e inviate da `gare`. I dati reali non sono modificati.
- Copertura: Struttura (bozza, memoria in scadenza, verifica SAL), Ufficio Gare (accettazione SAL, quattro occhi), Validatore (conflitto OCR 183.600 vs 183.000 €, approvazione), Fornitore (SAL da presentare, accesso negato a contratto altrui), Amministrazione (fattura, liquidazione, pagamento in scadenza, storno), Direttore Generale (override su sforamento 2027/2028).
- Test: `tests/integration/casi-demo.test.ts`. L'oracle del dataset `scenarios` è invariato.
- Stato: attiva.

### DEC-106 — Guida demo per attore
- Data: 2026-10-02 · Autore: agente, su richiesta del cliente
- Decisione: percorso guidato per ciascuno dei 7 ruoli (5–9 passi) e aiuto contestuale di ogni pagina («sezioni» e «cosa puoi fare come <ruolo>»), in `src/ui/tour/content.ts`. Pannello non modale (`src/ui/tour/guided-tour.tsx`) con evidenziazione dell'elemento, avanzamento tra le pagine, tasto Esc per ridurre; stato solo nel browser (localStorage), nessuna API. Pagina `/guida` con la storia, i casi da usare e il cambio di attore (uscita e accesso, o impersonazione per l'amministratore); opzione «Avvia la guida» nel login (`/login?utente=<login>&guida=1`).
- Test: `e2e/guida.spec.ts` percorre tutti i passi di tutte le guide sul dataset `inapp` (server E2E dedicato sulla porta 3101) e verifica pagina, elemento evidenziato e accessibilità (axe WCAG 2.1 AA).
- Correzioni emerse durante la stesura: termine di verifica SAL e di pagamento ora letti dalla configurazione (prima fissi a 15/30 giorni); il RUP può rigettare un SAL e l'interfaccia mostra solo gli esiti consentiti al ruolo; storno dei pagamenti disponibile nell'interfaccia; l'assistente riconosce i codici CD-xx e BZ-xxx e propone esempi coerenti con il dataset.
- Stato: attiva.

### DEC-107 — Processo INAPP, Modulo 1: dalla programmazione alla stipula
- Data: 2026-10-02 · Autore: agente, su schema fornito dal cliente (`docs/design/schema-processo-inapp.webp`)
- Contesto: il cliente chiede che la demo segua lo schema di processo a corsie (Struttura richiedente, Ufficio Gare, Amministrazione / Contabilità, Fornitore) e fasi (0 Piano, 1 Fabbisogno e memoria, 2 Istruttoria e indizione, 3 Affidamento e contratto; 4–5 nel Modulo 2). Il RUP non è una corsia: è nominato con la determina di indizione.
- Decisione:
  - sei modelli `config/templates/M1-*.yaml` (famiglia `m1`) con un passo per riquadro dello schema, la corsia (`owner`, ora anche `SUPPLIER`), la fase (`stage`), le date chiave (`key`: memoria, indizione, aggiudicazione, stipula) e l'azione registrata con il passo (`action`). Generati da uno script una tantum; durate dimostrative `DA VALIDARE`;
  - variante A (affidamento diretto, ODA/TD MePA, ordinativo, adesione Consip): documenti richiesti all'operatore prima della determina di indizione, come nello schema; variante B (negoziate, aperta, accordo quadro): inviti, offerte e valutazione dopo l'indizione, requisiti verificati sull'aggiudicatario;
  - la famiglia dipende dal dataset: `inapp`, `casi-demo` e bozze utente → `m1`; `scenarios` → v1 (oracle invariato, nessuna DEV sull'oracle);
  - import del workbook: ogni passo eredita la data della prossima data chiave registrata (memoria, indizione, aggiudicazione, contratto); i passi intermedi sono dedotti;
  - azioni dei passi: operatore individuato (`procedures.operator_code`, migrazione 0003: il fornitore vede la pratica e svolge i passi della propria corsia), prenotazioni e impegni per annualità (totale ≤ programmato), aggiudicazione con importo IVA inclusa (netto/IVA al 22%, `DA VALIDARE`) che crea il contratto da stipulare, controfirma del fornitore che lo stipula; ogni azione è auditata (`STEP_*`);
  - solo l'owner del passo (il fornitore solo se è l'operatore della pratica) o il validatore registrano il passo;
  - interfaccia: barra delle fasi nella scheda, sezione **Iter** a corsie con il passo in corso e il modulo di registrazione, «Tocca a» nell'intestazione, riepilogo prenotazioni/impegni in Finanza; il Cronoprogramma rimanda all'Iter per la registrazione;
  - casi dimostrativi riscritti per fase (BZ-001 procedura guida; CD-01…CD-08 fermi a passi diversi) e guida con percorso per fasi su BZ-001 e cambio di attore dal pannello.
- Test: `tests/integration/casi-demo.test.ts` (corsie, permessi, prenotazioni, percorso completo BZ-001), `e2e/guida.spec.ts` (percorso per fasi svolto nel browser, con axe).
- Stato: attiva; modelli e aliquota `DA VALIDARE`.

### DEC-108 — Modulo 2 nascosto nella demo
- Data: 2026-10-02 · Autore: agente, su indicazione del cliente («nascondilo dalla demo»)
- Decisione: configurazione `modules.execution` (Amministrazione → Moduli visibili, auditata). Default: nascosto per il portafoglio reale, visibile per il dataset di collaudo (i test del demo script su SAL e pagamenti restano validi). Con il Modulo 2 nascosto non compaiono piano SAL, liquidazioni, pagamenti, indicatore «Pagato» e fasi 4–5; la barra delle fasi termina con «Contratto stipulato». Le funzioni restano nel codice e nei test.
- Stato: attiva.

### DEC-109 — Ruolo Validatore soppresso; correzione della classificazione ai ruoli di corsia
- Data: 2026-10-06 · Autore: agente, su indicazione del cliente («togli il ruolo»)
- Decisione:
  - il ruolo `VALIDATOR` e l'utente `validatore` non esistono più (modello, permessi, seed, login, tour, README); la migrazione `0004_remove_validator.sql` toglie l'utente dai database esistenti e riassegna all'Ufficio Gare le anomalie che avevano il Validatore come owner;
  - **coda di validazione soppressa** (pagina `/validazione`, rotte `/api/validations`, comando `decideValidation`, permesso `validation.decide`): i valori letti dai documenti (importi, date, CIG, piano SAL) vengono ancora estratti e conservati come evidenza nel database, ma non sono più mostrati né decisi da nessuno (la sezione «Valori letti dai documenti», aggiunta in un primo momento, è stata tolta su richiesta del cliente); non modificano i dati;
  - **correzione della classificazione** di un documento (tipo di atto ed eventuale spostamento in un'altra procedura) a Ufficio Gare e amministratore (permesso `document.classify`, rotta `POST /api/documents/classify`, comando `classifyDocument`): motivazione obbligatoria, audit `DOCUMENT_CLASSIFY` con prima/dopo, controllo object-level su procedura di origine e di destinazione;
  - **passi in demo** registrati dall'amministratore al posto dell'owner di corsia (non per il Fornitore, che resta riservato all'operatore della pratica);
  - le riprogrammazioni sono decise solo dal Direttore Generale (DEC-042 modificata); `documents.import` va a Ufficio Gare e amministratore.
- Motivo: il Validatore non compare nello schema di processo INAPP (quattro corsie).
- Effetti: superate le parti di US-022/US-023/US-080 che prevedono la decisione di un validatore sulle proposte; il test T-018 verifica ora la correzione della classificazione con audit. Il vincolo CHECK sui ruoli in `0001_init.sql` conserva il valore `VALIDATOR` ma nessuna riga può usarlo.
- Stato: attiva. Da confermare con INAPP se la correzione della classificazione debba spettare anche alla Struttura richiedente.

### DEC-110 — Decisione sulle riprogrammazioni (approvazione, rifiuto, override) all'Ufficio Gare
- Data: 2026-10-12 · Autore: agente, su indicazione del cliente («l'override va tolto al Direttore Generale e dato all'Ufficio Gare… metti tutto a Ufficio Gare»)
- Decisione:
  - il permesso `simulation.decide` passa da `EXECUTIVE` a `PROCUREMENT_OFFICER` e copre approvazione, rifiuto e override; il permesso separato `simulation.override` è abolito. Il Direttore Generale non decide più le riprogrammazioni (resta in sola lettura su portafoglio, alert e audit, con la sospensione dell'escalation);
  - l'override è ammesso solo se la simulazione ha criticità bloccanti (errore di validazione negli altri casi); con criticità bloccanti l'approvazione ordinaria è rifiutata;
  - restano i quattro occhi (DEC-042): chi ha creato o inviato la simulazione non può deciderla;
  - scheda procedura: all'Ufficio Gare compaiono «Approva» (o «Approva con override» se bloccante) e «Rifiuta»;
  - casi dimostrativi: le simulazioni RS-CD05-001 (bloccante) e quella di CD-06 sono inviate dall'Amministrazione, così l'Ufficio Gare può deciderle; guida demo e test aggiornati.
- Motivo: indicazione del cliente sulla ripartizione dei poteri.
- Effetti: DEC-042 e DEC-109 modificate (la riga «le riprogrammazioni sono decise solo dal Direttore Generale» non è più valida); matrice dei permessi della guida §7.3 aggiornata; test `[DEC-042, DEC-110]` e `[DEC-110]` in `tests/api/commands.test.ts`.
- Stato: attiva. Rischio da confermare con INAPP: se a proporre è l'unico utente dell'Ufficio Gare, nessuno può decidere (quattro occhi); nella demo propone l'Amministrazione, in produzione servirebbe un secondo utente dello stesso ruolo.

### DEC-111 — Evoluzione del flusso della Struttura: quadro economico, capitolato, alert per tipo, progetto, KPI, assistente AI
- Data: 2026-10-15 · Autore: agente, su elenco di richieste del cliente (riunione di revisione)
- Richieste e default adottati (tutti `DA VALIDARE`, ricavati dal workbook `seed/inapp/workbook_PN_GDL.xlsx` dove possibile):
  1. **Quadro economico prima della memoria** (incremento 1, **fatto**): la bozza chiede la base di gara IVA esclusa, l'aliquota (22 %), la tassa gara (importo inserito dalla Struttura: nel workbook le fasce si sovrappongono e dipendono dal tipo di procedura), la presenza del DEC e la percentuale degli incentivi per funzioni tecniche (2 % della base, tetto D.Lgs. 36/2023 art. 45; nel workbook ≈ 1,6 % = 2 % × 80 % al personale, 20 % al fondo innovazione). L'**importo a disposizione della struttura** = contratto IVA inclusa + tassa gara + incentivi ed è il «programmato». Calcolo nel dominio (`src/domain/economic-frame.ts`), anteprima via `POST /api/procedures/economic-frame`, colonne in migrazione `0005_economic_frame.sql`; tassa e incentivi entrano in `costComponents` (riconciliazione DEC-035). Le procedure importate non hanno quadro (`base_cents` nullo). Il percorso con il solo `programmed` resta valido per seed e test.
  2. **Capitolato insieme alla memoria** (incremento 2): nel workbook la data è «memoria/capitolato»; il capitolato diventa documento atteso `CAPITOLATO` con la memoria e va caricato nel modulo di consegna. Da confermare: obbligatorio per tutte le procedure o solo per quelle con bando, e se blocca la consegna.
  3. **Alert alla Struttura per tipo di procedura** (incremento 3): il workbook calcola la data di memoria/capitolato come avvio attività − 9, 7, 4 o 1 mese a seconda della durata della procedura (e un alert un mese prima). Oggi gli anticipi sono uguali per tutti (T−10, T−5). Da fare: anticipi configurabili per modello.
  4. **Progetto** (incremento 4): ogni gara collegata a un progetto. Default: il progetto è l'«Operazione / Attività» del workbook (es. «Operazione 1 – Attività 5»), già presente su `procedures.operation`; da promuovere a entità con codice e filtro. Da confermare se serve un budget proprio.
  5. **KPI per gara e importi di gara** (incremento 5): base d'asta, aggiudicato, ribasso (nel workbook «Importo Base d'asta», «Importo Aggiudicato», «Delta»), programmato, a disposizione; viste per Direttore Generale, Ufficio Gare e Struttura. Da definire l'elenco con il cliente.
  6. **Assistente AI alla memoria** (incremento 6): opzionale, spento di default, solo testo proposto e rivisto dalla Struttura; mai importi, date, stati o simulazioni (regola del progetto).
- Ordine: 1 (fatto), 2, 3, 4, 5, 6.
- Effetti dell'incremento 1: test `[DEC-111]` in `tests/unit/economic-frame.test.ts` e `tests/api/admin.test.ts`; nuova pagina `/procedure/nuova` con riquadro del quadro economico; scheda procedura con «Quadro economico»; guida demo aggiornata. `expected_results.json` e le 12 procedure dell'oracle non cambiano.
- Stato: attiva; da validare con INAPP (aliquota, percentuale incentivi, tassa gara, capitolato obbligatorio, definizione di «progetto»).

### DEC-112 — Database: da better-sqlite3 locale a @libsql/client (Turso in produzione Vercel)
- Data: 2026-10-23 · Autore: agente
- Contesto: il cliente ha chiesto di pubblicare la demo anche su Vercel, dove le funzioni serverless non hanno un disco persistente tra un'invocazione e l'altra. Il file SQLite locale (`better-sqlite3`, DEC-096) non può quindi restare l'unico backend.
- Decisione: sostituito `better-sqlite3` con `@libsql/client`, che parla lo stesso protocollo SQLite sia in locale (file `./.data/inapp.db` o `:memory:` nei test, tramite `TURSO_DATABASE_URL` assente) sia da remoto (Turso, tramite `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`). Il client è asincrono: `src/infrastructure/db/connection.ts` espone `Db.prepare(sql).get/all/run()` come metodi `async`, e `tx()` usa le transazioni interattive di libSQL passando al callback un `Db` scoped alla transazione (da usare al posto di quello esterno). Questo ha richiesto di rendere `async` ogni funzione dell'app che tocca il database (`src/infrastructure/repo`, `src/application`, `src/server`, pagine e route di `src/app`, `worker/main.ts`, `cli/main.ts`, i test).
- Effetti: `Clock.referenceDate()` resta sincrono per il dominio (DEC-002) risolvendo la data una sola volta per richiesta in `dbClock()` (asincrono) invece di interrogare il DB a ogni chiamata. Sviluppo locale e Docker restano su un file SQLite locale, invariati nel comportamento; su Vercel l'ambiente imposta `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (Turso DB creato manualmente dal cliente, non dall'agente). `cli backup` (VACUUM INTO) resta disponibile solo con DB locale.
- Rischio noto, da verificare: su una connessione remota (HTTP) ogni `client.execute()` è una connessione logica a sé, quindi i `PRAGMA` di sessione (foreign_keys, busy_timeout) impostati in `openDb()` non persistono fra chiamate isolate fuori da una transazione esplicita; `tx()` apre invece una transazione interattiva reale. Da confermare con un test di carico su Turso prima del go-live.

### DEC-113 — Storage dei documenti caricati: Vercel Blob (privato) accanto al disco locale
- Data: 2026-10-23 · Autore: agente
- Contesto: conseguenza di DEC-112 — anche i documenti caricati a runtime (tag `storage:<sha256>` in `documents.file_path`) necessitano di uno storage persistente fra invocazioni su Vercel.
- Decisione: nuovo adapter `src/infrastructure/documents/storage.ts`, scelto in base alla presenza di `BLOB_READ_WRITE_TOKEN`: se assente, disco locale (comportamento invariato per Docker/dev); se presente, Vercel Blob con `access: "private"` (mai una URL pubblica esposta al client: il contenuto passa sempre dal server, che applica l'autorizzazione object-level di `requireProcedure` prima di leggerlo). I documenti del seed (tag `inapp:`/`casi:`/percorso relativo agli scenari) restano file locali in bundle, mai scritti a runtime, quindi non passano da questo adapter. `extractPdfText`/`ocrPdfPages` accettano ora un `Buffer` oltre a un percorso, per evitare di dover scrivere su disco i documenti letti dall'adapter.
- Effetti: `.data/tesscache` (cache locale di tesseract.js) diventa `/tmp/tesscache` quando `process.env.VERCEL` è impostato, perché la root del progetto è di sola lettura su Vercel.
- Da fare manualmente dal cliente/titolare del progetto Vercel: creare uno store Vercel Blob e collegarlo al progetto (imposta `BLOB_READ_WRITE_TOKEN` automaticamente).

### DEC-114 — Dataset pubblicato su Vercel: solo "scenarios", mai il portafoglio reale
- Data: 2026-10-23 · Autore: agente
- Contesto: `seed/inapp/` (il portafoglio reale PN GDL e i documenti reali, DEC-071) è versionato nel repository (DEC-071). Il deployment Vercel è alimentato dal repository Git: pubblicare il progetto così com'è renderebbe accessibili i dati reali. Da decidere prima del deploy: escludere `seed/inapp/` dal repository collegato a Vercel oppure accettarne la pubblicazione.
- Decisione: la variabile d'ambiente del progetto Vercel imposta `DEMO_DATASET=scenarios` (le 12 procedure sintetiche dell'oracle, già versionate). Il default di `datasetName()` resta `"inapp"` per Docker/sviluppo locale, dove `seed/inapp/` è presente su disco: nessuna modifica al codice, solo alla configurazione d'ambiente di Vercel.
- Effetti: su Vercel l'amministratore non può scegliere il portafoglio reale dal pannello di reset demo (l'opzione esiste nell'interfaccia ma fallirebbe per file assenti): da segnalare come limitazione nota della demo pubblica, oppure nascondere l'opzione quando `process.env.VERCEL` è impostato (non fatto in questo incremento).
- Stato: attiva; valutare con il cliente se pubblicare comunque un sottoinsieme anonimizzato del portafoglio reale per la demo pubblica.

### DEC-115 — Database: da @libsql/client (Turso) a Postgres (Vercel Postgres/Neon)
- Data: 2026-10-23 · Autore: agente
- Contesto: il cliente preferisce non creare un account su un servizio terzo separato (Turso) e usare invece un database provisionato direttamente dal pannello Vercel (prodotto "Postgres", basato su Neon, stesso login). Sostituisce DEC-112.
- Decisione: `@libsql/client` sostituito con `pg` (Pool). `src/infrastructure/db/connection.ts` traduce i placeholder SQLite/libSQL (`?` posizionali, `@nome` nominali con un oggetto singolo) in placeholder posizionali Postgres (`$1, $2, ...`), così i ~246 call site `db.prepare(sql).get/all/run(...)` non sono stati toccati singolarmente. Le INSERT senza `RETURNING` ottengono `RETURNING id` in automatico quando la tabella di destinazione ha una colonna `id` (elenco statico `NO_ID_TABLES` per le tabelle con altra chiave primaria). `tx()` usa una connessione del pool con `BEGIN/COMMIT/ROLLBACK`.
- Schema (`db/migrations/0001`, `0005`): `id INTEGER PRIMARY KEY` → `id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; tutte le colonne `*_cents` passate da `INTEGER` a `BIGINT` (SQLite trattava `INTEGER` come intero a 64 bit a prescindere dalla dichiarazione; Postgres no — rischio di overflow silenzioso su importi > 2,1 miliardi di centesimi altrimenti); `CHECK (typeof(x)='integer' AND ...)` → solo il vincolo di valore (il tipo di colonna basta); `CHECK (x IS date(x))` → `CHECK (x ~ '^\d{4}-\d{2}-\d{2}$')`; `CHECK (json_valid(x))` → `CHECK (x::json IS NOT NULL)` mantenendo la colonna `TEXT` (non `JSONB`) così il driver continua a restituire una stringa e il codice applicativo (`JSON.parse(...)`) non cambia.
- Trigger (`db/sql/triggers.sql`): i 9 trigger `BEFORE UPDATE/DELETE ... RAISE(ABORT, ...)` diventano funzioni PL/pgSQL + `CREATE TRIGGER ... EXECUTE FUNCTION`. Le WHEN clause di Postgres non ammettono subquery: il controllo su `system_meta.reset_in_progress` (prima nella WHEN) è stato spostato nel corpo della funzione (`IF ... THEN RAISE EXCEPTION`); l'unica WHEN rimasta (`trg_version_no_update`, confronto fra OLD/NEW) resta nativa. `missingTriggers()` interroga `pg_trigger` invece di `sqlite_master`.
- Ricerca full-text (`procedure_search`): la virtual table FTS5 diventa una tabella normale con colonna generata `search_vector TSVECTOR` (`to_tsvector('simple', ...)`) e indice GIN; la query in `src/server/queries.ts` usa `@@ to_tsquery('simple', ...)` con suffisso `:*` per il prefix match (equivalente al `"term"*` di FTS5).
- Le 21 `INSERT OR IGNORE`/`INSERT OR REPLACE` sono diventate `INSERT ... ON CONFLICT (<chiave unica della tabella>) DO NOTHING/DO UPDATE SET ...`.
- Un solo database Postgres per sviluppo locale, test e produzione (scelta del cliente): niente SQLite locale, niente `:memory:`. `tests/helpers/db.ts` (`truncateAll`) svuota tutte le tabelle (`TRUNCATE ... RESTART IDENTITY CASCADE`) prima di ogni seed di test, dato che il DB è persistente e condiviso fra esecuzioni; `vitest.config.ts` imposta `fileParallelism: false` perché più file di test non possono più girare in parallelo su un solo database condiviso.
- Rimosso il comando `cli backup` (`VACUUM INTO`, specifico di SQLite/file locale): da sostituire con il backup/branching nativo di Neon/Vercel Postgres.
- **Rischio noto, non risolto in questo incremento**: la suite di test (`tests/api/commands.test.ts`, `tests/integration/oracle-db.test.ts`, `tests/integration/inapp-import.test.ts`, `tests/integration/perf-reset.test.ts`) va in timeout contro il Postgres remoto condiviso (hook `beforeAll`/test oltre 10-300 s), perché il seed esegue molte INSERT singole in sequenza e ogni round trip di rete costa ordini di grandezza più di una SQLite in memoria. Il test NFR-002/NFR-003 (1.000 procedure, soglia p95 ≤ 2 s) non è più verificabile così com'è contro un database remoto. Da valutare: batch insert nel seed loader, timeout di test più alti, o un'istanza Postgres locale solo per CI/test pur mantenendo Neon in produzione.
- Stato: attiva; il rischio sopra resta da chiudere prima di considerare il porting completo.
