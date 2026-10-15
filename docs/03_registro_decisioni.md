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
