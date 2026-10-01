# Analisi critica — Specifica MVP INAPP v1.0

**Documento analizzato:** `INAPP_MVP_Requisiti_Epiche_User_Stories_v1_0.docx` (v1.0, 01/10/2026, stato "Per validazione"), convertito in [00_specifica_originale_v1_0.md](00_specifica_originale_v1_0.md).
**Scopo:** individuare dubbi, incoerenze e lacune che impedirebbero a un AI coding agent di sviluppare la piattaforma in autonomia, e indicare per ciascuno il default adottato nella [guida di sviluppo](02_guida_sviluppo_agente.md).
**Destinatari:** referenti Intellera/INAPP (validazione) e agente di sviluppo (contesto).

> **Aggiornamento v1.1.** Le criticità sono state verificate su norme e fonti in [08_risposte_criticita.md](08_risposte_criticita.md) e sui documenti reali INAPP in [05_analisi_documenti_reali.md](05_analisi_documenti_reali.md). I default sono stati corretti nella guida v1.1 (DEV-005, DEV-006). Il passaggio a Next.js + SQLite introduce i rischi CR-37…CR-49 (§6-bis). Lo stato aggiornato di ogni criticità è nella §8.

---

## 1. Giudizio sintetico

La specifica è di buona qualità: principi chiari (core deterministico, baseline immutabile, audit, AI opzionale), backlog completo (12 epiche, 48 storie, 42 MUST), test di collaudo numerati e un dataset con valori attesi. È **sviluppabile**, ma **non in autonomia così com'è**: i valori su cui si basa il collaudo (€150.000 spostati, overflow €80.000 e €100.000, health delle 12 procedure, T-5 su P-001) **non si possono ricavare dalle regole e dai dati descritti**. Un agente costretto a raggiungerli finirebbe per inserirli a mano nel codice, cosa che la specifica stessa vieta (§12.3).

| Categoria | N. | Effetto se non risolta |
|---|---|---|
| A. Bloccanti per lo sviluppo autonomo | 8 | L'agente inventa regole o inserisce a mano nel codice i risultati del collaudo |
| B. Incoerenze interne | 13 | Enum, stati e conteggi divergenti; test non deterministici |
| C. Lacune di specifica | 9 | Scelte arbitrarie su permessi, escalation, modello dati |
| D. Plausibilità del dataset | 2 | Perdita di credibilità della demo davanti all'Ufficio Gare |
| E. Rischi di progetto | 4 | Dispersione, regressioni, ambiente non riproducibile |

Tutte le criticità hanno un **default** nella guida, marcato `DA VALIDARE` dove tocca regole amministrative. Nessuna blocca l'avvio dello sviluppo; le domande della §7 vanno però portate alla sessione con INAPP.

---

## 2. A — Criticità bloccanti per lo sviluppo autonomo

### CR-01 · Unità dei giorni del reminder T-5 (solari o lavorativi)
- **Riferimenti:** §6.1 (algoritmo usa `business_days`), §7.2/S-01, App. A.1 ("tra 5 giorni"), §14.1 (domanda aperta).
- **Problema:** al 01/10/2026 (giovedì) la memoria P-001 del 06/10/2026 (martedì) dista **5 giorni solari ma 3 lavorativi**. Con l'algoritmo della §6.1 P-001 sarebbe a T-3 e il T-5 lavorativo sarebbe caduto il 29/09. Lo scenario S-01 e il DoD ("P-001 genera il reminder T-5 al 01/10/2026") reggono solo con giorni solari.
- **Default:** soglie di reminder ed escalation in **giorni solari**; unità configurabile per regola (`CALENDAR | BUSINESS`). → DEC-010.

### CR-02 · La previsione di spesa delle procedure senza piano SAL non è derivabile
- **Riferimenti:** BR-008, §6.2 punti 4–5, §7.3 (P-002 e P-008 con SAL "da definire"), §10.4.
- **Problema:** la regola dice che "gli importi sono attribuiti all'anno del pagamento previsto", ma per P-002 e P-008 il seed fornisce solo totali annui (200k/280k), senza date di pagamento. Senza righe datate il motore non può calcolare quanti euro attraversano il 31/12 dopo uno slittamento: i €150.000 (P-002) e i €250.000 (P-008) si potrebbero solo scrivere a mano.
- **Default:** il seed contiene **righe di previsione di pagamento datate e ancorate a una milestone**. Uno slittamento sposta la riga dello stesso delta della sua milestone di ancoraggio, e l'annualità viene ricalcolata. Le date sono state scelte e verificate perché le regole producano esattamente i valori del documento. → DEC-030, §10 della guida.

### CR-03 · Disponibilità di bilancio: per procedura o condivisa?
- **Riferimenti:** §5.1 `BudgetEnvelope (year, source, …)`, `annual_budgets.json`, App. B (`budget_availability` dentro la procedura), US-053.
- **Problema:** il modello suggerisce budget **condivisi** per anno e fonte, mentre l'esempio di seed e i numeri attesi funzionano solo con disponibilità **per procedura**. Con budget condivisi, P-002 e P-008 competerebbero sul 2027 e i valori €80k e €100k non tornerebbero. Inoltre la disponibilità 2027 di P-008 (che deve essere €550.000 per ottenere l'overflow di €100.000) non compare da nessuna parte.
- **Default:** **allocazione di disponibilità per procedura × annualità × fonte** (BudgetAllocation). La vista per fonte è un'aggregazione. P-008 2027 = €550.000 (valore derivato). → DEC-031.

### CR-04 · I modelli di procedura (1/4/7/9 mesi) non sono specificati
- **Riferimenti:** US-030, US-100, D-01, §10.4 (`template_version: NEG-4M-v1`, `date_changes: 7`).
- **Problema:** mancano l'elenco delle milestone, gli offset, le durate minime, gli owner, quali milestone sono bloccanti, i documenti attesi e la **corrispondenza fra le 6 tipologie del portafoglio e i 4 modelli**. La §12.3 vieta di inventare regole amministrative, ma senza modelli il cronoprogramma non esiste.
- **Default:** quattro modelli dimostrativi completi (AD-1M, NEG-4M, OPEN-7M, FA-9M), definiti in YAML, marcati `esemplificativo: non termini di legge`. NEG-4M ha 7 milestone, coerente con `date_changes: 7`. → DEC-020, §9 della guida.

### CR-05 · Input e alternative della riprogrammazione non definiti
- **Riferimenti:** US-051, US-054, §9.4, T-008, S-04/S-05, §10.4, BR-009, §13.3.
- **Problema:**
  1. T-008 ("simulare ritardo" su P-008) e S-04 non indicano né la milestone sorgente né la data candidata.
  2. Non si sa da dove venga la `candidate_date` 2026-11-16 di P-002.
  3. Le euristiche "alternativa più rapida" e "minore impatto annuale" non sono definite.
  4. L'overflow €80k è **bloccante** (BR-009): approvare quell'alternativa nella demo richiede un override, che però il demo script non menziona.
- **Default:** alternativa RAPIDA = data di riferimento + 10 giorni di preavviso minimo; MINIMO_IMPATTO = ricerca deterministica sulla finestra di 120 giorni; MANUALE = data inserita dall'utente. Input fissati: P-002 memoria → 16/11/2026; P-005 stipula → 12/11/2026 (+45 gg); P-008 aggiudicazione → 20/11/2026 (+60 gg). L'override di una criticità bloccante spetta solo al Dirigente, con motivazione. → DEC-040…043.

### CR-06 · Le regole di health non riproducono la tabella 7.2
- **Riferimenti:** US-032, §7.2, App. B (`"health": "RED"` nel seed).
- **Problema:** US-032 conosce solo "scadenza entro soglia = ambra; superata o conflitto finanziario = rosso". Con queste regole non si spiega perché:
  - P-004, P-007 e P-009 sono AMBRA;
  - P-012 (stipula fra 14 giorni) è VERDE;
  - P-006 chiusa è VERDE ma P-011 annullata è NEUTRO;
  - P-008 è ROSSO per un conflitto che esiste solo in simulazione.

  Inoltre l'esempio di seed **memorizza** l'health, mentre la specifica lo vuole calcolato.
- **Default:** regole di health esplicite (finestra di attenzione 10 gg, anomalie, scaduti bloccanti, stati terminali), con il "driver" atteso per ogni procedura. L'health non compare mai nel seed: sta solo nell'oracle. → DEC-050, §8.4 della guida.

### CR-07 · "Importo a rischio" ha tre definizioni
- **Riferimenti:** §6.3 (previsioni senza copertura o oltre l'orizzonte), glossario ("… o soggetta a slittamento critico"), S-01 (riporta l'importo programmato €120.000), US-011, US-070.
- **Problema:** è il KPI principale della dashboard. Con la formula della §6.3, alla data demo vale **€0**, perché nessuna previsione approvata supera la disponibilità: i conflitti emergono solo in simulazione.
- **Default:** KPI composto da due voci esposte separatamente. **Importo non coperto** = Σ max(0, previsione approvata anno − disponibilità anno). **Importo in slittamento** = previsione non pagata dell'anno di riferimento sulle procedure con "riprogrammazione richiesta". Valore atteso al seed: 0 + 612.000 = **€612.000**. → DEC-051, `DA VALIDARE`.

### CR-08 · L'oracle `expected_results.json` non esiste e rischia di essere tautologico
- **Riferimenti:** §7.5, App. E.
- **Problema:** l'oracle va scritto **prima** dell'implementazione e non generato dall'output del codice, altrimenti i test confermano qualunque bug. La specifica fornisce solo una parte dei valori: KPI, alert, outbox e driver di health vanno derivati.
- **Default:** la guida riporta i valori già calcolati e verificati (§10). L'agente li trascrive nell'oracle in I0 e può modificarli solo registrando una deviazione motivata (DEV-xxx).

---

## 3. B — Incoerenze interne

| ID | Riferimenti | Incoerenza | Default |
|---|---|---|---|
| CR-09 | §5.3, §6.1, US-031 | Tre insiemi diversi di stati delle milestone. In US-031 compaiono "sospesa" e "non applicabile", assenti in §5.3. L'algoritmo §6.1 assegna BLOCKED **prima** di OVERDUE, nascondendo gli scaduti, e non assegna mai NOT_STARTED. | Enum unico; OVERDUE prevale su BLOCKED; il blocco diventa un flag con motivazione. DEC-021 |
| CR-10 | §5.4, US-063, US-065, BR-013 | Stati SAL diversi: VERIFIED/AUTHORIZED da una parte, "in verifica/accettato/fatturato/scaduto" dall'altra. "Scaduto" è uno stato o un flag? | Enum unificato con INVOICED. OVERDUE è un flag derivato, non uno stato persistito. DEC-022 |
| CR-11 | §3.2, §7.2, App. B, US-032 | La colonna "Fase" della tabella 7.2 usa valori che non sono stati ("Pagamento", "Memoria"). Codici italiani in §3.2 (BOZZA…) e inglesi in App. B (MEMORY_EXPECTED, RED). Fase e stato si sovrappongono. | Codici inglesi nel codice/DB/API, etichette italiane in UI. Fase = stato derivato dalla prima milestone obbligatoria incompleta. P-009 → CLOSING. DEC-001, DEC-023 |
| CR-12 | §7.1, §7.2, US-010 | Il seed dichiara 8 strutture ma il portafoglio ne usa **10**. "Almeno 8 contratti": dalla tabella se ne ricavano 6. "Almeno 14 SAL": 13 con contratto, 21 contando i piani pre-contratto. US-010 rimanda al "capitolo 8", ma il dataset è il cap. 7. | 10 strutture, 6 contratti, 21 SAL pianificati. La differenza dai minimi è registrata come deviazione. DEV-001 |
| CR-13 | §7.3, S-01, US-060 | P-001 è in fase Memoria ma ha "Contratto €119.560" e un riparto calcolato su 119.560, diverso dal programmato di 120.000. Un contratto non può esistere prima della memoria. | P-001 senza contratto; riparto su 120.000 (24.000 / 96.000); residuo 120.000. DEV-002 |
| CR-14 | Fig. 1, BR-004 | La figura dice "memoria non presentata entro **T0** → riprogrammazione", la regola dice **T+1**. | T+1 (regola testuale); T0 genera solo un alert. |
| CR-15 | §3.1, §5.2, US-013, App. B | Quando nasce la baseline: all'avvio o alla consegna della memoria? P-001 e P-002, con memoria non consegnata, hanno già una baseline nel seed. | La baseline (v1) si congela alla prima tra: import come non-bozza, consegna memoria. DEC-024 |
| CR-16 | §5.2 | La tabella mescola due assi: quello **temporale** (baseline/forecast/actual) e quello di **validazione** (proposed/validated/conflict/missing). | Due attributi ortogonali. DEC-025 |
| CR-17 | US-065, BR-007 | "I ritardi aggiornano la previsione" contrasta con "nessuna riprogrammazione diventa corrente senza approvazione". | I ritardi in esecuzione producono una **proiezione** calcolata, non persistita e distinta dal forecast approvato. DEC-044 |
| CR-18 | §8, §13.2, §13.3 | US-090/091 sono SHOULD, ma T-019/T-020 sono nel DoD e nel demo script. US-013 è SHOULD ma contiene il passaggio memoria → Gare e il congelamento della baseline, usati da US-033 (MUST). | Trattate come MUST di fatto per il DoD. |
| CR-19 | §12.1, dipendenze delle storie | T-018 (correzione di un campo estratto) è in I5, ma l'estrazione arriva in I6. US-060/062 dipendono da US-023 (I6) ma stanno in I4. US-032 dipende da US-040/083 (I2) ma serve già in I1. | Prima si implementa il percorso manuale/seed, poi quello automatico. Proposte di estrazione "seed" disponibili già in I5. §11 della guida |
| CR-20 | US-082, §10, §1.4 | I ruoli "Auditor", "Approvatore", "Responsabile di fase" e "Operatore di monitoraggio" non corrispondono ai 7 account. US-082 cita ProgramVersion/ContractVersion, assenti dal modello (che ha ProcedureVersion). | Mappatura esplicita di ruoli e permessi. ContractVersion aggiunta al modello. DEC-060 |
| CR-21 | §6.3, §7.3, US-060 | Non è dichiarato se gli importi siano netti o lordi. Alcuni sono lordi "puliti" al 22% (P-001, P-006, P-007, P-009), altri no: P-004 238.000 → netto 195.081,97. | Tutti gli importi del dataset sono **lordi IVA inclusa**; netto e IVA sono espliciti nel seed, con netto + IVA = lordo. DEC-032 |

---

## 4. C — Lacune di specifica

- **CR-22 · Matrice dei permessi incompleta.** Molti endpoint indicano solo "Per ruolo", "Responsabile", "Approvatore". Manca la separazione dei compiti: chi crea una simulazione può approvarla? Default: matrice azione × ruolo nella guida (§7). Principio dei quattro occhi: l'autore non approva mai. → DEC-061.
- **CR-23 · Destinatari degli alert.** C'è un solo account Struttura per 10 strutture, quindi gli alert di 9 strutture non hanno un destinatario utente. Non si sa a quale contratto sia associato il Fornitore. Default: il destinatario è un **ruolo@ambito**, risolto sugli utenti presenti oppure su una casella funzionale demo (`*.demo.invalid`). Il Fornitore Demo Alfa è assegnato a P-004. → DEC-062.
- **CR-24 · Escalation e livelli già superati.** Alla data demo P-001 ha già superato il T-10 (26/09) e P-002 è a T+6. Non è chiaro se emettere retroattivamente tutti i livelli. Mancano le severità per livello e il comportamento dopo l'approvazione (chiusura degli alert, riarmo sulla nuova data). Default: si emette solo il **livello più alto** raggiunto (nessun recupero dei precedenti); l'alert è unico e "sale" di livello; le notifiche sono uniche per livello; dopo la riprogrammazione l'alert si chiude automaticamente e i reminder si riarmano. → DEC-011…013.
- **CR-25 · Entità mancanti nel modello dati.** Mancano Supplier, Invoice, ContractVersion, Anomaly (distinta da Alert), Calendar/Holiday, AlertNotification, ImportJob, BudgetAllocation, PaymentForecastLine, Session e ConfigVersion. Manca anche il ciclo di vita della simulazione (DRAFT/SUBMITTED/APPROVED/REJECTED/SUPERSEDED/STALE). → §6 della guida.
- **CR-26 · API incompleta.** Mancano liquidazioni, upload dei documenti SAL da parte del fornitore, coda di validazione, anomalie, export, reset, impersonazione, invio in approvazione, budget e utenti. La specifica ammette varianti, ma l'agente deve sapere che ne servono di più. → §6.3 della guida.
- **CR-27 · Documenti seed.** L'elenco è parziale ("…"); non è indicato quale documento contenga la data incoerente né dove stia il conflitto economico. In più, i PDF generati a ogni build cambiano hash per via dei metadati di data, e i test di idempotenza diventano fragili. Default: elenco completo dei 18 documenti; file generati una volta, con metadati fissi, e salvati nel repository. → DEC-070.
- **CR-28 · Arrotondamenti.** "L'ultimo SAL assorbe i centesimi", ma non è indicata la modalità. Default: `ROUND_HALF_UP` a 2 decimali; il residuo va all'ultimo SAL. → DEC-033.
- **CR-29 · Livello di accessibilità non dichiarato.** Per la PA il riferimento è WCAG 2.1 AA (Linee guida AgID). Default: AA, con verifica axe-core automatica negli E2E. → DEC-080.
- **CR-30 · Orologio.** La data demo (01/10/2026) coincide con la data di stesura: da domani `today()` divergerà. Default: data di riferimento sempre configurata (`APP_REFERENCE_DATE`) e iniettata; nel dominio è vietato usare `date.today()`/`datetime.now()`. → DEC-002.

---

## 5. D — Plausibilità del dataset

Il dataset è dichiaratamente sintetico, ma la demo sarà vista dall'Ufficio Gare: incongruenze evidenti ne minano la credibilità.

- **CR-31 · Tipologie e soglie.** P-004 "Affidamento diretto" da €238.000 lordi (≈€195.000 netti) supera la soglia dell'affidamento diretto per servizi e forniture (€140.000 **al netto IVA**, art. 50 e art. 14, c. 4 D.lgs. 36/2023). P-009 "Ordine MePA" (€250.000 netti) e P-002 "Procedura negoziata" (≈€393.000 netti) superano la **soglia UE sub-centrale** applicabile a INAPP: €216.000 dal 01/01/2026, €221.000 nel 2024-25. Il workbook INAPP usa ancora €215.000. *[v1.1: verificata in 08 §4. P-004 → negoziata; P-009 → ordinativo Consip; P-002 invariata con DEV-005.]* Se confermato, basta cambiare la tipologia (es. P-004 → negoziata), senza toccare gli importi. Nell'MVP i valori restano invariati.
- **CR-32 · Cronologia e spesa.** P-002 (memoria al 25/09, negoziata di 4 mesi) prevede €200.000 pagati nel 2026; P-008, ancora in gara, ne prevede €350.000 nel 2026; P-007, in istruttoria, ha un SAL nel 2026. Sono valori incompatibili con i modelli temporali. Per rispettarli, le righe di pagamento di P-002 e P-008 sono ancorate alla milestone in ritardo e non alla stipula. È un compromesso da rivedere se si vogliono dati realistici (in quel caso andrebbero aggiornati anche i valori attesi del DoD).

---

## 6. E — Rischi di progetto

- **CR-33 · Ampiezza.** 42 storie MUST, più OCR, assistente, export PDF, osservabilità e sicurezza degli upload. Per un agente autonomo il rischio principale è aprire molti moduli senza chiuderne nessuno. Mitigazione: vertical slice P0 (I0–I4) prima di tutto il resto; ogni incremento termina con uno stack avviabile e test verdi.
- **CR-34 · Specifica non validata.** Stato "Per validazione", con 10 decisioni aperte (D-01…D-10). Mitigazione: tutto ciò che riguarda D-01…D-10 è configurabile o isolato dietro un adapter; il registro decisioni è obbligatorio.
- **CR-35 · Ambiente.** La macchina è Windows e la cartella non è un repository git. Servono Docker Desktop (backend WSL2) e attenzione ai fine riga CRLF negli script eseguiti nei container. MailHog non è più mantenuto: Mailpit è un sostituto compatibile (stesso SMTP e UI web). → DEC-090…092.
- **CR-36 · Complessità dello stack.** Next.js + FastAPI con sessione a cookie richiedono un proxy same-origin e la gestione del CSRF; il rendering lato server con autenticazione aumenta la complessità. Mitigazione: rewrite `/api` → FastAPI, fetching lato client con TanStack Query, tipi TypeScript generati dall'OpenAPI. → DEC-091.

---

## 6-bis. F — Rischi introdotti dallo stack Next.js + SQLite

Dettaglio e mitigazioni in [06_architettura_nextjs_sqlite.md](06_architettura_nextjs_sqlite.md).

- **CR-37 · Deviazione dalla specifica §4.1/§4.4/§11.3.** La specifica prescrive FastAPI/Python, PostgreSQL, Pytest e mypy; la guida §12.1 chiedeva test "su Postgres reale, niente SQLite". Il cambio è una richiesta del cliente, ma tocca una scelta che la specifica dichiara "di riferimento". Mitigazione: ADR-0001 e DEV-004 nel registro; i principi §2.4, le API §10 e i NFR restano invariati; i test girano sullo stesso motore usato dalla demo. → DEC-096…099.
- **CR-38 · Singolo scrittore ed event loop bloccato.** better-sqlite3 è sincrono: una query lenta o un'attesa di `busy_timeout` bloccano l'intero processo web. Una transazione lunga nel worker, come `run_checks` monolitico o un import, rallenta tutte le richieste. Mitigazione: transazioni brevi senza I/O, `run_checks` a blocchi, letture sullo snapshot indicizzato, lavori pesanti nel worker, misura della durata nella UoW, test di soak in I8.
- **CR-39 · Trigger persi nelle migrazioni.** drizzle-kit ricrea le tabelle per molti `ALTER`, e i trigger (audit append-only, versioni immutabili) spariscono **senza errori**, svuotando un principio non negoziabile. Mitigazione: trigger solo in `db/sql/triggers.sql`, riapplicati dopo ogni migrazione; test di presenza ed effetto su DB nuovo e aggiornato; `/ready` a 503 se ne manca uno.
- **CR-40 · Assenza di un tipo decimale esatto.** Gli importi possono degradare a float tramite `TOTAL/AVG/divisioni` SQL, colonne `REAL`, celle XLSX, `number` JS o `JSON.parse` di numeri. Mitigazione: centesimi interi + `Money` opaco (`valueOf` lancia) + lint e guard + test sullo schema DB e sui contratti JSON + una sola conversione ammessa (export XLSX) coperta da test property-based.
- **CR-41 · File DB condiviso fra container.** Un bind mount da Windows, un filesystem di rete o uid diversi fra container possono corrompere il DB o bloccare WAL (`-shm`). Mitigazione: volume nominato, stesso utente `node` in tutti i container, migrazioni solo da `init`, divieto documentato in README e `CLAUDE.md`, `quick_check` all'avvio.
- **CR-42 · Nessuna sicurezza a livello DB.** Senza ruoli, GRANT e RLS, chi accede al file può rimuovere i trigger e modificare l'audit. Mitigazione: accesso al file solo dai container; hash chain dell'audit con `cli audit verify` (I8); backup preventivo al reset; per la produzione si migra a PostgreSQL (§2.12).
- **CR-43 · Autenticazione custom.** Codice di sicurezza scritto dall'agente: rischio di fixation, CSRF incompleto, confronti non a tempo costante, sessioni non revocate. Mitigazione: primitive consolidate (argon2id, @oslojs), checklist di test obbligatoria (rotazione, revoca, scadenze, CSRF/Origin, enumerazione degli utenti, rate limit, cookie flags); ripiego su Better Auth se la checklist non è verde entro I0.
- **CR-44 · Confini server/client di Next.js.** Rischi: codice server o segreti nel bundle client; risposte autenticate in cache; autorizzazione messa in `proxy.ts` (classe di bypass CVE-2025-29927); doppio percorso di lettura (API + Server Component) con controlli divergenti. Mitigazione: `server-only`, segmenti dinamici e `no-store`, autorizzazione solo negli use case (un unico punto per API e RSC), Server Actions vietate, test RBAC anche sulle pagine (E2E con ruolo non autorizzato).
- **CR-45 · Determinismo di OCR e PDF in JS.** L'output di `tesseract.js` (build WASM SIMD/relaxed-SIMD) e il rendering di pdfjs possono variare fra versioni e CPU, rendendo fragili i test. Mitigazione: versioni fissate, `traineddata` versionato con hash, test OCR su campi chiave (regex CIG, parole attese, confidenza sopra soglia) e non sul testo esatto, `FakeOcr` nei test non dedicati.
- **CR-46 · Maturità delle librerie.**
  - exceljs ha l'ultima release a ottobre 2023;
  - Drizzle 1.0 è in RC, con cambi di API in arrivo;
  - TypeScript 7 (nativo) non è supportato da typescript-eslint, quindi si resta sulla 6.0;
  - `eslint-plugin-jsx-a11y` non supporta ESLint 10, quindi si resta sulla 9;
  - Node 26 diventa LTS il 28/10/2026.

  Mitigazione: versioni fissate nel lockfile, librerie dietro porte (`SpreadsheetReader/Writer`), una DEC per ogni major, `pnpm audit` nella gate.
- **CR-47 · Reset e restore con processi attivi.** Sostituire il file del DB mentre `web` e `worker` hanno connessioni aperte porta a dati incoerenti o corruzione. Mitigazione: reset come singola transazione `IMMEDIATE` con `db_epoch` e backup preventivo; restore solo a servizi fermi, con procedura nel runbook e un controllo nella CLI (rifiuta se c'è un heartbeat recente).
- **CR-48 · Migrabilità verso PostgreSQL.** SQL specifico di SQLite sparso nel codice, porte sincrone o date gestite come stringhe nel dominio renderebbero costosa la migrazione necessaria per un pilota con dati reali. Mitigazione: regole della §2.12 (SQL isolato, porte asincrone, costrutti portabili, test tramite le porte).
- **CR-49 · Ricerca senza stemming italiano.** FTS5 non ha un dizionario italiano: "procedure" non trova "procedura" senza prefisso. Mitigazione: query a prefisso automatico sui termini, `remove_diacritics`, ricerca esatta su codici, CIG e CUP. Impatto basso per US-011.

---

## 7. Domande da portare alla sessione INAPP (in ordine di impatto)

| # | Domanda | Default adottato | Criticità |
|---|---|---|---|
| 1 | Il T-5 della memoria è in giorni solari o lavorativi? Quali festività e sospensioni valgono? | Solari; festività nazionali | CR-01 |
| 2 | La disponibilità di bilancio è assegnata per procedura o condivisa per capitolo/fonte? | Per procedura × anno × fonte | CR-03 |
| 3 | Come si definisce "importo a rischio" per la Direzione? | Non coperto + in slittamento | CR-07 |
| 4 | Fasi, durate e milestone bloccanti ufficiali per ciascuna tipologia; corrispondenza tipologie → modelli | Modelli demo AD-1M/NEG-4M/OPEN-7M/FA-9M | CR-04 |
| 5 | Chi propone, chi approva e chi può forzare una riprogrammazione con criticità bloccante? Ci sono deleghe? | Propone Gare/Amm.; approva Dirigente o Validatore (non l'autore); override solo Dirigente | CR-05, CR-22 |
| 6 | Un superamento di disponibilità è bloccante o solo un avviso? | Bloccante, con override motivato | CR-05 |
| 7 | Gli importi di programmazione sono lordi IVA inclusa? | Sì | CR-21 |
| 8 | Le tipologie del dataset (P-002, P-004, P-009) sono plausibili rispetto alle soglie? | Invariate, da correggere | CR-31 |
| 9 | La previsione di spesa delle procedure non ancora contrattualizzate ha date di pagamento? Da quale fonte (workbook)? | Righe datate ancorate a una milestone | CR-02 |
| 10 | Quali alert arrivano al Direttore e dopo quale livello? | T0 e T+1 | CR-24 |
| 11 | Il fornitore accede alla piattaforma o carica tutto l'ufficio? | Accesso limitato (D-04) | — |
| 12 | Quali OCR/LLM sono autorizzati e quali dati possono uscire dall'ambiente INAPP? | Solo locale, LLM disabilitato | D-07 |

> **v1.1.** Le domande sono state ridotte dopo la verifica: l'elenco aggiornato delle domande che restano davvero a INAPP è in [08 §8](08_risposte_criticita.md) (11 voci) e [05 §7](05_analisi_documenti_reali.md) (14 voci, in parte sovrapposte).

---

## 8. Stato delle criticità dopo la verifica (v1.1)

| Esito | Criticità | Fonte |
|---|---|---|
| **Confermata da norma o fonte**: default confermato o corretto | CR-21 (lordi, soglie sul netto), CR-28, CR-29 (L. 4/2004, EN 301 549), CR-31 (soglie corrette) e altre (vedi 08 §2) | 08 |
| **Risolta dai documenti reali** | CR-04 (regola 1/4/7/9 mesi: aperta = 9 mesi), CR-02 (il workbook è solo annuale), CR-13 (P-001 ricalca un caso reale), CR-15 (la baseline è una versione del Piano di attuazione), CR-32 (tempi reali da 2 a 3 volte più lunghi) | 05 §5.4 |
| **Probabile**: default mantenuto, da confermare | la maggior parte delle CR (24 su 36) | 08 §2 |
| **Solo INAPP può decidere** | CR-01 (T-5 solari/lavorativi; circolare del 26/04/2022), CR-07 (importo a rischio), CR-14 (T0/T+1), CR-24 (escalation al DG) | 08 §8 |
| **Correzioni recepite nella guida v1.1** | modelli OPEN-9M / NEG-7M / FA-ADH-2M con minimi di legge; "efficacia dell'aggiudicazione" sostituita da "adempimenti pre-stipula" (art. 17, c. 5); garanzia definitiva in tutti i modelli; tipologie di P-004 e P-009; soglie configurabili per data; T-1M | guida §3, §9, DEV-006 |
| **Nuovi rischi tecnici** | CR-37…CR-49 (stack Next.js + SQLite) | §6-bis, 06 |

L'oracle (guida §10.3–10.6) è stato ricalcolato dopo le correzioni ed è **invariato**.
