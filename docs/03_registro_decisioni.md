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

### DEC-111 — Evoluzione del flusso della Struttura: quadro economico, capitolato, alert per tipo, progetto, KPI, assistente AI e dashboard
- Data: 2026-10-15 · Autore: agente, su elenco di richieste del cliente (riunione di revisione)
- Richieste e default adottati (tutti `DA VALIDARE`, ricavati dal workbook `seed/inapp/workbook_PN_GDL.xlsx` dove possibile):
  1. **Quadro economico prima della memoria** (incremento 1, **fatto**): la bozza chiede la base di gara IVA esclusa, l'aliquota (22 %), la tassa gara (importo inserito dalla Struttura: nel workbook le fasce si sovrappongono e dipendono dal tipo di procedura), la presenza del DEC e la percentuale degli incentivi per funzioni tecniche (2 % della base, tetto D.Lgs. 36/2023 art. 45; nel workbook ≈ 1,6 % = 2 % × 80 % al personale, 20 % al fondo innovazione). L'**importo a disposizione della struttura** = contratto IVA inclusa + tassa gara + incentivi ed è il «programmato». Calcolo nel dominio (`src/domain/economic-frame.ts`), anteprima via `POST /api/procedures/economic-frame`, colonne in migrazione `0005_economic_frame.sql`; tassa e incentivi entrano in `costComponents` (riconciliazione DEC-035). Le procedure importate non hanno quadro (`base_cents` nullo). Il percorso con il solo `programmed` resta valido per seed e test.
  2. **Capitolato insieme alla memoria** (incremento 2, **fatto**, 2026-11-02): nel workbook la data è «memoria/capitolato»; il capitolato diventa documento atteso `CAPITOLATO` con la memoria e va caricato nel modulo di consegna. Implementazione (default `DA VALIDARE`): il capitolato è il documento di tipo `DOCUMENTO_TECNICO` (etichetta «Documento tecnico (capitolato)»); il modulo di consegna ha due caricamenti (memoria e capitolato) con elenco dei documenti presenti, e il tipo scelto nel modulo prevale sulla classificazione dal nome del file; per le bozze con quadro economico la consegna è **bloccata** finché non è caricato il capitolato (`submitMemory`, 422), mentre procedure importate e bozze con solo programmato non hanno il vincolo. Da confermare con il cliente: obbligatorio per tutte le procedure o solo per quelle con bando.
  3. **Alert alla Struttura per tipo di procedura** (incremento 3, **fatto**, 2026-11-03): il workbook calcola la data di memoria/capitolato come avvio attività − 9, 7, 4 o 1 mese a seconda della durata della procedura (e un alert un mese prima). Oggi gli anticipi sono uguali per tutti (T−10, T−5). Implementazione (default `DA VALIDARE`): la policy della milestone di consegna della memoria è scelta dal modello (campo `alertPolicy` del YAML) in base alla durata: `MEMORY_SHORT` (M1-AD, 1 mese: T-10, T-5, T-2, T0, T+1), `MEMORY` (M1-FA-ADH 2 mesi e M1-NEG-PB 4 mesi: come prima, con T-1M) e `MEMORY_LONG` (M1-NEG-OEPV 7, M1-FA e M1-OPEN 9 mesi: in più T-2M). I modelli v1 di collaudo e l'oracle restano sulla policy `MEMORY`. I livelli sono mostrati in Amministrazione › Modelli. Test `[DEC-111]` in `tests/unit/alerts-memory.test.ts`. Da confermare con il cliente soglie e gruppi di durata.
  4. **Progetto** (incremento 4, **fatto**, 2026-11-03): ogni gara collegata a un progetto. Default: il progetto è l'«Operazione / Attività» del workbook (es. «Operazione 1 – Attività 5»), già presente su `procedures.operation`; da promuovere a entità con codice e filtro. Implementazione (default `DA VALIDARE`): tabella `projects` (codice, nome, attivo) e colonna `procedures.project_code` (migrazione `0006_projects.sql`); il codice è `OP<nn>-A<attività>` ricavato dall'Operazione/Attività del workbook (`src/domain/project.ts`, stessa regola in SQL per le procedure già caricate). La bozza richiede il progetto quando il catalogo non è vuoto (scelta nel modulo, 422 altrimenti); l'amministratore può aggiungere progetti (`POST /api/admin/projects`, auditato); il portafoglio ha il filtro «Progetto» (anche negli export) e la scheda procedura mostra il progetto. La bozza guida BZ-001 usa il progetto `DEMO`. Il reset della demo ricarica il catalogo dal dataset. Da confermare con il cliente: serve un budget proprio per progetto? e KPI per progetto (incremento 5).
  5. **KPI per gara e importi di gara** (incremento 5, **fatto**, 2026-11-03): base d'asta, aggiudicato, ribasso (nel workbook «Importo Base d'asta», «Importo Aggiudicato», «Delta»), programmato, a disposizione; viste per Direttore Generale, Ufficio Gare e Struttura. Implementazione (default `DA VALIDARE`): nuova pagina «KPI gare» (`/kpi-gare`, voce di menu per tutti i ruoli tranne il fornitore) con, per ogni gara del perimetro dell'utente, base di gara (IVA esclusa), aggiudicato (netto del contratto), ribasso e programmato (= importo a disposizione della struttura, DEC-111 punto 1), più i totali; filtri per progetto e fase. La base è quella inserita nella bozza; per le procedure importate, dove il workbook non riporta la base d'asta, è ricavata dal programmato come (programmato − tassa gara − incentivi) / (1 + IVA) e segnata con ≈. Il ribasso è (base − aggiudicato) / base in centesimi di punto, ROUND_HALF_UP, negativo se l'aggiudicato supera la base; il totale è ponderato sulle sole gare aggiudicate. Calcoli in `src/domain/gara-kpi.ts` (interi, nessun `number`), lettura in `garaKpiList` (stesso perimetro di `listProcedures`). Il perimetro è unico: il Direttore Generale vede tutte le gare, l'Ufficio Gare quelle del suo ambito, la Struttura le sue; non ci sono viste distinte. Test `[DEC-111]` in `tests/unit/gara-kpi.test.ts` e `tests/api/gara-kpi.test.ts`. Da confermare con il cliente: elenco definitivo dei KPI (economia di gara, KPI per progetto, altri indicatori fisici e finanziari della dashboard), viste per ruolo ed export.
  6. **Assistente AI alla memoria** (incremento 6, **fatto nella parte senza provider esterno**, 2026-11-03): opzionale, spento di default, solo testo proposto e rivisto dalla Struttura; mai importi, date, stati o simulazioni (regola del progetto). Implementazione (default `DA VALIDARE`): punto di aggancio opzionale, **spento di default** (`config.llm.provider`: `disabled` | `template`), attivabile dall'amministratore in Amministrazione (`PUT /api/admin/config/assistant`, auditato). Con `template` la Struttura vede, nella sezione «Consegna della memoria» della bozza, il pulsante «Proponi il testo della memoria» (`POST /api/procedures/<codice>/memory/draft-text`): uno schema di testo **locale e deterministico** (`src/domain/memory-draft.ts`) costruito solo con oggetto, struttura, progetto e tipo di procedura, con segnaposto da completare; non contiene importi, date né stati, non salva nulla e porta l'avviso di trasparenza (AI Act art. 50). Solo STRUCTURE_USER e ADMIN, solo per la bozza; l'uso è nell'audit senza il contenuto. **Nessun modello linguistico reale è collegato**: DEC-082 e la guida §2 vietano un provider LLM finché non è deciso D-07 (provider qualificato, residenza dei dati, DPIA, minimizzazione); l'aggancio è `src/application/memory-assistant.ts`, dove un nuovo provider si aggiungerebbe dietro lo stesso confine. Test `[DEC-111]` in `tests/unit/memory-draft.test.ts` e `tests/api/memory-assistant.test.ts`. Da decidere con il cliente: D-07 per un LLM reale.
  7. **Revisione della dashboard dei KPI** (richiesta raccolta il 2026-11-04; non implementabile senza il dettaglio degli indicatori): rivedere la pagina iniziale includendo indicatori fisici e finanziari. La dashboard attuale mostra già conteggio e salute delle procedure, ritardi, riprogrammazioni, alert critici, programmato, contrattualizzato, pagato (se il Modulo 2 è attivo), importo a rischio, fabbisogno per annualità e procedure per fase. **Da chiedere/confermare con INAPP:** elenco definitivo degli indicatori, definizioni/formule e filtri o viste per ruolo. Non aggiungere KPI per supposizione; alla ricezione delle specifiche, registrare i valori e i criteri di accettazione prima dell'implementazione.
- Ordine: 1, 2, 3, 4, 5, 6 (tutti implementati; per il 6 resta da decidere D-07 per un LLM reale); 7 in attesa dei KPI richiesti dal cliente.
- Effetti dell'incremento 1: test `[DEC-111]` in `tests/unit/economic-frame.test.ts` e `tests/api/admin.test.ts`; nuova pagina `/procedure/nuova` con riquadro del quadro economico; scheda procedura con «Quadro economico»; guida demo aggiornata. `expected_results.json` e le 12 procedure dell'oracle non cambiano.
- Stato: attiva; richieste 1–6 implementate con le condizioni e i default descritti sopra; da validare con INAPP (aliquota, percentuale incentivi, tassa gara, obbligatorietà del capitolato e definizione di «progetto»). La richiesta 7 resta in attesa dell'elenco KPI del cliente.

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

### DEC-116 — Migrazioni serializzate con advisory lock
- Data: 2026-10-23 · Autore: agente
- Contesto: su Vercel più avvii a freddo concorrenti possono chiamare `migrate()` sullo stesso database e i DDL concorrenti falliscono con «tuple concurrently updated».
- Decisione: `migrate()` prende un `pg_advisory_lock` di sessione (`src/infrastructure/db/connection.ts`); chi arriva dopo attende e trova tutto già applicato.
- Stato: attiva.

### DEC-117 — Distribuzione su Vercel, Docker rimosso, correzioni di porting
- Data: 2026-11-02 · Autore: agente
- Contesto: la demo è pubblicata su Vercel con database Postgres (Neon) e storage Vercel Blob (DEC-112…DEC-116); su questa macchina Docker non è mai stato installato (DEC-100).
- Decisione: rimossi `Dockerfile` e `docker-compose.yml`; avvio locale con `pnpm install && pnpm db:bootstrap && pnpm dev`, reset con `pnpm db:reset` o dalla pagina Amministrazione. Variabili di ambiente su Vercel: `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `DEMO_DATASET`, `DEMO_PASSWORD`, `SESSION_SECRET`, `APP_REFERENCE_DATE`, `APP_ALLOWED_ORIGINS` (origini ammesse dal controllo CSRF, altrimenti ogni salvataggio è rifiutato) e `COOKIE_SECURE=1`. Il dataset `inapp` è incluso nel bundle (`seed/inapp/**` in `outputFileTracingIncludes`) e `maxDuration` è portato a 60 s su layout, login e reset per il primo caricamento su DB vuoto.
- Correzioni di porting: ogni chiamata asincrona nelle rotte `/api/*` è attesa con `await` (prima la risposta partiva prima del commit su Postgres e la scrittura si perdeva su Vercel: consegna della memoria, alert, SAL, riprogrammazioni…); `worker/main.ts` usa `ON CONFLICT (dedupe_key) DO NOTHING`; il modulo del passo in corso si ricrea a ogni cambio di passo.
- Guida demo: i passi del percorso per fasi e quelli delle guide per attore dichiarano il passo atteso (`expect`); il pannello avvisa se la pratica è più avanti, più indietro o a un altro passo e propone il passo corrispondente.
- Documenti `02`, `06` e ADR-0001: segnati come storici per SQLite e Docker; sezioni operative su container rimosse.
- Stato: attiva. Rischio noto: la suite di test non è stata rieseguita su Postgres (serve un database di test dedicato: i test svuotano le tabelle).

### DEC-118 — Rimozione di DEC e incentivi dal quadro economico delle nuove bozze
- Data: 2026-11-04 · Autore: agente, su richiesta del cliente
- Contesto: il cliente chiede di togliere il DEC; alla domanda di chiarimento ha confermato di rimuovere sia il campo DEC sia il calcolo degli incentivi dal quadro economico.
- Decisione: per le nuove bozze il totale programmato è contratto IVA inclusa + tassa gara. Rimuovere il controllo DEC e i relativi calcoli da UI, anteprima, API e schema della memoria. Le colonne `has_dec`, `incentive_pct_hundredths` e `incentive_cents` restano nello schema per compatibilità e non vengono riscritte; i record e gli importi storici restano invariati. Se un totale storico differisce dalla formula corrente, la scheda lo mostra come importo registrato, senza ricalcolarlo né esporre i vecchi componenti. I KPI continuano a considerare i componenti già presenti nei record legacy per mantenere la riconciliazione.
- Alternative scartate: azzerare o ricalcolare i record esistenti, perché cambierebbe la storia finanziaria e potrebbe alterare baseline, previsioni e dati effettivi.
- Configurabile: no.
- Stato: superata da DEC-119.
- Impatto su test/oracle: aggiornati i test unitari del quadro economico e della memoria e il test API di creazione; `expected_results.json` e il dataset oracle restano invariati. La verifica del test API richiede un database isolato.

### DEC-119 — Scelta esplicita e controllo degli incentivi per funzioni tecniche
- Data: 2026-11-05 · Autore: agente, su richiesta del cliente
- Contesto: il requisito successivo chiede di sostituire la scelta precedente con Sì/No/Da verificare, calcolo deterministico e controllo della determina di indizione. Questa decisione supera DEC-118 e aggiorna la parte del quadro economico di DEC-111 relativa agli incentivi.
- Decisione: la Struttura richiedente sceglie in fase 0; con Sì inserisce la percentuale effettiva, inizialmente vuota. Importo = percentuale × base di gara IVA esclusa. Oltre 2% si mostra un avviso non bloccante, senza applicare un default del 2%. Decisione, percentuale, importo e configurazione sono conservati nelle versioni, inclusa la baseline alla consegna della memoria, e registrati nell'audit.
- Disponibilità e riparto: default configurabile `incentivesReduceAvailable=false`: gli incentivi si sommano a contratto IVA inclusa e tassa gara. È la scelta reversibile che preserva il comportamento preesistente; l'eventuale sottrazione va confermata con INAPP. Il riparto annuale deve uguagliare l'importo a disposizione della struttura dopo l'applicazione della configurazione.
- Controlli: dopo la determina di indizione, Sì senza calcolo produce un'anomalia non bloccante; un calcolo presente è confrontato con prenotazione, oppure impegno se presente; No non produce anomalie; Da verificare produce una segnalazione non bloccante. Il modello dei movimenti non distingue la quota incentivi: perciò il confronto usa la somma degli impegni, se presenti, altrimenti delle prenotazioni. L'estrazione propone importo e fonte documento/pagina, ma non modifica dati senza validazione umana.
- Ambito escluso: riparto fra il personale, percentuali per funzione e liquidazione. Non si presume chi decide la previsione, né una dipendenza dal DEC per servizi/forniture.
- Dati demo: S18-DEMO e il caso sintetico senza calcolo usano importi dichiarati fittizi; S18-DEMO riusa il CIG richiesto per mostrare il caso, mentre la riga reale OP04-S18 resta invariata.
- Migrazione: la migrazione trasferisce la scelta storica sulle procedure e rimuove `has_dec`; non riscrive versioni append-only né ricalcola dati effettivi. Le nuove versioni, inclusa la baseline, salvano lo snapshot degli incentivi.
- Stato: implementazione in corso, da completare con test e collaudo su database isolato.

### DEC-120 — Ribasso significativo solo per le gare competitive (variante B)
- Data: 2026-11-12 · Autore: agente, su osservazione del cliente («voglio KPI significativi»)
- Contesto: la pagina «KPI gare» (DEC-111 punto 5) pondera il ribasso medio su tutte le gare aggiudicate indipendentemente dal tipo di procedura. Nella variante A dello schema di processo (DEC-107: affidamento diretto, trattativa diretta MePA, ordine MePA, ordinativo/adesione Consip) non c'è una base di gara concorrenziale: la base è quasi sempre ricavata dal programmato (`baseDerived`) e il ribasso non misura nulla di competitivo, mescolato com'era con la variante B (negoziata, aperta, accordo quadro) rendeva il KPI aggregato fuorviante.
- Decisione: il ribasso (per gara e nei totali ponderati) è calcolato solo per le procedure competitive — `NEGOTIATED`, `OPEN`, `FRAMEWORK_AGREEMENT` — ed è sempre nullo per `DIRECT_AWARD`, `DIRECT_AWARD_MEPA`, `MEPA_ORDER`, `CENTRAL_PURCHASING_ORDER`, anche quando base e aggiudicato sono presenti. I totali di volume (programmato, base, aggiudicato, numero di gare/aggiudicate) restano calcolati su tutte le procedure. Nuovo campo `GaraTotals.competitiveAwardedCount` per etichettare la base di ponderazione in UI. `/kpi-gare` aggiunge: filtro «Tipo di gara», una tabella di riepilogo per tipo (con «—» e tooltip sul ribasso per la variante A) e l'etichetta del KPI «Ribasso medio» con il numero di gare competitive su cui è calcolato.
- Dominio: `src/domain/gara-kpi.ts` (`isCompetitiveProcedureType`, `GaraKpi.competitive`); lettura in `garaKpiList` (`src/server/queries.ts`), che ora espone anche `byType`.
- Alternative scartate: nascondere del tutto il ribasso per la variante A invece di mostrare «—» con tooltip, perché l'utente perderebbe il motivo dell'assenza del dato.
- Configurabile: no (la classificazione per variante è quella già fissata da DEC-107).
- Test: `[DEC-120]` in `tests/unit/gara-kpi.test.ts` e `tests/api/gara-kpi.test.ts`. `expected_results.json` e il dataset oracle non cambiano.
- Due nuovi KPI, scelti perché calcolabili senza nuovi dati (richiesta del cliente di KPI significativi):
  1. **Spesa su gara competitiva**: quota del programmato che passa da gare negoziate, aperte o ad accordo quadro, sul totale programmato (`GaraTotals.programmedCompetitive`, `competitiveProgrammedShareHundredths`). Segnala se il ricorso all'affidamento diretto/MePA/Consip è marginale o prevalente.
  2. **Giorni indizione → aggiudicazione**: distanza fra le date effettive delle milestone chiave `INDICTION` e `AWARD` (comuni a tutti i modelli M1 e all'oracle v1, DEC-107), media sulle procedure in cui entrambe sono registrate (`awardDurationDays`, `averageAwardDurationDays` in `src/domain/gara-kpi.ts`; lettura via tabella `milestones` in `garaKpiList`). Nullo finché una delle due date manca.
  Scartato per ora: numero di offerenti/concorrenza per gara, perché non è un campo tracciato né nel modello né nell'import del workbook — richiederebbe una nuova raccolta dati, non solo un nuovo KPI.
- Seconda sezione KPI finanziari per tipo di gara (stessa richiesta del cliente): programmato, contrattualizzato, pagato, residuo, importo a rischio, procedure in ritardo e per livello di salute (RED/AMBER/GREEN), raggruppati per tipo di procedura. Dati già tracciati in `procedure_snapshot` (stessi usati dalla dashboard DEC-070/US-070), solo raggruppati per tipo invece che aggregati sul portafoglio. Nuova funzione `financialKpiByType` (`src/server/queries.ts`): somme su interi (`*_cents`) in SQL, nessuna media né divisione sugli importi; stesso perimetro e stessi filtri (progetto/fase/tipo) della sezione sopra. Aggiunta alla stessa pagina `/kpi-gare`, sotto la sezione esistente.
- Test: `[DEC-120]` anche in `tests/api/gara-kpi.test.ts` (perimetro, somma dei totali per tipo, filtro per tipo).
- Terza revisione (stessa sessione, su richiesta del cliente: «non voglio una sezione gare, voglio tutti i KPI in dashboard, niente ridondanze, meno tabelle, filtro principale tipo di gara poi struttura»): la pagina «KPI gare» (`/kpi-gare`) è eliminata — route, voce di menu e aiuto guidato dedicato rimossi — e i suoi KPI confluiscono nella dashboard (`/`):
  - La dashboard ha ora due filtri, tipo di gara (principale) e struttura, che ricalcolano tutta la pagina; niente più tabella di riepilogo per tipo (quella informazione è ora il filtro stesso: senza selezione i KPI mostrano i totali di portafoglio, con un tipo selezionato mostrano quel tipo).
  - Sezione «Indicatori principali»: alle metriche di processo già presenti (procedure monitorate, in ritardo, da riprogrammare, alert critici) si aggiungono le numeriche di gara (gare aggiudicate, ribasso medio, spesa su gara competitiva, giorni indizione → aggiudicazione).
  - Nuova sezione «KPI finanziari», più in dettaglio: programmato, base di gara, contrattualizzato, aggiudicato, pagato (o contratti stipulati), importo a rischio — stesso perimetro filtrato. Niente duplicazione: ogni importo compare una sola volta, qui, non più nella sezione principale.
  - Tabella elenco gare e tabella «per tipo di gara» (ex `/kpi-gare`) rimosse dalla dashboard: il dettaglio riga per riga resta nel portafoglio (`/portafoglio`, che già supporta i filtri `type`/`structure`) e nella scheda procedura. Ogni card della dashboard porta al portafoglio con **gli stessi filtri attivi** (tipo/struttura, più il filtro proprio della card quando esiste, es. `health=RED`); il portafoglio ha un pulsante «← Torna alla dashboard» che riporta allo stesso filtro.
  - `dashboard()` (`src/server/queries.ts`) accetta ora anche il filtro `type`; `financialKpiByType` accetta anche `structure`, per condividere lo stesso perimetro con `garaKpiList`.
  - Visibilità: come già per `/kpi-gare`, i fornitori non vedono le numeriche di gara né i KPI finanziari di dettaglio in dashboard (continuano a vedere solo gli indicatori di processo e i totali finanziari aggregati che vedevano già).
- Quarta revisione (stessa sessione): filtri applicati al cambio, senza pulsante «Applica» (dashboard e portafoglio), tramite `AutoSubmitSelect` (`src/ui/auto-submit.tsx`, client minimale, `requestSubmit()` al cambio valore); nel portafoglio la ricerca testuale ha un pulsante «Cerca» dedicato sulla riga sopra, gli altri filtri a tendina sono scesi sulla riga sotto. I chip dei filtri attivi nel portafoglio mostrano l'etichetta italiana (es. «Tipo: Trattativa diretta MePA») invece della coppia chiave/valore grezza; «Azzera filtri» è un pulsante secondario, non un link nudo, in entrambe le pagine. «Procedure per fase» in dashboard è diventata una card KPI per fase (come le altre, click → portafoglio filtrato) invece di una tabella.
- Stato: attiva.

### DEC-121 — Panoramica gare: attive, da avviare, richieste di riprogrammazione, per tipo
- Data: 2026-11-12 · Autore: agente, su richiesta del cliente («informazioni più generiche sulle gare: quante attive, quante per tipo con istogramma, quante da avviare, quante richieste per gara»)
- Decisione (default `DA VALIDARE`, nessuno di questi quattro concetti aveva una definizione già fissata altrove):
  1. **Gare attive** = procedure con fase diversa da Bozza, Chiusa e Annullata (`status NOT IN ('DRAFT','CLOSED','CANCELLED')`): in corso, non ancora avviate o già concluse.
  2. **Gare da avviare** = procedure ancora in Bozza (`status = 'DRAFT'`), cioè prima che la struttura abbia anche solo richiesto la memoria.
  3. **Gare per tipo**: istogramma (nuovo componente `TypeChart`, `src/ui/type-chart.tsx`) con il conteggio delle procedure per tipo di procedura, stesso perimetro/filtri della dashboard; colori `--chart-1..8`, etichette dirette sulle barre (non solo colore), `role="img"` con `aria-label` che riporta tutti i valori. Ogni barra è un link al portafoglio filtrato su quel tipo, con gli stessi filtri (struttura) già attivi.
  4. **Richieste di riprogrammazione** = numero di versioni della procedura oltre la baseline (`procedure_versions.is_baseline = 0`) nel perimetro filtrato: ogni versione successiva alla prima è per costruzione una riprogrammazione approvata da un umano (regola di dominio: niente cancellazioni, solo nuove versioni). Non è il numero di alert di riprogrammazione aperti (quelli sono in `/alert?view=reschedule` e contano le procedure, non le richieste storiche).
  - Scartato: «numero di richieste per singola gara» come elenco/tabella per procedura — ridondante con la richiesta del cliente di evitare tabelle in dashboard; il totale aggregato nel perimetro filtrato basta come KPI.
- Dominio: nessuna logica nuova nel dominio (sono conteggi SQL su colonne esistenti, nessun importo). Lettura in `dashboard()` (`src/server/queries.ts`): nuovi campi `kpi.proceduresActive`, `kpi.proceduresToStart`, `kpi.reprogramRequests`, `byType`.
- UI: sezione «Panoramica gare» in cima alla dashboard, subito sotto i filtri (tre card + l'istogramma).
- Deviazione dalla guida di stile (stessa sessione, su richiesta esplicita del cliente): `07_design_brand_identity.md` §6.7 richiede per ogni grafico un'alternativa tabellare equivalente oltre all'`aria-label`. Il cliente ha chiesto di togliere la tabella sotto l'istogramma «Gare per tipo» per tenere la dashboard compatta; resta solo l'`aria-label` sull'SVG (`role="img"`) con tutti i valori, senza il fallback tabellare. Accettato come scelta del cliente, non come default dell'agente.
- Test: `[DEC-121]` in `tests/api/gara-kpi.test.ts` (coerenza con il portafoglio, somma per tipo = totale, monotonia del filtro per tipo sulle richieste di riprogrammazione).
- Revisione «Gare per tipo» (stessa sessione, il cliente l'ha segnalata due volte: prima «troppo grande», poi «tutto sbagliato, fixalo come lo fixerebbe un designer»): l'istogramma a barre verticali con un colore diverso per tipo e le etichette troncate (`Trattativa dire…`) viene sostituito da barre **orizzontali**, un solo colore (`--chart-1`) per tutte le barre, etichetta del tipo per intero a sinistra, valore alla fine della barra. Motivazione, non solo estetica: i tipi di procedura non hanno un ordine di grandezza naturale, quindi un colore diverso per barra era "a value-ramp/rainbow su categorie nominali" (anti-pattern) — l'identità di ogni barra è già nell'etichetta di testo, che con le barre orizzontali ha spazio per stare per intero senza troncamenti; ordinate per numero decrescente per leggerle a colpo d'occhio. Nuovo componente `TypeChart` (HTML/CSS, non più SVG: `<ul className="hbar-chart">`, stili in `globals.css`), stesso comportamento di link al portafoglio filtrato per tipo.
- Correzione terminologica (2026-11-13, segnalata dal cliente: «questa non è una gara in bozza, ma una procedura in bozza»): «gara» in senso proprio (procedura amministrativa) indica solo le tipologie competitive (`NEGOTIATED`, `OPEN`, `FRAMEWORK_AGREEMENT`, già isolate in dominio da `isCompetitiveProcedureType`, `src/domain/gara-kpi.ts`); gli affidamenti diretti e gli ordini MePA/Consip non sono gare. Tutte le etichette introdotte da questa DEC che contavano **tutte** le tipologie di procedura (non solo quelle competitive) sono state rinominate da «gara/gare» a «procedura/procedure»: «Panoramica gare» → «Panoramica procedure», «Gare attive» → «Procedure attive», «Gare da avviare» → «Procedure da avviare», «Gare per tipo» → «Procedure per tipo», «Gare aggiudicate» → «Procedure aggiudicate» (KPI `awardedCount`, non filtrato sulle competitive). Restano invariate (già corrette, perché davvero limitate alle tipologie competitive) «Ribasso medio» e «Spesa su gara competitiva».
- Correzione UX (2026-11-13, richiesta del cliente: «quando c'è un filtro, non togliere le altre barre, ma tipo black out le altre colonne»): l'istogramma «Procedure per tipo» non deve più sparire le tipologie diverse da quella selezionata nel filtro «Tipo» della dashboard. `dashboard()` ora calcola `byType` su un perimetro che ignora il filtro per tipo (resta solo quello per struttura/scope), cosi' tutte le tipologie restano visibili; `TypeChart` riceve `selectedType` e attenua (barra e testo in grigio, classe `.hbar-dim`) le righe diverse da quella filtrata invece di rimuoverle, mantenendole comunque cliccabili verso il portafoglio. Test aggiunto in `tests/api/gara-kpi.test.ts` (stesse tipologie e somma invariata con o senza filtro per tipo).
- Stato: attiva.

### DEC-122 — «Giallo» al posto di «Ambra» e Direttore Generale di sola consultazione
- Data: 2026-11-13 · Autore: agente, su richiesta del cliente (1. «replace Ambra with Giallo EVERYWHERE»; 2. «in role direttore remove the azioni section and column, this role will only be able to monitor, without interfering and/or taking decisions»)
- Decisione 1 — **etichetta dell'health `AMBER`**: in italiano diventa «Giallo» (prima «Ambra») ovunque sia testo rivolto all'utente: `HEALTH_LABEL` (`src/ui/labels.ts`), esportazioni CSV/XLSX (`src/server/exports.ts`), risposte dell'assistente (`src/server/assistant.ts`), guida e tour (`src/ui/tour/content.ts`), dashboard (`src/app/(app)/page.tsx`), più i documenti normativi `02_guida_sviluppo_agente.md` e `07_design_brand_identity.md` e il nome di un test.
  - **Il codice `AMBER` resta invariato** in dominio, DB, snapshot, seed, oracle, token CSS (`--health-amber-*`) e classi (`badge-AMBER`): è un identificativo, non un'etichetta, e cambiarlo avrebbe toccato `seed/expected_results.json` (vietato senza DEV).
  - Non toccati di proposito: `00_specifica_originale_v1_0.md` e `01_analisi_criticita.md`, che sono documenti **storici** (la specifica come consegnata e la sua analisi): riscriverli falsificherebbe cosa era stato ricevuto. Se il cliente vuole l'allineamento anche lì, è una riga in più.
- Decisione 2 — **`EXECUTIVE` (Direttore Generale) è un ruolo di sola consultazione**: monitora, non interferisce e non decide.
  - `src/server/authz.ts`: `EXECUTIVE` rimosso da `alert.suspend`, che era la sua unica azione di scrittura; la sospensione dell'escalation resta all'Ufficio Gare. Conserva `procedure.view`, `audit.read`, `export`, `assistant` (tutte di sola lettura).
  - UI: la colonna «Azioni» non viene più renderizzata quando il ruolo non ha nulla da fare, invece di restare una colonna vuota — `AlertTable` (`src/ui/tables.tsx`, `showActions = canHandle || canSuspend`, `colSpan` dinamico) e tabella delle simulazioni nella scheda procedura (`canDecideOrCreateSim`). Vale per qualsiasi ruolo in sola lettura, non solo per il DG.
  - Guida e tour aggiornati: «Sospendere l'escalation» → «Consultare gli alert, senza intervenire».
- Test: `tests/unit/rbac-executive.test.ts` (`[DEC-122]`): il DG non può compiere **nessuna** delle 16 azioni di scrittura della matrice, conserva le quattro di consultazione, e `alert.suspend` resta all'Ufficio Gare.
- Stato: attiva.

### DEC-123 — Dashboard a sezioni: una schermata per sezione, senza scorrimento
- Data: 2026-11-13 · Autore: agente, su richiesta del cliente («the dashboard section with all the kpis should be radically changed: no scroll down, divide the info in tabs, include titles, include a hover with a description of the card/graph, should be like a powerbi dashboard by all means, clear and easy to use, intuitive, meaningful information, visually nice»)
- Problema: la dashboard era una colonna unica di sei blocchi (panoramica, per tipo, indicatori, KPI finanziari, fabbisogno, per fase, attenzione) che richiedeva 3-4 schermate di scorrimento; gli indicatori non avevano una definizione consultabile e i titoli non distinguevano le aree.
- Decisione — **cinque sezioni in tab, la sezione attiva nell'indirizzo** (`?tab=`), stesso meccanismo della scheda procedura (`nav.tabs` + `next/link` + `aria-current="page"`, stili già in `globals.css`): niente componente client, niente Server Action, la pagina resta un Server Component.
  1. **Panoramica** (default, nessun `?tab=`): procedure monitorate (con ripartizione per health), in ritardo, da riprogrammare, alert critici, attive, da avviare, richieste di riprogrammazione, importo a rischio — 8 card.
  2. **Finanza**: programmato, base di gara, contrattualizzato, aggiudicato, pagato (o contratti stipulati), importo a rischio + grafico «Fabbisogno per annualità».
  3. **Affidamenti** (nascosta al Fornitore): procedure aggiudicate, ribasso medio, spesa su gara competitiva, giorni indizione → aggiudicazione + grafico «Procedure per tipo».
  4. **Avanzamento**: le procedure per fase del processo.
  5. **Attenzione**: la tabella delle procedure rosse e gialle.
  - «Affidamenti» e non «Gare» perché la sezione contiene **tutte** le tipologie di procedura, non solo quelle competitive (coerenza con la correzione terminologica del DEC-121).
  - I filtri (tipo, struttura) restano **sopra le tab**, una riga sola: valgono per ogni sezione e vengono conservati nei link di tab; cambiando filtro si resta sulla sezione corrente (campo nascosto `tab` nel form).
  - L'«importo a rischio» compare sia in Panoramica (è l'indicatore di rischio di testata, ed è nel copione e2e della demo) sia in Finanza (dove sta il dettaglio finanziario): ripetizione voluta, headline + dettaglio.
- **Niente scorrimento** ottenuto riducendo il contenuto per sezione (al massimo 2 righe di card + 1 grafico), **non** con `height: 100vh` / `overflow: hidden`, che avrebbe rotto il reflow a 320px e lo zoom del testo (WCAG 1.4.10/1.4.12).
- **Descrizione al passaggio del mouse** (07 §6.6: l'etichetta porta la definizione del KPI): nuovo `KPI_HELP` (`src/ui/kpi-help.ts`) con la definizione di ogni indicatore e di ogni grafico. La card KPI è già un link, quindi già focalizzabile: il pannello si apre su `:hover` **e** su `:focus-visible` della card stessa, senza JavaScript e senza elementi interattivi annidati dentro l'`<a>` (che axe segnalerebbe come `nested-interactive`, violazione seria, e che avrebbe fatto fallire il controllo axe del copione e2e). La definizione **non è testo del documento**: sta nell'attributo `data-tip` ed è resa con `content: attr(data-tip)` su `::after`. Serve a due cose: non viene annunciata due volte (è già nell'`aria-label` della card, quindi chi usa uno screen reader la riceve comunque) e soprattutto non entra nel contenuto testuale della card — il copione e2e cerca le card con `hasText`, che è una ricerca per sottostringa, e la definizione di «Importo a rischio» contiene «da riprogrammare»: come testo nel DOM avrebbe fatto matchare due card e fallire il test in strict mode. Il distacco dalla card è un bordo superiore trasparente, non un margine, così il puntatore può raggiungere il pannello senza perdere `:hover` (WCAG 1.4.13 Hoverable); l'ultima card di ogni riga ancora il pannello a destra per non sbordare dalla pagina a 1366px. Per i grafici, dove non c'è un link, la stessa descrizione sta su una pastiglia «i» (`.info-chip`, `role="note"`, focalizzabile), con lo stesso meccanismo.
  - Limite noto: il pannello non è chiudibile con `Esc` (WCAG 1.4.13 richiederebbe anche quello) perché servirebbe JavaScript lato client; è mitigato dal fatto che l'informazione non è disponibile **solo** su hover, essendo duplicata nel nome accessibile della card.
- `.kpi-grid` passa da `auto-fill minmax(170px, 1fr)` (che a 1366px dava 5-6 card per riga) a **4 colonne** fisse, 2 sotto 1100px e 1 sotto 640px, come chiede 07 §6.6. La classe è usata solo dalla dashboard, quindi la modifica non tocca altre pagine.
- Allineati al nuovo assetto: i quattro passi del tour guidato che puntavano a `section[aria-label='Indicatori principali']`, `section[aria-labelledby='att']` e `section[aria-labelledby='ann']` (ora `h-panoramica`, `?tab=attenzione`, `?tab=finanza`), e le sezioni della guida in-app `HELP.dashboard`.
- Non verificato a schermo: in questo ambiente non c'è `POSTGRES_URL`, quindi la dashboard non è apribile in locale. Typecheck, guard, test unitari e build passano; la resa visiva delle tab e dei tooltip va guardata sul deploy.
- Stato: attiva.
