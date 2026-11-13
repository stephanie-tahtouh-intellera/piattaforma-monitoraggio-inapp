# Guida di sviluppo per l'AI coding agent — Piattaforma INAPP MVP

> **Versione guida:** 1.2 (stato operativo aggiornato al 2026-11-04; integra DEC-111 e DEC-115…117) · **Specifica di riferimento:** v1.0 del 01/10/2026 ([00_specifica_originale_v1_0.md](00_specifica_originale_v1_0.md)) · **Analisi:** [01_analisi_criticita.md](01_analisi_criticita.md)
>
> Questa guida rende la specifica **eseguibile in autonomia**: risolve le incoerenze, fissa i default mancanti e definisce l'oracle dei test. Il "cosa" (storie, criteri di accettazione) resta nella specifica; qui sono fissati il "come", le regole precise e i valori attesi.
>
> **Stato corrente:** le sezioni che descrivono SQLite, Docker Compose, Drizzle, bindRoute/OpenAPI e database di test usa-e-getta sono il piano originario e non descrivono il codice attuale. Per stack e procedure operative valgono gli aggiornamenti qui marcati DEC-115…117 e il registro [03_registro_decisioni.md](03_registro_decisioni.md); per l'avanzamento effettivo fa fede [04_avanzamento.md](04_avanzamento.md). I test attuali usano Postgres e svuotano il database configurato: vedere §12 prima di eseguirli.

## Indice
0. [Gerarchia delle fonti](#0-gerarchia-delle-fonti)
1. [Missione e definizione di successo](#1-missione-e-definizione-di-successo)
2. [Protocollo di lavoro autonomo](#2-protocollo-di-lavoro-autonomo)
3. [Decisioni di default (DEC)](#3-decisioni-di-default-dec)
4. [Architettura e stack concreti](#4-architettura-e-stack-concreti)
5. [Vocabolario canonico](#5-vocabolario-canonico)
6. [Modello dati e API: integrazioni](#6-modello-dati-e-api-integrazioni)
7. [Ruoli, account e permessi](#7-ruoli-account-e-permessi)
8. [Regole deterministiche precisate](#8-regole-deterministiche-precisate)
9. [Modelli di procedura dimostrativi](#9-modelli-di-procedura-dimostrativi)
10. [Seed e oracle](#10-seed-e-oracle)
11. [Piano a incrementi](#11-piano-a-incrementi)
12. [Test e quality gate](#12-test-e-quality-gate)
13. [Definition of Done](#13-definition-of-done)
14. [Checklist di sessione](#14-checklist-di-sessione)

---

## 0. Gerarchia delle fonti

In caso di conflitto prevale, nell'ordine:

1. **Principi non negoziabili** della specifica (§2.4) e **istruzioni vincolanti** (§12.3).
2. **Questa guida**, scritta per risolvere i conflitti della specifica.
3. **La specifica** (storie, criteri, NFR, API) per tutto ciò che la guida non tratta.
4. **Il registro decisioni** [03_registro_decisioni.md](03_registro_decisioni.md), che colma i vuoti ma non contraddice 1–3, salvo approvazione umana annotata. Le decisioni successive DEC-115…117 prevalgono sulle decisioni tecniche originarie che dichiarano esplicitamente superate.

Quando la guida cambia un elemento della specifica, lo dichiara con un riferimento `CR-xx` all'analisi.

**Documenti di contesto** (non vincolanti, ma da consultare quando si lavora sul tema; le loro proposte valide sono già recepite in questa guida):
- [05_analisi_documenti_reali.md](05_analisi_documenti_reali.md) — workbook e atti reali: processo, campi, regole di import ed estrazione;
- [06_architettura_nextjs_sqlite.md](06_architettura_nextjs_sqlite.md) — motivazioni dello stack, limiti di SQLite, ADR-0001;
- [07_design_brand_identity.md](07_design_brand_identity.md) — **vincolante per la UI** (DEC-081);
- [08_risposte_criticita.md](08_risposte_criticita.md) — fonti normative per soglie, termini e contabilità.

---

## 1. Missione e definizione di successo

**Missione:** mantenere il vertical slice end-to-end: programmazione → memoria → alert → riprogrammazione → contratto → SAL → pagamento → impatto sulla previsione di spesa. In locale si avvia con Postgres configurato, `pnpm db:bootstrap` e `pnpm dev`; la demo è distribuibile su Vercel. Il core resta operativo con l'assistente disattivato.

**Il successo si misura così (DoD §13.2 della specifica, resa verificabile):**

| # | Verifica | Oracle |
|---|---|---|
| 1 | Stack pulito → tutti i servizi healthy, 12 procedure caricate | T-001 |
| 2 | Al 01/10/2026 P-001 ha l'alert memoria di livello T-5 e una e-mail in outbox | T-004, §10.4 |
| 3 | La simulazione P-002 con memoria al 16/11/2026 sposta €150.000 dal 2026 al 2027 e produce un overflow 2027 di €80.000; nessun dato corrente cambia | T-006, T-007, §10.5 |
| 4 | P-004: piano 20/50/30, pagato €47.600, residuo €190.400 | T-011 |
| 5 | Health di tutte le 12 procedure = tabella 7.2 della specifica | §10.3 |
| 6 | T-001…T-025 verdi, oppure con deviazione registrata | §12 |

**Priorità:** P0 = incrementi I0–I5 (slice dimostrabile). P1 = I6–I8. Non si inizia un P1 prima che il P0 sia verde.

---

## 2. Protocollo di lavoro autonomo

### 2.1 Inizio di ogni sessione
1. Leggi `CLAUDE.md`, poi in questa guida le §2–3 e la sezione dell'incremento corrente (§11).
2. Leggi [04_avanzamento.md](04_avanzamento.md) e le ultime voci di [03_registro_decisioni.md](03_registro_decisioni.md).
3. `git status` e `git log --oneline -15`.
4. Verifica che il database configurato sia appropriato prima di avviare test (§12.2); non lanciare una suite che svuota dati condivisi. Esegui le verifiche non distruttive e registra ogni gate non eseguita.

### 2.2 Ciclo per ogni storia
1. Prendi la prossima storia non completata dell'incremento corrente, nell'ordine della §11.
2. Rileggi la storia nella specifica e le regole collegate in questa guida.
3. Scrivi i test che coprono **ogni criterio di accettazione**, con l'ID nel titolo per la tracciabilità (`describe('[US-040] …')` / `test('[T-004] …')`, in Vitest e Playwright).
4. Implementa nell'ordine: dominio (funzioni pure) → application/server → infrastruttura → API (route handler, validazione Zod, RBAC object-level) → UI (stati loading/empty/error/unauthorized).
5. Esegui la quality gate.
6. Aggiorna `04_avanzamento.md`, README e contratti Zod eventualmente coinvolti.
7. Fai commit `feat(US-040): …`.

### 2.3 Gestione delle ambiguità (senza fermarsi)
1. È coperta da una DEC di questa guida? → applicala.
2. È coperta dalla specifica senza conflitti? → applicala.
3. È una **regola amministrativa** (durate, soglie, chi approva, formule)? → rendila **configurabile**, scegli il default più conservativo compatibile con i principi, marcala `DA VALIDARE` e registra una DEC-1xx.
4. È una **scelta tecnica**? → scegli l'opzione più semplice e reversibile e registra una DEC-1xx. Per le scelte irreversibili (auth, modello versioni, storage, scheduler) scrivi un ADR in `docs/adr/`.

### 2.4 Quando fermarsi e chiedere all'umano
Fermati solo se:
- serve violare un principio non negoziabile o un'istruzione vincolante;
- un valore del DoD non è raggiungibile senza cambiare i numeri della specifica o di questa guida;
- servono credenziali, dati reali, servizi esterni o costi;
- serve un'operazione distruttiva fuori dal repository;
- la quality gate resta rossa dopo **tre** tentativi con approcci diversi. In questo caso riporta la diagnosi, cioè cosa hai provato e cosa hai escluso.

### 2.5 Divieti (in aggiunta alla §12.3 della specifica)
- Non modificare `expected_results.json` per far passare un test. È ammesso solo con una **DEV-xxx** nel registro che spieghi perché l'oracle era sbagliato.
- Non disattivare, saltare o indebolire test; non abbassare le soglie di copertura. Niente `any`, `@ts-ignore`/`@ts-expect-error` o `eslint-disable` senza un commento che lo motivi.
- Non usare `Date.now()`, `new Date()` senza argomenti o `Temporal.Now` nel dominio e nell'application. La data di business arriva solo dal `Clock` (DEC-002).
- Non usare `number` per gli importi: `Money` nel dominio, `*_cents INTEGER` nel DB, `MoneyString` in API e UI (DEC-033). Il frontend **non fa aritmetica sugli importi**: li riceve calcolati e si limita a formattarli.
- Non usare Server Actions. Non fare I/O esterno dentro `uow.write`. Non rimuovere trigger, se non in `db/sql/` e in `infrastructure/db/reset.ts`.
- Non usare dati, nomi, importi o identificativi dei **documenti reali** (workbook e `Documenti Gara/`) in seed, test, fixture o documentazione: se ne imitano solo layout e terminologia (DEC-071).
- Non aggiungere servizi cloud o dipendenze a pagamento. Nessun provider LLM reale finché D-07 non è deciso.
- Non lavorare a più incrementi in parallelo e non anticipare storie SHOULD/COULD prima della chiusura del P0.
- Non scrivere dati demo nei servizi (`if code == "P-002"`): i risultati derivano da seed + regole.

### 2.6 Git e ambiente
- In I0: `git init`, branch `main`, `.gitignore` (già presente: esclude `.env`, `Documenti Gara/` e i file `.xlsx`/`.pdf`/`.docx` nella radice; aggiungi `.data/` e `node_modules/`). **Prima del primo commit verifica con `git status` che nessun documento reale sia in stage.** Poi e `.gitattributes` con `* text=auto eol=lf` (la macchina di sviluppo è Windows e gli script girano in container Linux).
- Commit piccoli, in stile Conventional Commits, con l'ID della storia. A fine incremento: tag `inc-I<n>`.
- Nessun segreto: solo `.env.example` con valori demo.

### 2.7 Continuità tra sessioni
`docs/04_avanzamento.md` è la tua memoria. Aggiornalo a ogni storia completata e prima di chiudere la sessione con: stato delle storie, ultimo passo fatto, prossimo passo, problemi aperti, comandi utili scoperti.

---

## 3. Decisioni di default (DEC)

`DA VALIDARE` = regola amministrativa da far confermare a INAPP: va implementata come configurazione. La colonna **Rif.** indica la criticità o la proposta da cui deriva la DEC:
- CR-xx: [analisi](01_analisi_criticita.md);
- M-xx: [08_risposte_criticita.md](08_risposte_criticita.md);
- P-xx: [05_analisi_documenti_reali.md](05_analisi_documenti_reali.md);
- 06 §x: [06_architettura_nextjs_sqlite.md](06_architettura_nextjs_sqlite.md);
- 07: [07_design_brand_identity.md](07_design_brand_identity.md).

| ID | Tema | Decisione | Rif. |
|---|---|---|---|
| DEC-001 | Lingua dei codici | Identificatori, enum e codici DB/API in **inglese** `UPPER_SNAKE`. Etichette UI in **italiano** da dizionario (modificabili, US-103), allineate al vocabolario reale INAPP (§5.1). | CR-11, P-03/04 |
| DEC-002 | Orologio di business | Porta `Clock.referenceDate()` → `Temporal.PlainDate`: legge `demo.reference_date` dalla config (default `2026-10-01`), sovrascrivibile da `APP_REFERENCE_DATE`. Timezone `Europe/Rome`. `Clock.now()` → `Temporal.Instant`, usato per audit, log e lease e separato dalla data di business. Vietati `Date.now()`, `new Date()` senza argomenti e `Temporal.Now` in `src/domain` e `src/application`, con controllo di lint e guard. | CR-30, 06 §1.6 |
| DEC-010 | Unità delle soglie | Soglie di reminder ed escalation in **giorni solari**. Unità configurabile per regola: `DAYS_CALENDAR` (default), `DAYS_BUSINESS`, `MONTHS` (DEC-015). `DA VALIDARE` | CR-01, P-09 |
| DEC-011 | Livelli già superati | A ogni valutazione si emette solo il **livello più alto** raggiunto e non ancora emesso; i livelli precedenti non si recuperano. | CR-24 |
| DEC-012 | Identità degli alert | Un alert per `(rule_code, target_type, target_id, due_date)`: escala cambiando `current_level`. Le notifiche sono uniche per `(alert_id, level, recipient, channel)`. | CR-24 |
| DEC-013 | Dopo una riprogrammazione | Se cambia la `due_date`, l'alert precedente passa ad `AUTO_CLOSED` e i reminder si riarmano sulla nuova data. | CR-24 |
| DEC-014 | Alert "un mese prima" | La policy `MEMORY` ha un livello **T-1M** (LOW, solo in-app, owner) prima di T-10, come nella prassi del workbook INAPP. Per DEC-011 i conteggi del seed non cambiano. `DA VALIDARE` | P-08, M-06 |
| DEC-015 | Mesi di calendario | L'unità `MONTHS` usa la semantica di `EDATE` di Excel: stesso giorno del mese oppure ultimo giorno se quel giorno non esiste, poi spostamento al giorno lavorativo. | P-09 |
| DEC-020 | Modelli di procedura | Modelli della §9 (YAML versionati, `illustrative: true`). Il modello si **sceglie** in base a tipologia, criterio di aggiudicazione (`award_criterion`) e strumento (`instrument`), seguendo la regola INAPP dei 1/4/7/9 mesi; la corrispondenza è nella §9. Minimi conformi agli artt. 18 e 71 del D.lgs. 36/2023. `DA VALIDARE` (circolare INAPP del 26/04/2022) | CR-04, M-01/02, P-05 |
| DEC-021 | Stati milestone | Enum unico (§5.2). `OVERDUE` prevale su `BLOCKED`. Il blocco è un flag con motivazione (`blocker`), non uno stato che nasconde lo scaduto. Una dipendenza incompleta **non** blocca una milestone futura. | CR-09 |
| DEC-022 | Stati SAL | Enum unico (§5.3) con `INVOICED`. `OVERDUE` è un flag derivato. | CR-10 |
| DEC-023 | Fase = stato | `Procedure.status` è derivato dalla fase della **prima milestone obbligatoria non completata**: ogni definizione di milestone dichiara la sua `phase`. Gli stati post-contratto derivano da contratto e SAL (§8.2). `CLOSED` e `CANCELLED` si raggiungono solo con use case espliciti. Il valore è persistito per le query e ricalcolato a ogni evento. | CR-11 |
| DEC-024 | Nascita della baseline | La versione v1 (baseline) si congela al primo dei due eventi: import di una procedura non in bozza oppure consegna della memoria (US-013). Prima di quel momento la bozza è modificabile, con cronologia. In produzione la baseline può corrispondere a una versione del Piano di attuazione (V1…Vn) importata dal workbook. | CR-15, M-18 |
| DEC-025 | Due assi del dato | Asse **temporale**: `BASELINE` / `FORECAST` / `ACTUAL`. Asse di **validazione**: `PROPOSED` / `VALIDATED` / `CONFLICT` / `MISSING`. Sono attributi separati. | CR-16 |
| DEC-026 | Memoria a ritroso | Se una procedura importata ha `activity_start` ma non la data della memoria, si calcola `memory_due = EDATE(activity_start, −duration_months del modello)`, come nel workbook. Nel seed la data della memoria resta esplicita. | P-08 |
| DEC-030 | Previsione di spesa | `PaymentForecastLine(payment_date, accrual_date?, granularity: DATE\|YEAR, amount, year=derivato, anchor_type, anchor_ref, source)`. Ancora = milestone o SAL. Se l'ancora si sposta di Δ giorni solari, la riga si sposta di Δ e poi viene portata al giorno lavorativo successivo. Le righe dei piani SAL derivano dal piano. Le procedure con SAL "da definire" hanno righe seedate. L'import del workbook crea righe `YEAR` dalle colonne `Impegno AAAA`. | CR-02, P-10 |
| DEC-031 | Disponibilità | `BudgetAllocation(procedure, year, source, funding_line?, amount)` = quota di piano o prenotazione della procedura. L'overflow si calcola per procedura e anno sulla **somma delle fonti**. La vista per fonte o per operazione è un'aggregazione **solo informativa** (WARNING `OPERATION_PLAN_EXCEEDED`, disattivato nel seed). `DA VALIDARE` | CR-03, M-17, P-11 |
| DEC-032 | Netto/lordo | Gli importi del dataset sono **lordi IVA inclusa**. Netto e IVA sono espliciti nel seed, con `net + vat = gross` esatto, e `vat_rate` è definita per contratto (default 22%). Le soglie si valutano sul **netto** (art. 14, c. 4). Con lo split payment il pagato lordo comprende il netto al fornitore e l'IVA versata all'Erario. I piani SAL espressi sul netto si convertono in lordo con HALF_UP; l'ultimo SAL assorbe lo scarto. | CR-21, M-08, P-12 |
| DEC-033 | Importi e arrotondamenti | Importi in **centesimi interi**: `Money` su `bigint` nel dominio, colonne `*_cents` di tipo `INTEGER` con `CHECK (typeof(x)='integer' AND x>=0)` nel DB, stringhe a 2 decimali in JSON (`"47600.00"`). ROUND_HALF_UP (metà lontano da zero) con `divRoundHalfUp` in aritmetica intera. Importo SAL = `divRoundHalfUp(gross_cents × pct_centesimi, 10000)`; l'**ultimo SAL** = `gross − Σ precedenti`. In SQL sugli importi sono ammessi solo `SUM`, `+`, `-` e i confronti. | CR-28, 06 §1.5 |
| DEC-034 | Base delle annualità | Configurazione `finance.annuality_basis: PAYMENT_DATE \| ACCRUAL_DATE`. Il default è `PAYMENT_DATE`, che è quello usato dall'oracle; INAPP però imputa per esigibilità. `DA VALIDARE` | P-10 |
| DEC-035 | Componenti di costo e linee di finanziamento | Entità facoltative `FundingLine(programme, operation, activity, chapter, source, funding_end_date)` e `CostComponent(procedure, kind: ANAC_FEE\|TECH_INCENTIVES, year, source, amount)`. Invariante: Σ righe forecast + pagato = programmato − Σ componenti. Nel seed le componenti valgono 0. Esempio di `funding_end_date` per le fonti PN: 31/12/2029 (Reg. UE 2021/1060, art. 63). | P-11/12, M-15 |
| DEC-036 | Soglie normative | `config/procurement_thresholds.yaml` versionato per data (`ConfigVersion`). INAPP è una stazione appaltante **sub-centrale**. Soglia UE per servizi e forniture: 221.000 € nel 2024-25, **216.000 €** dal 01/01/2026. Affidamento diretto sotto i 140.000 € netti (art. 50). L'anomalia `PROCEDURE_TYPE_THRESHOLD_MISMATCH` esiste ma è **disattivata nel seed**. | CR-31, M-13 |
| DEC-037 | Termini di verifica e pagamento | `sal.review_term_days` = 15 (obiettivo interno; massimo di legge 30, D.lgs. 231/2002 art. 4, c. 6). `payment_term_days` = 30 dalla fattura (massimo 60 se pattuito e motivato, art. 4, c. 4). Il RUP emette il certificato di pagamento entro 7 giorni (art. 125). | M-14 |
| DEC-040 | Alternative di riprogrammazione | `FASTEST`: data di riferimento + `min_lead_days` della milestone sorgente (default 10), nel rispetto dei vincoli e portata al giorno lavorativo. `MIN_ANNUAL_IMPACT`: tra FASTEST e FASTEST+120 giorni lavorativi, la data che minimizza nell'ordine overflow bloccante totale, importo spostato e giorni di ritardo; a parità vince la data più vicina. `MANUAL`: data scelta dall'utente. Le alternative identiche vengono accorpate ("coincide con…"). `DA VALIDARE` | CR-05 |
| DEC-041 | Simulazione automatica | Al T+1 di una milestone bloccante il sistema imposta il flag `reschedule_required` e crea una simulazione `DRAFT` (autore `system`) con l'alternativa FASTEST. Un umano deve inviarla in approvazione; il sistema non approva mai. | CR-05 |
| DEC-042 | Approvazione | Propongono e inviano: PROCUREMENT (RUP) o FINANCE. Approvano o rifiutano: EXECUTIVE (Direttore Generale o dirigente delegato), **mai l'autore** (il Validatore è soppresso da DEC-109) (quattro occhi). Una criticità `BLOCKING` richiede `override=true`, motivazione e ruolo EXECUTIVE; nella realtà corrisponde a una determina di rimodulazione o a una variazione di bilancio. `DA VALIDARE` | CR-05, CR-22, M-07 |
| DEC-043 | Concorrenza | La simulazione memorizza `base_version_id`. Se all'approvazione la versione corrente è cambiata → `409 STALE_SIMULATION`. L'approvazione di una simulazione manda in `SUPERSEDED` le altre aperte della stessa procedura. Locking ottimistico con colonna `version`. | — |
| DEC-044 | Ritardi in esecuzione | I SAL o pagamenti scaduti producono una **proiezione** calcolata e non persistita (`projected_date`), mostrata accanto al forecast approvato. Il forecast cambia solo con un'approvazione. | CR-17 |
| DEC-050 | Health | Regole della §8.4. L'health non è mai nel seed. | CR-06 |
| DEC-051 | Importo a rischio | `at_risk = uncovered + slipping`. `uncovered` = Σ_anni max(0, fabbisogno anno − disponibilità anno) sul forecast approvato. `slipping` = previsione non pagata dell'anno della data di riferimento per le procedure con `reschedule_required`. In UI le due voci sono separate. `DA VALIDARE` | CR-07 |
| DEC-060 | Ruoli | 6 ruoli (§7, senza `VALIDATOR` per DEC-109): `EXECUTIVE` è il Direttore Generale (unico centro di spesa) o un dirigente delegato.<br>Figure della specifica: "Auditor" = lettura audit per ADMIN, EXECUTIVE; "Responsabile di fase" = owner della milestone (ruolo@ambito); "Approvatore" = DEC-042.<br>Figure di procedura: RUP = attributo `rup_user_id`; verificatore dei SAL = "Direttore dell'esecuzione" (art. 114). | CR-20, M-07, P-21 |
| DEC-061 | Permessi | Matrice della §7.3, applicata lato server negli use case con controllo **object-level** (ambito struttura/contratto), sia per le API sia per le letture dei Server Component. | CR-22 |
| DEC-062 | Destinatari | Il destinatario logico è `ROLE@SCOPE` (anche `RUP@PROCEDURE`, con ripiego su PROCUREMENT) ed è risolto sugli utenti attivi con quel ruolo e ambito. Se non ce ne sono, l'e-mail va alla casella funzionale `<ruolo>.<struttura>@demo.invalid` e non c'è notifica in-app. | CR-23, M-07 |
| DEC-070 | Documenti seed | Generati **una volta** da `scripts/generate-seed-documents.ts`: `@react-pdf/renderer` per i PDF di testo, `@napi-rs/canvas` per i PDF senza layer di testo. Font in `vendor/fonts/` e metadati di data fissi (`2026-09-01T00:00:00Z`). Layout e terminologia imitano gli atti reali, con dati inventati (§10.7). I file stanno nel repository, con gli hash in `seed/documents/SHA256SUMS` verificati da un test. | CR-27, P-18, 06 §5.1 |
| DEC-071 | Dati reali INAPP | **Su indicazione del cliente (01/10/2026) i dati reali forniti si usano nella demo**: sono realistici e non pongono problemi di privacy. Il workbook (`04_09_26_Elenco_Prodotti_Gare_Esperti - PN GDL.xlsx`) e gli atti di `Documenti Gara/` sono copiati in `seed/inapp/` e versionati. Il dataset si sceglie con `DEMO_DATASET`: `inapp` (default per la demo) importa il portafoglio reale (foglio `Gare_23-27`) e gli atti reali; `scenarios` carica le 12 procedure P-001…P-012 della §10, che restano l'**oracle** dei test e del DoD. Gli originali nella radice restano esclusi da git per evitare duplicati. | utente, DEV-007 |
| DEC-080 | Accessibilità | WCAG 2.1 AA (L. 4/2004, Linee guida AgID, EN 301 549). `@axe-core/playwright` sulle pagine UI-01…UI-10 senza violazioni serious/critical, più una checklist manuale (tastiera, focus, lettore di schermo) in I8. | CR-29, M-11 |
| DEC-081 | Design system e logo | La UI segue [07_design_brand_identity.md](07_design_brand_identity.md) e i token di `docs/design/tokens.css` (prefisso `--ds-`, Tailwind 4): palette INAPP (`#003567`, `#0059B3`), font Titillium Web, alta densità. **Si usa il logo ufficiale INAPP** (versione bianca, `public/brand/inapp-logo-white.svg`, scaricata da inapp.gov.it) sull'header `#003567`/`#0059B3` e nel login, secondo le regole d'uso di 07 §5.1. Il banner DEMO resta sempre visibile. Importi con `Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', useGrouping:'always'})`. | 07, utente |
| DEC-082 | IA e conformità | Il core resta senza IA, coerente con la L. 132/2025 (art. 14) e con l'AI Act. Prima di abilitare un LLM servono: avviso all'utente (AI Act, art. 50), DPIA (GDPR, art. 35), minimizzazione dei dati personali presenti nei documenti, fornitore cloud qualificato per la PA. | D-07, M-16 |
| DEC-090 | E-mail demo | Mailpit è un SMTP locale opzionale (porta 1025, UI 8025) per nodemailer. Non è avviato o distribuito dall'app; senza un SMTP disponibile gli alert restano consultabili nell'app. | CR-35, DEC-117 |
| DEC-091 | Next.js fullstack | **Next.js fullstack** (App Router) su un'unica origine, senza backend separato. Le mutazioni passano dai route handler `/api/*`; **Server Actions vietate**. Le rotte usano il wrapper comune `route()` in `src/server/http.ts`, che applica sessione, CSRF, controllo dell'Origin e envelope degli errori. La validazione Zod è nel codice delle route. RBAC e visibilità object-level si applicano lato server. | CR-36, 06 §1.2 |
| DEC-092 | Code e job | Nessun Redis. Coda job persistita nel database, deduplicazione con indice unico e reaper dei lease scaduti. Un solo scheduler attivo, eletto tramite `leader_lease`; heartbeat in DB. Il worker è un processo Node separato. Per la versione Postgres vedere DEC-115 e `src/application/run-checks.ts`. | 06 §2.3 |
| DEC-093 | Layout dei test | Test Vitest in `tests/{unit,integration,api}`; E2E Playwright in `e2e/` nella radice. | — |
| DEC-094 | Milestone attiva | Gli alert di scadenza e la finestra di attenzione considerano solo la milestone **attiva** di ogni catena (la prima non completata né N/A, con i predecessori completati), i SAL aperti e i pagamenti dovuti. Le milestone a valle di una in ritardo non generano rumore. | — |
| DEC-095 | Seed come fatti | Il seed contiene **solo fatti di input**: anagrafiche, date, importi, piani, movimenti registrati, documenti. Stati, health, alert, residui e rilasci si **calcolano**. Gli eventi (annullamento di P-011, pagamenti, chiusura di P-006) passano dagli use case durante il caricamento. | — |
| DEC-096 | SQLite, decisione superata | Decisione originaria sostituita da DEC-115: il database attuale è Postgres, collegato con `pg`; non usare le regole SQLite (WAL, `BEGIN IMMEDIATE`, FTS5) come descrizione del runtime. Schema, trigger e migrazioni sono SQL/Postgres. | CR-37…41, superata da DEC-115 |
| DEC-097 | Autenticazione | Autenticazione custom con sessioni su DB, dove si salva solo lo `sha256` del token. Password con argon2id (`@node-rs/argon2`). Scadenza per inattività 8 h, assoluta 12 h. Rotazione della sessione a login, cambio ruolo e impersonazione. Ripiego: Better Auth (ADR-0001). | CR-43, 06 §1.7 |
| DEC-098 | Contratti API | La decisione originaria su OpenAPI e `bindRoute` non è implementata nel repository attuale. Le route sono in `src/app/api/**/route.ts`, il wrapper comune è `src/server/http.ts` e i payload delle rotte usano Zod localmente. Non dichiarare una spec OpenAPI o `/api/docs` disponibili finché non sono presenti nel codice. | 06 §1.9, stato corrente |
| DEC-099 | Documenti in JS | Estrazione del testo con `unpdf`, rendering con `@napi-rs/canvas`, OCR con `tesseract.js` (dati `ita` locali, nessuna CDN), tutto nel worker; pagine PNG pre-renderizzate all'import. Ordine di estrazione: XML incorporato (ordini MePA) → layer di testo con coordinate → OCR, obbligatorio se il testo copre la pagina sotto la soglia. | CR-45, P-19, 06 §1.12 |
| DEC-100 | Ambiente di sviluppo | Node `>=22.12` e pnpm 10. Avvio web con `pnpm dev`, worker con `pnpm worker`; Postgres richiesto tramite `POSTGRES_URL`. I documenti caricati vanno su disco in locale e su Vercel Blob quando configurato. Docker non è usato (DEC-117). Mailpit/SMTP è opzionale in locale: senza server raggiungibile gli alert restano consultabili nell'app. | ambiente, DEC-115…117 |

---

## 4. Architettura e stack concreti

> Stack unico TypeScript: Next.js fullstack + Postgres (DEC-115; ADR-0001 e DEV-004 descrivono la scelta storica di SQLite). Nessun componente Python. Il documento [06_architettura_nextjs_sqlite.md](06_architettura_nextjs_sqlite.md) è storico per il database e Docker.

### 4.1 Servizi
_Stato attuale (DEC-113…117): web Next.js su Vercel o in locale con `pnpm dev`; API REST in route handler `/api/*`, health `/health` e readiness `/ready`; worker Node (`pnpm worker`) per scheduler e dispatcher outbox in locale. Postgres su Neon/Vercel Postgres; documenti su disco (`.data/storage`) in locale o Vercel Blob su Vercel. Nessun container._

### 4.2 Stack e dipendenze
- Runtime dichiarato: Node `>=22.12`; versione delle dipendenze e package manager dal `package.json` e `pnpm-lock.yaml`.
- Web: Next.js 16, React 19, TypeScript 6, Zod 4.
- DB: Postgres tramite `pg`; non ci sono Drizzle né database SQLite nel runtime.
- Altri componenti effettivamente usati: `croner`, `nodemailer`, `@vercel/blob`, `tesseract.js`, `unpdf`, `exceljs`, `pdf-lib`, `yauzl`, `yaml`.
- L'elenco del `package.json` è la fonte per le dipendenze installate; non usare il piano storico sottostante per aggiungere librerie o script non presenti.

### 4.3 Layout del repository

```
/src/domain/          # TS puro: Money, date, calcoli economici, KPI, alert, simulazione
/src/application/     # bootstrap, import, documenti, memoria, moduli e run-checks
/src/contracts/       # formattazione e schemi del seed
/src/infrastructure/  # Postgres (pg), migrazioni, repository, storage, OCR, clock e configurazione
/src/server/          # query, comandi, auth/RBAC, route wrapper e funzioni lato server
/src/app/             # pagine Next.js e route handler API
/src/ui/              # componenti React e moduli d'interazione
/worker/              # scheduler e dispatcher outbox
/cli/                 # bootstrap | reset --yes | run-checks [--date] | audit-verify
/db/migrations/       # migrazioni SQL numerate per Postgres
/db/sql/              # trigger PL/pgSQL
/config/templates/*.yaml
/seed/                # dataset inapp e scenarios, oracle e documenti demo
/tests/{unit,integration,api}/   /e2e/
/scripts/             # guards e generazione documenti seed
/docs/                # guida, decisioni, avanzamento, specifica e design
.env.example  README.md  CLAUDE.md
```

### 4.4 Regole di dipendenza (da far rispettare)
- `src/domain` contiene calcoli puri e value object; non deve dipendere da I/O, Next.js o React. Importi e date seguono i principi non negoziabili della guida.
- Le funzioni di calcolo (date, importi, stati, health, simulazione) sono pure e prendono `referenceDate` come parametro.
- `src/application` contiene bootstrap, caricamento seed, import, documenti, eventi procedura e run-checks. `src/server` contiene query, comandi, auth/RBAC, wrapper HTTP e funzioni usate dalle pagine.
- Le mutazioni passano da route handler `/api/*` (Server Actions vietate), validano l'input con Zod e verificano permessi e ambito lato server. Le transazioni sono gestite con `tx()` dall'adapter Postgres; non eseguire I/O esterno nella transazione.
- Le pagine Server Component leggono tramite le query in `src/server/queries.ts` usando l'Actor autenticato. Non aggiungere accessi che aggirino RBAC/object-level.
- Lo snapshot (`procedure_snapshot`, `procedure_snapshot_year`) è mantenuto da `run_checks`; la ricerca full-text attuale usa `TSVECTOR` e indice GIN, non FTS5.
- Il frontend non fa aritmetica sugli importi: riceve valori monetari serializzati come stringhe e li formatta.

### 4.5 Persistenza Postgres (DEC-115)
- La connessione usa `pg` Pool e richiede `POSTGRES_URL`; `getDb()` applica migrazioni numerate e poi il SQL idempotente dei trigger. Le migrazioni sono serializzate con `pg_advisory_lock` (DEC-116).
- `src/infrastructure/db/connection.ts` mantiene un adapter compatibile con i call site (`prepare().get/all/run`) e traduce i placeholder legacy in `$1…$n`. Le transazioni usano una connessione del pool con `BEGIN/COMMIT/ROLLBACK`.
- Gli importi sono centesimi `bigint` nel dominio e `BIGINT` nel DB; `Money` converte gli importi, che in JSON restano stringhe. È vietata l'aritmetica monetaria in UI e l'uso di `REAL`/`AVG`/`TOTAL`/divisioni SQL sugli importi.
- Ricerca full-text su `TSVECTOR`/indice GIN; i trigger append-only sono funzioni PL/pgSQL. Le istruzioni SQLite/FTS5 di questo documento e dei materiali storici non sono applicabili.

### 4.6 Job, scheduler, outbox
- Coda persistita nel database, `dedupe_key` unica, lease e reaper dei lease scaduti. Non usare sintassi o assunzioni di locking SQLite (`BEGIN IMMEDIATE`) nel codice Postgres.
- Scheduler `croner` nel worker; solo il leader (`leader_lease`) accoda `RUN_CHECKS` ogni 5 minuti (`dedupe_key = run_checks@<slot>`).
- Outbox scritta nella stessa transazione dell'evento; il dispatcher invia con nodemailer (at-least-once, `Message-ID` stabile).
- `worker_heartbeat` ogni 30 s. `cli run-checks --date` gira in-process e in modo sincrono (test, bootstrap); `POST /api/jobs/run-checks` accoda e risponde `202`.

### 4.7 Autenticazione, sessioni, CSRF
- Password argon2id (`@node-rs/argon2`, m=19 MiB, t=2, p=1), hash al seed da `DEMO_PASSWORD`, verifica a tempo costante anche per utenti inesistenti.
- Cookie `inapp_session` (32 byte casuali, `HttpOnly; SameSite=Lax; Path=/`, `Secure` con https); nel DB solo `sha256(token)`. Scadenza per inattività 8 h, assoluta 12 h; rotazione a login, cambio ruolo e impersonazione; logout = revoca.
- CSRF: cookie `inapp_csrf` = `HMAC(SESSION_SECRET, session_id)`, header `X-CSRF-Token` obbligatorio sui metodi non sicuri, confronto a tempo costante, `Origin` in `APP_ALLOWED_ORIGINS`.
- `proxy.ts` non è un confine di sicurezza: genera il correlation ID e fa redirect se manca il cookie. L'autorizzazione sta negli use case.
- Rate limit in memoria su login, import e assistente; audit dei login falliti.

### 4.8 API
- Le route handler sono in `src/app/api/**/route.ts`; `src/server/http.ts` applica bootstrap, sessione, CSRF, envelope d'errore e correlation ID. I payload sono validati con Zod dove previsto.
- La decisione originaria su `bindRoute`, OpenAPI e Swagger non è implementata: non esiste un comando `pnpm openapi` o una pagina `/api/docs`.
- Per permessi, parametri, formati ed errori effettivi, consultare la route e il comando corrispondente; non assumere che i contratti della specifica siano già interamente implementati.

### 4.9 Documenti e export
- Lo storage configurato è locale (`.data/storage`) o Vercel Blob; implementazione in `src/infrastructure/documents/storage.ts`. Consultare il codice del flusso di upload prima di cambiare limiti, classificazione o persistenza.
- OCR usa `unpdf`, `@napi-rs/canvas` e `tesseract.js` con i dati lingua locali. ZIP è gestito da `yauzl`.
- CSV/XLSX/PDF sono generati dai moduli presenti in `src/server/exports.ts`; non assumere dipendenze o output diversi da quelli nel `package.json` e nei test.

---

## 5. Vocabolario canonico

### 5.1 Procedura
| Codice | Etichetta UI | Note |
|---|---|---|
| `DRAFT` | Bozza | |
| `MEMORY_EXPECTED` | Memoria attesa (non avviata) | fase di `MEMORY_SUBMISSION`. Attenzione: nel workbook "Memoria" significa memoria **presentata**, cioè `PRELIMINARY_REVIEW` |
| `PRELIMINARY_REVIEW` | Memoria presentata – istruttoria | |
| `TENDERING` | Indetta – in gara | |
| `AWARDED` | Aggiudicata | |
| `CONTRACTING` | In stipula | |
| `EXECUTION` | Contratto in esecuzione | contratto firmato e almeno un SAL non accettato |
| `CLOSING` | Chiusura | tutti i SAL accettati, saldo o controlli finali da completare |
| `CLOSED` | Chiusa | solo da use case `close_procedure` |
| `CANCELLED` | Annullata / eliminata | solo da use case `cancel_procedure` (BR-020) |

Per il controllo incrociato all'import, `Status procedura` del workbook corrisponde così: "Non avviata" → `MEMORY_EXPECTED`; "Memoria" → `PRELIMINARY_REVIEW`; "Indizione/Indetta" → `TENDERING`; "Aggiudicazione" → `AWARDED`/`CONTRACTING`; "Contratto" → `EXECUTION`/`CLOSING`; "GARA ELIMINATA" → `CANCELLED`. Dizionario dei sinonimi in [05 §8.2](05_analisi_documenti_reali.md).

**Tipologie** (etichette nella terminologia dell'Ufficio Gare):
| Codice | Etichetta |
|---|---|
| `DIRECT_AWARD` | Affidamento diretto (fuori MePA) |
| `DIRECT_AWARD_MEPA` | Affidamento diretto MePA – Trattativa diretta (TD) |
| `MEPA_ORDER` | Ordine diretto MePA (ODA) |
| `CENTRAL_PURCHASING_ORDER` | Ordinativo su convenzione o AQ Consip (nuovo, M-05) |
| `NEGOTIATED` | Procedura negoziata (RdO) |
| `OPEN` | Procedura aperta in ambito europeo |
| `FRAMEWORK_AGREEMENT` | Accordo quadro indetto da INAPP |

**Attributi della procedura:**
- `award_criterion`: `LOWEST_PRICE` (minor prezzo) | `MEAT` (OEPV);
- `instrument`: `MEPA` | `OFF_MEPA` | `CONSIP_AQ`;
- `rup_user_id`, `activity_start`, `activity_end`, `source_key` (Operazione-Codice incarico del workbook).
**Health:** `GREEN` (Verde), `AMBER` (Giallo), `RED` (Rosso), `NEUTRAL` (Neutro). In UI sempre con testo e icona, mai solo colore.

### 5.2 Milestone
Calcolati: `NOT_STARTED`, `UPCOMING`, `DUE_SOON`, `DUE_TODAY`, `OVERDUE`. Persistiti da azione umana: `COMPLETED`, `SUSPENDED`, `NOT_APPLICABLE`, `CANCELLED`. Il flag `blocked` (con `blocker_reason`) è ortogonale. Corrispondenza con US-031: prevista = `NOT_STARTED`/`UPCOMING`; in scadenza = `DUE_SOON`/`DUE_TODAY`; scaduta = `OVERDUE`.

### 5.3 SAL e pagamenti
- **SAL:** `PLANNED → SUBMITTED → UNDER_REVIEW → ACCEPTED → INVOICED → LIQUIDATED → PARTIALLY_PAID → PAID`. Laterali: `REJECTED` (che torna a `SUBMITTED` alla ripresentazione) e `SUSPENDED`. "Autorizzato" = `ACCEPTED`. Il flag derivato `overdue` vale per `PLANNED`/`SUBMITTED`/`UNDER_REVIEW` oltre la scadenza corrente (BR-013).
- **Pagamento:** `DRAFT → SCHEDULED → EXECUTED → RECONCILED`. L'annullamento genera un movimento `REVERSAL` e il pagamento passa a `REVERSED`. Nel pagato contano solo `EXECUTED` e `RECONCILED`.
- **Movimenti finanziari:** append-only. Corrispondenza con le fasi della spesa (DPR 97/2003 e regolamento contabile INAPP, M-09):

  | Movimento | Fase della spesa | Riferimento |
  |---|---|---|
  | `RESERVATION` | prenotazione d'impegno; decade a fine esercizio se non diventa impegno | art. 31, c. 3 |
  | `COMMITMENT` | impegno, anche pluriennale; in INAPP nasce già con la **determina di indizione** | art. 31, c. 1 e 4 |
  | `LIQUIDATION` | liquidazione | art. 32 |
  | `PAYMENT` | pagamento: `SCHEDULED` = ordinazione (mandato/OPI, art. 33); `EXECUTED` = pagato | — |
  | `RELEASE` | rilascio, anche di un'economia dopo una rideterminazione | — |
  | `REVERSAL` | storno | — |

  Attributi facoltativi: `act_type`, `act_number_demo`, `act_date`, `chapter`, `funding_line_id`, `accounting_ref`, `multi_year`.

### 5.4 Alert, anomalie, simulazioni, validazione
- **Alert:** `OPEN → ACKNOWLEDGED → RESOLVED`; `SUSPENDED` (con motivazione e data di nuovo controllo); `AUTO_CLOSED`. Severità: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Anomalie:** stesso ciclo di vita, tipologia distinta (coda unica, filtro `kind = ALERT | ANOMALY`).
- **Simulazione:** `DRAFT → SUBMITTED → APPROVED | REJECTED`; `SUPERSEDED`; `STALE`. Criticità: `BLOCKING` | `WARNING`.
- **Elemento di validazione:** tipo `ASSOCIATION`, `EXTRACTED_FIELD`, `CONFLICT`, `OVERRIDE`, `RESCHEDULE`. Esito: `APPROVED`, `CORRECTED`, `REJECTED`.
- **Sorgente di un valore:** `SEED_FILE` (file, foglio, cella), `DOCUMENT` (documento, pagina, estratto), `MANUAL` (autore, timestamp), `SYSTEM_RULE` (regola, versione).

---

## 6. Modello dati e API: integrazioni

### 6.1 Entità da aggiungere al modello della §5.1 della specifica
> Il modello e la lista di endpoint di questa sezione sono proposte del piano originario, non un inventario del codice runtime. Il DB corrente è definito da `db/migrations/*.sql`; le API effettive sono le route presenti in `src/app/api/`. Per Postgres, importi e trigger seguono DEC-115.

| Entità | Campi chiave | Motivo |
|---|---|---|
| `Supplier` | id, demo_name, vat_demo, is_demo | Fornitore e ambito di accesso |
| `ContractVersion` | contract_id, version, reason, valid_from, approved_by | Addendum (US-060, US-082) |
| `SalPlanItem` / `Sal` | sequence, pct, amount, due_date, review_due_date, payment_term_days, payment_due_date, state, anchor | Unifica il piano pre-contratto e i SAL contrattuali |
| `Invoice` | sal_id, number_demo, date, amount | Stato `INVOICED` |
| `Payment` | sal_id, amount, date, reference, year, source, state | Collegato a un movimento `PAYMENT` |
| `BudgetAllocation` | procedure_id, year, source, amount | DEC-031 |
| `PaymentForecastLine` | procedure_version_id, date, amount, anchor_type, anchor_ref, source | DEC-030; fa parte della versione |
| `MilestoneForecast` | procedure_version_id, milestone_code, date | Date previste versionate |
| `Anomaly` | rule_code, severity, target, evidence, owner, state | US-083 |
| `AlertNotification` | alert_id, level, recipient, channel, outbox_id | DEC-012 |
| `Holiday` / `CalendarConfig` | date, label; roll rule | US-101 |
| `ConfigVersion` | key, version, value, valid_from, author | Configurazioni versionate, non retroattive |
| `ImportJob` / `ImportItem` | path, hash, outcome, error | US-020, US-112 |
| `Session` | id_hash (sha256 del token), user_id, active_role, impersonated_by, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at | Auth, impersonazione (DEC-097) |
| `ExportRecord` | user, filters, hash, created_at | US-073 |
| `Job` | type, dedupe_key, payload_json, status, priority, run_at, attempts, max_attempts, locked_by, lease_until, last_error, correlation_id | Coda (DEC-092) |
| `Outbox` | channel, recipient, template, payload_json, status, attempts, next_attempt_at, message_id, sent_at | Notifiche e-mail |
| `LeaderLease` | name, holder, lease_until | Scheduler singolo |
| `WorkerHeartbeat` | worker_id, beat_at, version | `/ready`, US-111 |
| `IdempotencyKey` | actor_id, key, route, request_hash, status, response_json | spec §10.1 |
| `SystemMeta` | schema_version, seeded_at, db_epoch | bootstrap, reset |
| `ProcedureSnapshotYear` | procedure_id, year, need_cents, available_cents | Filtro per annualità (NFR-002) |
| `ProcedureSearch` (storico FTS5; attuale `TSVECTOR`) | code, title, structure_label, supplier_name, cig, cup | Ricerca (US-011) |
| `DocumentPage` | document_id, page_no, text, method, confidence, png_path | OCR, viewer |
| `FundingLine` | programme, operation, activity, chapter, source, funding_end_date | DEC-035 |
| `CostComponent` | procedure_id, kind (`ANAC_FEE`, `TECH_INCENTIVES`), year, source, amount | DEC-035 |

Estensioni da applicare alle entità esistenti (P-14):
- **`Contract`**: `instrument`, `mepa_order_ref_demo`, `cpv`, `duration_months`, `performance_guarantee_required`, `security_costs`, `vat_rate`.
- **`ContractVersion.reason`** ∈ {`SCHEDULE_CHANGE`, `PAYMENT_PLAN_CHANGE`, `END_DATE_CHANGE`, `SCOPE_CHANGE`, `TERMINATION`}. L'addendum è spesso il documento che porta il piano SAL, circa un mese dopo la stipula.
- **`Document`** (metadati di atto): `act_type`, `act_number_demo`, `registration_date`, `signer_role`, atti richiamati. Un atto (es. una determina di accordo quadro) può essere associato a più procedure.

**Vincoli storici del piano SQLite:** il runtime Postgres applica l'immutabilità tramite trigger PL/pgSQL in `db/sql/triggers.sql` (DEC-115):
- **append-only tramite trigger** `BEFORE UPDATE/DELETE … RAISE(ABORT,'AUDIT_APPEND_ONLY')` sull'audit e sulle tabelle `financial_movement`, `procedure_version`, `payment_forecast_line`, `milestone_forecast`, `alert_notification` e `validation_decision`. Unica eccezione: su `procedure_version` è ammesso impostare l'approvazione quando è ancora NULL;
- i trigger stanno in `db/sql/triggers.sql`, sono riapplicati dopo ogni migrazione e sono verificati da test e da `/ready`.

**CHECK sulle colonne:**
- importi `*_cents INTEGER` con `CHECK (typeof(x)='integer' AND x >= 0)`; i delta con segno esistono solo nei risultati di simulazione, come stringhe in JSON;
- date `CHECK (x IS date(x))`, enum `CHECK (… IN …)`, JSON `CHECK (json_valid(x))`;
- coerenze di riga, ad esempio `net_cents + vat_cents = gross_cents`.

Le chiavi interne sono `INTEGER PRIMARY KEY`. I codici di business (`P-001`) sono `UNIQUE` e sono gli unici che oracle e test possono citare.

### 6.2 Versionamento
`ProcedureVersion` contiene lo snapshot di: date previste delle milestone, righe di previsione di pagamento, importo programmato e motivazione. Ha `version_no`, `is_baseline`, `created_from_simulation_id`, `approved_by`. Il forecast corrente è l'ultima versione approvata. Gli `ACTUAL` stanno su `ProcedureMilestone.actual_date` e sui movimenti, **fuori** dalle versioni (BR-006).

### 6.3 Endpoint aggiuntivi (proposta storica)
> I path seguenti provengono dal piano iniziale e non sono una descrizione dell'API attuale. Consultare `src/app/api/` prima di usare o documentare un endpoint.
`POST /api/procedures/{id}/memory/submit` · `PATCH /api/procedures/{id}/milestones/{mid}` (forecast, sospensione, N/A, con motivazione) · `POST /api/procedures/{id}/cancel` · `POST /api/procedures/{id}/close` · `GET|POST /api/procedures/{id}/budget` · `GET /api/procedures/{id}/forecast?version=` · `POST /api/reschedules/{id}/submit` · `GET /api/reschedules/{id}` · `POST /api/sals/{id}/documents` (fornitore) · `POST /api/sals/{id}/invoices` · `POST /api/sals/{id}/liquidations` · `POST /api/payments/{id}/reverse` · `GET /api/validations` · `POST /api/validations/{id}/decide` · `POST /api/validations/bulk-approve` · `GET /api/anomalies` · `POST /api/alerts/{id}/suspend` · `GET /api/exports/portfolio.(csv|xlsx)` · `GET /api/exports/procedures/{id}.pdf` · `GET /api/documents/{id}/content` · `GET /api/documents/{id}/pages/{n}.png` · `POST /api/admin/impersonate` · `POST /api/admin/reset` (con token di conferma) · `GET /api/admin/jobs` · `GET|POST|PATCH /api/admin/users` · `GET /api/dashboard/operational` · `GET /api/system/status` · `POST /api/auth/logout` · `POST /api/me/active-role` · `GET /api/openapi.json` · `GET /api/docs` · `GET /api/admin/jobs/{id}`.

Precisazioni: `POST /api/jobs/run-checks` risponde `202 {job_id}`; `GET /api/documents/{id}/pages/{n}.png` è servito dallo storage, perché le pagine sono pre-renderizzate dal worker.

---

## 7. Ruoli, account e permessi

### 7.1 Account demo (password da `DEMO_PASSWORD`, default documentato nel README)
| Login | Ruolo | Ambito |
|---|---|---|
| `struttura.si` | `STRUCTURE_USER` | struttura `SISTEMI_INFORMATIVI` (P-001, P-004, P-005) |
| `gare` | `PROCUREMENT_OFFICER` (Ufficio Gare; RUP nominato per procedura) | tutte le strutture |
| `amministrazione` | `FINANCE_OFFICER` | tutte |
| `fornitore.alfa` | `SUPPLIER` | solo il contratto P-004 (Fornitore Demo Alfa S.r.l.) |
| `dirigente` | `EXECUTIVE` (Direttore Generale demo: firma determine, ordini e addendum; non decide le riprogrammazioni, DEC-110) | tutte |
| ~~`validatore`~~ | ruolo soppresso (DEC-109): classificazione dei documenti all'Ufficio Gare, passi in demo all'amministratore | — |
| `admin` | `ADMIN` | tutte e configurazione |

E-mail: `<login>@demo.invalid`. Caselle funzionali (DEC-062): `struttura.<codice-struttura>@demo.invalid`.

### 7.2 Strutture (10, DEV-001)
`SISTEMI_INFORMATIVI`, `PROGRAMMAZIONE_CONTROLLO`, `STUDI_ANALISI`, `COMUNICAZIONE`, `FORMAZIONE`, `INNOVAZIONE_DIGITALE`, `METODOLOGIE_STATISTICHE`, `SICUREZZA_ICT`, `RELAZIONI_INTERNAZIONALI`, `SVILUPPO_COMPETENZE`.

### 7.3 Matrice dei permessi (S = solo nel proprio ambito)
| Azione | STRUCT | PROC | FIN | SUPPL | EXEC | VALID | ADMIN |
|---|---|---|---|---|---|---|---|
| Vedere portafoglio e scheda | S | ✓ | ✓ | solo P-004, campi limitati¹ | ✓ | ✓ | ✓ |
| Creare/modificare bozza, consegnare memoria | S | — | — | — | — | — | ✓ |
| Completare/aggiornare una milestone | owner S | owner | owner | — | — | ✓ | — |
| Creare/inviare una simulazione | — | ✓ | ✓ | — | — | — | — |
| Approvare/rifiutare una simulazione (≠ autore), anche con override (DEC-110) | — | ✓ | — | — | — | — | — |
| Registrare/modificare contratto e addendum | — | ✓ | — | — | — | — | — |
| Definire il piano SAL | S | ✓ | — | — | — | — | — |
| Presentare un SAL e caricare deliverable | S | — | — | contratti propri | — | — | — |
| Verificare/accettare/rigettare un SAL | S (verifica) | ✓ (accetta) | — | — | — | ✓ | — |
| Fatture, liquidazioni, pagamenti, storni | — | — | ✓ | — | — | — | — |
| Gestire la disponibilità per annualità | — | — | ✓ | — | — | — | — |
| Prendere in carico/risolvere un alert | owner S | ✓ | ✓ | — | — | ✓ | — |
| Sospendere un'escalation | — | ✓ | — | — | ✓ | — | — |
| Decidere nella coda di validazione | — | — | — | — | — | ✓ | — |
| Import di documenti | — | — | — | — | — | ✓ | ✓ |
| Export | S | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Leggere l'audit | — | — | — | — | ✓ | ✓ | ✓ |
| Config, utenti, reset, impersonazione, run-checks | — | — | — | — | — | — | ✓ |
| Assistente | S | ✓ | ✓ | — | ✓ | ✓ | ✓ |

¹ Il fornitore vede: oggetto, contratto, SAL, propri deliverable e documenti condivisi. Non vede: disponibilità, alert interni, audit, altre procedure. Un accesso fuori ambito restituisce **403 senza dati** (T-017), anche per gli ID indovinati.

---

## 8. Regole deterministiche precisate

### 8.1 Calendario e date
- Festività nazionali italiane 2026–2028: 1/1, 6/1, Lunedì dell'Angelo (calcolato: 06/04/2026, 29/03/2027, 17/04/2028), 25/4, 1/5, 2/6, 15/8, 1/11, 8/12, 25/12, 26/12. Sabato e domenica non lavorativi. Il patrono locale si configura, non è attivo di default.
- Regola di spostamento: `FORWARD` (giorno lavorativo successivo), configurabile.
- Offset e durate dei modelli sono in **giorni solari**, con spostamento finale al giorno lavorativo. `days_until(d) = (d − reference_date).days` in giorni solari (DEC-010).

### 8.2 Stato delle milestone e della procedura

```
per ogni milestone m della versione corrente:
    due = forecast_date(m)                         # dalla ProcedureVersion corrente
    if m.actual_date:            state = COMPLETED
    elif m.manual_state in {SUSPENDED, NOT_APPLICABLE, CANCELLED}: state = m.manual_state
    elif reference_date > due:   state = OVERDUE
    elif reference_date == due:  state = DUE_TODAY
    elif days_until(due) <= policy(m).reminder_threshold:  state = DUE_SOON   # default 5
    elif days_until(due) <= attention_window:              state = UPCOMING   # default 10
    else:                        state = NOT_STARTED
    m.blocked = manca un documento atteso con timing BEFORE (prerequisito) di m, o esiste un blocker manuale aperto
    m.active  = m non completata/N/A e tutti i predecessori completati o N/A    # DEC-094

status(procedure):
    CANCELLED/CLOSED se impostati da use case
    altrimenti, se esiste una milestone pre-contratto obbligatoria non completata:
        status = phase(prima milestone obbligatoria non completata)
    altrimenti (contratto firmato):
        EXECUTION se esiste un SAL non ACCEPTED o successivo; CLOSING altrimenti
```

### 8.3 Alert ed escalation (`config/alert_policies.yaml`)
| Regola | Bersaglio | Livelli → severità | Destinatari (cumulativi) | Canali |
|---|---|---|---|---|
| `MILESTONE_DEADLINE` (policy `MEMORY`) | `MEMORY_SUBMISSION` attiva | T-1M LOW (DEC-014) · T-10 LOW · T-5 HIGH · T-2 HIGH · T0 HIGH · T+1 CRITICAL | T-1M/T-10/T-5: owner · T-2: +PROCUREMENT · T0/T+1: +EXECUTIVE | T-1M e T-10 solo in-app; poi in-app + e-mail |
| `MILESTONE_DEADLINE` (policy `BLOCKING`) | altre milestone bloccanti attive | T-5 MEDIUM · T0 HIGH · T+1 CRITICAL | owner + PROCUREMENT; T+1: +EXECUTIVE | in-app + e-mail |
| `MILESTONE_DEADLINE` (policy `STANDARD`) | milestone non bloccanti attive | T-5 LOW · T+1 MEDIUM | owner | in-app |
| `SAL_DEADLINE` | scadenza corrente del SAL² | T-5 MEDIUM · T0 HIGH · T+1 CRITICAL (= SAL scaduto, BR-013) | STRUCTURE@ambito + PROCUREMENT; T+1: +EXECUTIVE | in-app + e-mail |
| `PAYMENT_DEADLINE` | `payment_due_date` di SAL `LIQUIDATED` | T-5 MEDIUM · T0 HIGH · T+1 CRITICAL | FINANCE; T+1: +EXECUTIVE | in-app + e-mail |
| `RESCHEDULE_REQUIRED` | procedura con milestone bloccante a T+1 | HIGH | PROCUREMENT + FINANCE | in-app + e-mail (template A.2) |
| `BUDGET_OVERFLOW` | forecast approvato > disponibilità | CRITICAL | FINANCE + EXECUTIVE | in-app + e-mail |

² Scadenza corrente del SAL: `PLANNED` → `due_date`; `SUBMITTED`/`UNDER_REVIEW` → `review_due_date` (presentazione + `sal.review_term_days`, default 15); `ACCEPTED`/`INVOICED` → nessuna (se c'è fattura: data fattura + `payment_term_days`, default 30 → `payment_due_date`). Massimi di legge in DEC-037. Gli alert SAL valgono solo per i contratti firmati.

Regole operative:
- Le soglie si leggono come `days_until(due) <= soglia`. T0 = giorno della scadenza; T+1 = `days_until <= -1`.
- `run_checks(reference_date)` è idempotente: rieseguirlo non crea duplicati (DEC-011/012).
- Chiusura automatica quando la condizione cade: milestone completata, SAL avanzato, pagamento eseguito, nuova `due_date` approvata.
- La risoluzione manuale richiede una nota e **non** modifica milestone o finanza (US-043).
- Le procedure `CLOSED`/`CANCELLED` non generano alert ordinari.

### 8.4 Health (DEC-050), valutato nell'ordine
1. `CANCELLED`, `DRAFT` → **NEUTRAL**. `CLOSED` → **GREEN**.
2. **RED** se almeno uno: milestone bloccante attiva `OVERDUE`; SAL con `overdue`; pagamento dovuto scaduto; `BUDGET_OVERFLOW` sul forecast approvato; anomalia `CRITICAL`; violazione di un'invariante finanziaria.
3. **AMBER** se almeno uno: scadenza attiva (milestone, SAL, pagamento) entro la finestra di attenzione (`0 ≤ days_until ≤ 10`); milestone non bloccante `OVERDUE`; anomalia aperta `HIGH` o `MEDIUM`.
4. Altrimenti **GREEN**.

Ogni risultato espone `health_drivers` (codice regola + bersaglio), da mostrare in UI ("Regola causale visibile", US-032). Vale la severità maggiore.

### 8.5 Riprogrammazione (§6.2 della specifica, resa precisa)
**Input:** `source_milestone`, `candidate_date`, `cause`, `notes`, `alternative_kind`, `base_version_id`.

1. **Validazione.** La sorgente non deve essere completata. `candidate_date ≥ reference_date` e `≥ actual(predecessore) + min_duration`. Le date bloccate (config) vengono saltate.
2. **Propagazione** in ordine topologico: `new(src) = roll(candidate)`. Per ogni successore `m` non completato né N/A: `new(m) = roll(max(forecast(m) + Δ, new(pred(m)) + min_duration(m)))`, con `Δ = new(src) − forecast(src)`. Le milestone completate non cambiano (BR-006).
3. **Righe di pagamento** non pagate la cui ancora ha cambiato data: `new_date = roll(date + (new(anchor) − forecast(anchor)))`. Le righe ancorate a un SAL seguono l'ancora del SAL.
4. **Fabbisogno annuo** = pagato nell'anno + righe non pagate dell'anno, ricalcolato.
5. **Criticità:**

   | Codice | Condizione | Severità |
   |---|---|---|
   | `BUDGET_OVERFLOW` | fabbisogno anno > disponibilità anno (importo = differenza) | BLOCKING |
   | `FUNDING_END_EXCEEDED` | riga oltre `funding_end_date` (se configurata) | BLOCKING |
   | `MILESTONE_BEYOND_LIMIT` | milestone oltre una data limite configurata | WARNING |
   | `COMMITMENT_MISMATCH` | fabbisogno anno < impegnato nell'anno | WARNING |

6. **Output:** `date_changes` (numero di milestone con data cambiata), `amount_shifted` (Σ importi delle righe che cambiano anno), `annual_impact` (dopo − prima, per anno), `criticalities[]`, `changes[]` (prima/dopo/delta) e `critical_path`. Si salva come `DRAFT`; **nessun dato corrente cambia**.
7. **Approvazione** (DEC-042/043): crea `ProcedureVersion n+1`, chiude `reschedule_required`, rilancia `run_checks` sulla procedura e scrive l'audit con prima/dopo. **Rifiuto**: motivazione obbligatoria, nessun'altra modifica.

### 8.6 Finanza e KPI
- **Per SAL:** `paid ≤ liquidated ≤ accepted ≤ sal_amount`. **Per contratto:** `Σ paid ≤ Σ liquidated ≤ Σ accepted ≤ gross`. Pagamento oltre il liquidato disponibile (`liquidated − paid` del SAL) → `422 FINANCIAL_INVARIANT_VIOLATION`, con `details.available`/`requested` (T-024).
- Un pagamento parziale porta il SAL in `PARTIALLY_PAID` e il SAL resta aperto (BR-012).
- `residual_to_pay` = 0 se `CANCELLED`, altrimenti `base − Σ pagamenti validi`, dove `base` = lordo del contratto firmato se esiste, altrimenti l'importo programmato della versione corrente.
- `annual_need(y)` = pagato in y + righe non pagate in y. `available(y)` = Σ `BudgetAllocation` di y.
- **Annullamento** (BR-020): `RELEASE` = Σ `RESERVATION` non coperte da `COMMITMENT`. Gli impegni non si cancellano: se ce ne sono, si genera un'anomalia `COMMITTED_ON_CANCELLED`.
- **KPI dashboard** (le procedure `CANCELLED` sono escluse dagli importi):

  | KPI | Definizione |
  |---|---|
  | `procedures_total` | tutte le procedure |
  | `procedures_late` | procedure non terminali con milestone attiva `OVERDUE` o SAL `overdue` |
  | `to_reschedule` | `reschedule_required = true` |
  | `critical_alerts` | alert aperti `CRITICAL` (le anomalie sono escluse) |
  | `programmed` | Σ importo programmato della versione corrente |
  | `contracted` | Σ lordo dei contratti **firmati** |
  | `paid` | Σ pagamenti validi |
  | `at_risk` | DEC-051 |
- "Dato non disponibile" ≠ 0: le API restituiscono `null` con `reason` e la UI mostra "n.d.".

### 8.7 Anomalie (US-083)
| Codice | Condizione | Severità |
|---|---|---|
| `DATE_SEQUENCE_INCONSISTENT` | `actual` di un successore < `actual` del predecessore | HIGH |
| `DATE_IMPOSSIBLE` | data non valida, oppure `actual` > data di riferimento | HIGH |
| `SAL_PLAN_NOT_100` | Σ pct ≠ 100 senza eccezione configurata | HIGH |
| `AMOUNTS_NOT_RECONCILED` | `net + vat ≠ gross`, oppure Σ righe forecast + pagato ≠ programmato | HIGH |
| `PAYMENT_OVER_CONTRACT` | Σ pagato > lordo | CRITICAL |
| `EXPECTED_DOCUMENT_MISSING` | timing `BEFORE` (prerequisito): manca e la milestone è attiva con `days_until ≤ 10` o è `OVERDUE`. Timing `WITH` (deliverable): manca e la milestone è l'**ultima completata** della catena. Le procedure `CLOSED`/`CANCELLED` sono escluse. | da modello (es. garanzia HIGH, documento tecnico MEDIUM) |
| `IDENTIFIER_CONFLICT` | CIG/CUP del documento ≠ quello della procedura | HIGH |
| `COMMITTED_ON_CANCELLED` | procedura annullata con impegni | HIGH |
| `PROCEDURE_TYPE_THRESHOLD_MISMATCH` | tipologia incoerente con il netto e con le soglie di DEC-036 | MEDIUM, **disattivata nel seed** |
| `SOURCE_STATUS_MISMATCH` | stato del workbook diverso dallo stato calcolato (import) | LOW, **disattivata nel seed** |
| `OPERATION_PLAN_EXCEEDED` | Σ impegni dell'operazione PN nell'anno > totale del piano | WARNING, **disattivata nel seed** |

Le regole disattivate nel seed restano implementate e testate con fixture dedicate. Se fossero attive, aggiungerebbero all'oracle anomalie non previste (ad esempio su P-002, che è sopra soglia: DEV-005). `DATE_SEQUENCE_INCONSISTENT` vale anche per le date citate negli atti.

Nessuna anomalia corregge i dati. I conflitti fra valore estratto e valore validato producono un elemento `CONFLICT` nella coda di validazione, **non** un'anomalia.

---

## 9. Modelli di procedura dimostrativi

> `illustrative: true`: **non sono termini di legge** (D-01, `DA VALIDARE`). Seguono la regola di pianificazione INAPP dei 1/4/7/9 mesi documentata nel workbook ([05 §2.4](05_analisi_documenti_reali.md)). I minimi rispettano il D.lgs. 36/2023 ([08 §5](08_risposte_criticita.md)). Formato `config/templates/<code>.yaml`, letto con `yaml` e validato con Zod; la validazione rifiuta le dipendenze cicliche (US-100).

### 9.1 Scelta del modello (DEC-020)
| Tipologia | Condizione | Modello | `duration_months` |
|---|---|---|---|
| `DIRECT_AWARD`, `DIRECT_AWARD_MEPA`, `MEPA_ORDER`, `CENTRAL_PURCHASING_ORDER` | — | `AD-1M-v1` | 1 |
| `NEGOTIATED` | `award_criterion = LOWEST_PRICE` (default) | `NEG-4M-v1` | 4 |
| `NEGOTIATED` | `award_criterion = MEAT` (OEPV con commissione) | `NEG-7M-v1` | 7 |
| `OPEN` | — | `OPEN-9M-v1` | 9 |
| `FRAMEWORK_AGREEMENT` | AQ indetto da INAPP (default) | `FA-9M-v1` | 9 |
| `FRAMEWORK_AGREEMENT` | `instrument = CONSIP_AQ` (adesione o contratto esecutivo) | `FA-ADH-2M-v1` | 2 |

### 9.2 Milestone e durate
Colonne: offset di default dal predecessore / durata minima, in giorni solari. Ogni milestone dipende dalla precedente. `B` = bloccante (BR-004). I **codici** sono stabili e l'oracle li usa; le **etichette** sono quelle reali.

| # | Codice | Etichetta | Fase (mentre è pendente) | Owner | AD-1M | NEG-4M | NEG-7M | OPEN-9M | FA-9M |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `MEMORY_SUBMISSION` **B** | Consegna memoria al Direttore Generale | MEMORY_EXPECTED | STRUCTURE | 0 | 0 | 0 | 0 | 0 |
| 2 | `REVIEW_COMPLETED` | Determina di indizione (a contrarre) | PRELIMINARY_REVIEW | PROCUREMENT | 7/3 | 15/10 | 30/10 | 45/15 | 45/15 |
| 3 | `INVITATION_SENT` / `CALL_PUBLISHED` | Avvio TD/RdO o pubblicazione del bando | PRELIMINARY_REVIEW | PROCUREMENT | — | 10/5 | 10/3 | 15/5 | 15/5 |
| 4 | `OFFERS_DEADLINE` | Termine offerte | TENDERING | PROCUREMENT | — | 20/10 | 25/10 | 35/**30** | 35/**30** |
| 5 | `EVALUATION_COMPLETED` | Valutazione completata (commissione) | TENDERING | PROCUREMENT | — | — | — | 90/20 | 90/20 |
| 6 | `AWARD` **B** | Determina di aggiudicazione | TENDERING | PROCUREMENT | 10/3 | 25/10 | 90/30 | 30/5 | 30/5 |
| 7 | `AWARD_EFFECTIVE` | Adempimenti pre-stipula (garanzia, documenti, termine dilatorio) | AWARDED | PROCUREMENT | 5/2 | 20/7 | 25/0 | 35/**32** | 35/**32** |
| 8 | `CONTRACT_SIGNED` **B** | Stipula (contratto, oppure ordine o documento di stipula MePA) | CONTRACTING | PROCUREMENT | 8/2 | 30/3 | 30/0 | 20/0 | 20/0 |
| | **Totale di default** | | | | **30 gg** | **120 gg (7 milestone)** | **210 gg** | **270 gg** | **270 gg** |

- **`AWARD_EFFECTIVE`:** con il D.lgs. 36/2023 l'aggiudicazione è immediatamente efficace (art. 17, c. 5). Questa milestone rappresenta gli adempimenti tra l'aggiudicazione e la stipula: garanzia, documenti e, sopra soglia, il termine dilatorio.
- **`REVIEW_COMPLETED`:** in INAPP la determina di indizione **assume già gli impegni di spesa per annualità** (`COMMITMENT`).

**Vincoli di legge, controllati come WARNING `MILESTONE_BEYOND_LIMIT`:**
- termine offerte della procedura aperta ≥ 30 gg (art. 71, c. 2); 15 gg solo con il flag `urgency`;
- termine dilatorio di 32 gg sopra soglia (art. 18, c. 3); non si applica agli appalti basati su AQ;
- stipula entro 60 gg dall'aggiudicazione (art. 18, c. 2);
- massimi dell'Allegato I.3 dal bando all'aggiudicazione.

**`FA-ADH-2M-v1`** (adesione o contratto esecutivo su AQ/convenzione Consip): `MEMORY_SUBMISSION` → `REVIEW_COMPLETED` 30/10 → `AWARD` (ordinativo o contratto esecutivo) 15/3 → `AWARD_EFFECTIVE` (garanzia) 10/0 → `CONTRACT_SIGNED` 5/0. Totale 60 gg; le milestone 3–5 sono `NOT_APPLICABLE`.

**Profili di durata.** Il profilo `demo` (questa tabella) è il default e su di esso regge l'oracle. Il profilo `realistic` (illustrativo, non attivo nel seed) usa le mediane reali memoria → stipula osservate nel workbook: affidamento diretto/TD ≈ 108 gg, negoziata ≈ 266 gg, aperta ≈ 327 gg ([05 §4.2](05_analisi_documenti_reali.md)). Serve a mostrare a INAPP il divario fra pianificazione e realtà.

**Calcolo a ritroso** (DEC-026): `memory_due = EDATE(activity_start, −duration_months)` quando manca la data della memoria.

### 9.3 Documenti attesi
| Milestone | Documento | Timing | Severità |
|---|---|---|---|
| `MEMORY_SUBMISSION` | `MEMORIA` | WITH | HIGH |
| `MEMORY_SUBMISSION` | `DOCUMENTO_TECNICO` (sottotipi `CAPITOLATO` per le gare, `SCHEDA_OFFERTA` per ODA/TD) | WITH | MEDIUM |
| `REVIEW_COMPLETED` | `DETERMINA_INDIZIONE` | WITH | HIGH |
| `AWARD` | `DETERMINA_AGGIUDICAZIONE` | WITH | HIGH |
| `CONTRACT_SIGNED` | `GARANZIA_DEFINITIVA`, in **tutti** i modelli salvo `performance_guarantee_exempt = true` (art. 117 sopra soglia; art. 53, c. 4 sotto soglia) | BEFORE | HIGH |
| `CONTRACT_SIGNED` | `CONTRATTO` (sottotipi `CONTRATTO_PUBBLICO`, `ODA_MEPA`, `TD_MEPA`, `CONTRATTO_ESECUTIVO_AQ`) | WITH | HIGH |

- `WITH` = il documento si consegna al completamento della milestone. `BEFORE` = è un prerequisito: se manca, imposta `blocked` (§8.2, §8.7).
- Elenco completo dei tipi di documento in [05 §8.4](05_analisi_documenti_reali.md).
- Policy alert: `MEMORY_SUBMISSION` → `MEMORY`; le altre **B** → `BLOCKING`; le restanti → `STANDARD`.
- `min_lead_days` (DEC-040): 10 per tutte.
- Dopo `CONTRACT_SIGNED` l'esecuzione è governata da contratto e SAL, con milestone contrattuali distinte (US-062). Il piano SAL arriva spesso con l'addendum.

Esempio di formato:

```yaml
code: NEG-4M-v1
illustrative: true
valid_from: 2026-01-01
duration_months: 4
selection: {procedure_types: [NEGOTIATED], award_criterion: LOWEST_PRICE}
milestones:
  - {code: MEMORY_SUBMISSION, label: "Consegna memoria al Direttore Generale", phase: MEMORY_EXPECTED,
     owner: STRUCTURE, mandatory: true, blocking: true, depends_on: null, offset_days: 0, min_duration_days: 0,
     alert_policy: MEMORY, min_lead_days: 10,
     expected_documents: [{type: MEMORIA, timing: WITH, severity: HIGH},
                          {type: DOCUMENTO_TECNICO, timing: WITH, severity: MEDIUM}]}
  - {code: REVIEW_COMPLETED, label: "Determina di indizione (a contrarre)", phase: PRELIMINARY_REVIEW,
     owner: PROCUREMENT, mandatory: true, blocking: false, depends_on: MEMORY_SUBMISSION,
     offset_days: 15, min_duration_days: 10, alert_policy: STANDARD,
     expected_documents: [{type: DETERMINA_INDIZIONE, timing: WITH, severity: HIGH}]}
  # … INVITATION_SENT, OFFERS_DEADLINE, AWARD (blocking), AWARD_EFFECTIVE, CONTRACT_SIGNED (blocking)
```

---

## 10. Seed e oracle

### 10.1 Principi
- **Il seed è fatto di input (DEC-095); l'oracle (`seed/expected_results.json`) contiene i risultati attesi.** L'oracle si scrive in I0 **a mano**, trascrivendo i valori di questa sezione, e non si genera mai dall'output del codice.
- Test oracle: DB vuoto → seed → `run_checks(2026-10-01)` → confronto campo per campo. Le sezioni si attivano progressivamente con `ORACLE_SECTIONS` (elenco esplicito nel test; vedi §11), **senza skip silenziosi**.
- Tutti i record hanno `is_demo = true`; CIG `CIG-DEMO-Pxxx`, CUP `CUP-DEMO-Pxxx`; fornitori "Fornitore Demo Alfa S.r.l." (P-004) e "Fornitore Demo Beta S.r.l." (P-010); nessuna persona reale.
- File: `users.json`, `structures.json`, `suppliers.json`, `process_templates` (da `/config/templates`), `procedures.xlsx` (workbook baseline che **imita il layout reale**: foglio `Gare_23-27` con le stesse intestazioni del workbook INAPP, elencate in [05 §8.3](05_analisi_documenti_reali.md); una riga per P-001…P-012; le colonne `Impegno 2026/2027/2028` coincidono con il fabbisogno annuo della §10.3; `importo della tassa` = 0; più una riga `TOTALI`, un foglio `Esperti_23-27` con 2 righe da scartare e un foglio nascosto `*_OLD` da ignorare. È la sorgente `SEED_FILE`, con foglio e cella come evidenza), `procedures-details.json` (milestone e date effettive), `budget_allocations.json`, `payment_forecast_lines.json`, `contracts.json`, `sals.json`, `financial_movements.json`, `events.json` (annullamento P-011, chiusura P-006), `extraction_proposals.json` (proposte "seed" per I5), `documents/`, `fixtures/` (solo test, compreso `procedures_messy.xlsx` con i casi di qualità del dato di [05 §2.8](05_analisi_documenti_reali.md)), `expected_results.json`.
- **Formati.** Importi sempre come stringa decimale a 2 cifre (`"120000.00"`): un importo `number` è rifiutato dal loader con `SEED_FORMAT_ERROR`. Percentuali come stringa (`"20.00"`), date `"YYYY-MM-DD"`. Ogni file è validato con lo schema Zod di `src/contracts/seed/`, e gli errori riportano file e percorso.
- **Password.** `users.json` non contiene password: gli hash argon2id si calcolano al seed da `DEMO_PASSWORD`, con salt casuale. Per questo T-002 confronta conteggi e chiavi naturali, non gli hash.
- **Workbook.** `procedures.xlsx` è generato **una volta** da `scripts/generate-seed-workbook.ts` (exceljs) e versionato. Importi in celle numeriche con al massimo 2 decimali, date in celle di testo ISO, nessuna formula. Il loader converte con `Money.parse(String(n))` e rifiuta valori con più di 2 decimali.
- **Import del workbook reale (US-010).** Mappatura in `config/import/workbook_mapping.yaml`, con le regole di qualità del dato Q1–Q21 di [05 §2.8](05_analisi_documenti_reali.md) e un report per foglio (importate, scartate, errori per cella). **I dati reali non entrano mai nel seed (DEC-071).**
- Date effettive non indicate qui: plausibili, in ordine cronologico, tutte < 01/10/2026 e coerenti con le durate minime. **Unica eccezione voluta:** P-010 (vedi sotto).
- Date previste non indicate qui: predecessore + offset di default, con spostamento al giorno lavorativo.
- `due_date` dei SAL non indicate qui: data della riga di pagamento − 45 giorni, con spostamento al giorno lavorativo (P-010 SAL1: 15/09 → riga 30/10, coerente).
- I piani SAL **pre-contratto** (P-001, P-003, P-005, P-007, P-012) non generano `SAL_DEADLINE`: gli alert SAL valgono solo per contratti firmati.
- Documenti presenti ([§10.7](#107-documenti-seed-dec-070)) e regola della §8.7 producono **solo** le 3 anomalie della §10.4. Se l'implementazione ne trova altre, il problema è nel seed o nella regola: non aggiornare l'oracle.

### 10.2 Portafoglio: fatti di input
Importi lordi (DEC-032). `L` = riga di previsione `PaymentForecastLine` (data · importo · ancora).

**P-001 — Manutenzione evolutiva OrientaLab** · `DIRECT_AWARD_MEPA` → AD-1M · SISTEMI_INFORMATIVI · programmato 120.000,00
- Memoria prevista **06/10/2026**, non consegnata. Documenti: bozza di memoria. Nessun contratto (DEV-002).
- Piano SAL pre-contratto 20/50/30, ancora `CONTRACT_SIGNED`: L 15/12/2026 · 24.000,00 · L 31/03/2027 · 60.000,00 · L 30/06/2027 · 36.000,00.
- Disponibilità: 2026 = 50.000; 2027 = 120.000.

**P-002 — Supporto metodologico e PM** · `NEGOTIATED` → NEG-4M · PROGRAMMAZIONE_CONTROLLO · 480.000,00
- La tipologia è mantenuta anche se il netto (≈ 393.000 €) supera la soglia UE: cambiarla altererebbe i valori del DoD (DEV-005).
- Memoria prevista **25/09/2026**, non consegnata. Le altre 6 milestone sono generate dal modello.
- SAL "da definire" → righe seedate ancorate a `MEMORY_SUBMISSION` (CR-32): L 16/10/2026 · 50.000 · L 27/11/2026 · 150.000 · L 30/04/2027 · 280.000.
- Disponibilità: 2026 = 300.000; 2027 = 350.000.

**P-003 — Indagine campionaria multicanale** · `OPEN` → OPEN-9M · STUDI_ANALISI · 720.000,00
- Memoria consegnata il 10/09/2026; `REVIEW_COMPLETED` prevista 23/10/2026.
- SAL 70/30, ancora `CONTRACT_SIGNED`: L 30/09/2027 · 504.000 · L 31/03/2028 · 216.000.
- Disponibilità: 2027 = 600.000; 2028 = 300.000.

**P-004 — Assistenza specialistica DWH** · `NEGOTIATED` (RdO al minor prezzo) → NEG-4M · SISTEMI_INFORMATIVI · 238.000,00
- Tipologia corretta rispetto alla specifica (affidamento diretto), perché il netto supera i 140.000 € (CR-31, M-12). Le 7 milestone pre-contratto sono tutte completate; stipula il 15/05/2026.
- Contratto: netto 195.081,97 + IVA 42.918,03 = **238.000,00**; Fornitore Alfa; decorrenza 20/05/2026; 12 mesi.
- SAL 20/50/30 = 47.600 / 119.000 / 71.400:
  - SAL1 `PAID` (liquidato 01/07, pagato 15/07/2026);
  - SAL2 `SUBMITTED` il 21/09/2026 → verifica entro **06/10/2026**, previsione di pagamento L 20/10/2026 · 119.000;
  - SAL3 `PLANNED`, L 31/03/2027 · 71.400.
- Movimenti: COMMITMENT 238.000 (2026: 166.600; 2027: 71.400), LIQUIDATION 47.600, PAYMENT 47.600.
- Disponibilità: 2026 = 200.000; 2027 = 100.000.

**P-005 — Servizi cloud e continuità** · `FRAMEWORK_AGREEMENT` (AQ indetto da INAPP) → FA-9M · SISTEMI_INFORMATIVI · 310.000,00
- Completate fino ad `AWARD_EFFECTIVE`. `CONTRACT_SIGNED` prevista **28/09/2026**, con blocker: garanzia definitiva mancante.
- Contratto in bozza (aggiudicato): 254.098,36 + 55.901,64 = 310.000,00.
- SAL 20/80, ancora `CONTRACT_SIGNED`: L 15/12/2026 · 62.000 · L 30/06/2027 · 248.000.
- Disponibilità: 2026 = 100.000; 2027 = 400.000.
- Documento di aggiudicazione con importo **310.500,00** → conflitto economico in coda di validazione.

**P-006 — Audit accessibilità portali** · `DIRECT_AWARD` → AD-1M · COMUNICAZIONE · 39.650,00
- Contratto 32.500 + 7.150 = 39.650. SAL unico 100% `PAID` il 30/06/2026.
- Movimenti: COMMITMENT, LIQUIDATION, PAYMENT da 39.650.
- Evento `close_procedure` il 31/07/2026. Disponibilità: 2026 = 39.650.

**P-007 — Servizi logistici eventi** · `NEGOTIATED` → NEG-4M · FORMAZIONE · 146.400,00
- Memoria consegnata il 18/09/2026 (PDF **scansionato**, OCR). Documento tecnico **assente**. `REVIEW_COMPLETED` prevista 16/10/2026.
- SAL 20/50/30, ancora `CONTRACT_SIGNED`: L 18/12/2026 · 29.280 · L 30/04/2027 · 73.200 · L 30/07/2027 · 43.920.
- Disponibilità: 2026 = 50.000; 2027 = 150.000.

**P-008 — Evoluzione piattaforma politiche attive** · `OPEN` → OPEN-9M · INNOVAZIONE_DIGITALE · 890.000,00
- Completate fino a `EVALUATION_COMPLETED`. `AWARD` prevista **21/09/2026**, non completata.
- SAL "da definire" → righe ancorate ad `AWARD`: L 23/10/2026 · 100.000 · L 20/11/2026 · 250.000 · L 30/06/2027 · 400.000 · L 31/03/2028 · 140.000.
- Disponibilità: 2026 = 400.000; 2027 = 300.000 (`ORDINARIO_DEMO`) + 250.000 (`PROGETTO_UE_DEMO`) = **550.000**; 2028 = 200.000.

**P-009 — Licenze software statistiche** · `CENTRAL_PURCHASING_ORDER` (ordinativo su convenzione Consip) → AD-1M · METODOLOGIE_STATISTICHE · 305.000,00
- Tipologia corretta rispetto alla specifica (ordine MePA): 250.000 € netti superano sia la soglia dell'affidamento diretto sia quella UE (CR-31, M-12).
- Ordinativo 250.000 + 55.000 = 305.000, firmato il 01/07/2026.
- SAL unico 100% `LIQUIDATED`: fattura 08/09/2026, termine 30 gg → pagamento dovuto **08/10/2026**; liquidazione 18/09/2026. Riga L 08/10/2026 · 305.000 (ancora: SAL).
- Movimenti: COMMITMENT 305.000, LIQUIDATION 305.000. Disponibilità: 2026 = 305.000.

**P-010 — Assessment sicurezza e PT** · `NEGOTIATED` → NEG-4M · SICUREZZA_ICT · 210.000,00
- `AWARD` effettiva il 20/06/2026, ma `CONTRACT_SIGNED` effettiva il **10/06/2026**: incoerenza voluta → `DATE_SEQUENCE_INCONSISTENT`.
- Contratto 172.131,15 + 37.868,85 = 210.000; Fornitore Beta; decorrenza 15/06/2026.
- SAL 30/40/30 = 63.000 / 84.000 / 63.000:
  - SAL1 `PLANNED` con scadenza **15/09/2026** (non presentato), L 30/10/2026 · 63.000;
  - SAL2 L 15/12/2026 · 84.000;
  - SAL3 L 30/04/2027 · 63.000.
- Movimenti: COMMITMENT 210.000 (2026: 147.000; 2027: 63.000). Disponibilità: 2026 = 150.000; 2027 = 70.000.

**P-011 — Traduzione e revisione linguistica** · `DIRECT_AWARD` → AD-1M · RELAZIONI_INTERNAZIONALI · 75.000,00
- Movimento RESERVATION 75.000 (2026). Evento `cancel_procedure` il 10/09/2026 → il **sistema genera** `RELEASE` 75.000.
- Disponibilità: 2026 = 75.000.

**P-012 — Formazione avanzata dati e IA** · `NEGOTIATED` → NEG-4M · SVILUPPO_COMPETENZE · 180.000,00
- `AWARD` effettiva il 24/09/2026; `AWARD_EFFECTIVE` prevista 12/10/2026; `CONTRACT_SIGNED` prevista **15/10/2026**.
- Contratto in bozza 147.540,98 + 32.459,02 = 180.000.
- SAL 30/40/30, ancora `CONTRACT_SIGNED`: L 15/12/2026 · 54.000 · L 31/03/2027 · 72.000 · L 30/06/2027 · 54.000.
- Disponibilità: 2026 = 60.000; 2027 = 130.000.

Conteggi: 12 procedure, 10 strutture, 7 account, 6 modelli (AD-1M, NEG-4M, NEG-7M, OPEN-9M, FA-9M, FA-ADH-2M), oltre 60 milestone, 12 fascicoli, 22 documenti più il workbook, 6 contratti, 21 SAL (pianificati e contrattuali), 11 movimenti (incluso il RELEASE generato). Le differenze dai minimi della §7.1 sono registrate in DEV-001.

### 10.3 Oracle per procedura al 01/10/2026
| ID | Stato | Health | Driver dell'health | Prossima scadenza | Rip. richiesta | Fabbisogno annuo (forecast approvato) | Pagato | Residuo | A rischio |
|---|---|---|---|---|---|---|---|---|---|
| P-001 | MEMORY_EXPECTED | AMBER | memoria fra 5 gg | 06/10/2026 (+5) | no | 2026: 24.000 · 2027: 96.000 | 0 | 120.000 | 0 |
| P-002 | MEMORY_EXPECTED | RED | memoria scaduta (bloccante) | 25/09/2026 (−6) | **sì** | 2026: 200.000 · 2027: 280.000 | 0 | 480.000 | 200.000 |
| P-003 | PRELIMINARY_REVIEW | GREEN | — | 23/10/2026 (+22) | no | 2027: 504.000 · 2028: 216.000 | 0 | 720.000 | 0 |
| P-004 | EXECUTION | AMBER | verifica SAL2 fra 5 gg | 06/10/2026 (+5) | no | 2026: 166.600 · 2027: 71.400 | 47.600 | **190.400** | 0 |
| P-005 | CONTRACTING | RED | stipula scaduta (bloccante); garanzia mancante | 28/09/2026 (−3) | **sì** | 2026: 62.000 · 2027: 248.000 | 0 | 310.000 | 62.000 |
| P-006 | CLOSED | GREEN | — | — | no | 2026: 39.650 | 39.650 | 0 | 0 |
| P-007 | PRELIMINARY_REVIEW | AMBER | documento tecnico mancante | 16/10/2026 (+15) | no | 2026: 29.280 · 2027: 117.120 | 0 | 146.400 | 0 |
| P-008 | TENDERING | RED | aggiudicazione scaduta (bloccante) | 21/09/2026 (−10) | **sì** | 2026: 350.000 · 2027: 400.000 · 2028: 140.000 | 0 | 890.000 | 350.000 |
| P-009 | CLOSING | AMBER | pagamento dovuto fra 7 gg | 08/10/2026 (+7) | no | 2026: 305.000 | 0 | 305.000 | 0 |
| P-010 | EXECUTION | RED | SAL1 scaduto; date incoerenti | 15/09/2026 (−16) | no | 2026: 147.000 · 2027: 63.000 | 0 | 210.000 | 0 |
| P-011 | CANCELLED | NEUTRAL | — | — | no | — | 0 | 0 | 0 |
| P-012 | AWARDED | GREEN | — | 12/10/2026 (+11) | no | 2026: 54.000 · 2027: 126.000 | 0 | 180.000 | 0 |

Distribuzione: GREEN 3 · AMBER 4 · RED 4 · NEUTRAL 1 (uguale alla tabella 7.2 della specifica).

### 10.4 Alert, anomalie e outbox attesi dopo `run_checks(2026-10-01)`
| Procedura | Regola · bersaglio | Livello · severità | Destinatari risolti |
|---|---|---|---|
| P-001 | MILESTONE_DEADLINE · MEMORY_SUBMISSION | T-5 · HIGH | struttura.si (in-app + e-mail) |
| P-002 | MILESTONE_DEADLINE · MEMORY_SUBMISSION | T+1 · CRITICAL | struttura.programmazione-controllo@demo.invalid (solo e-mail), gare, dirigente |
| P-002 | RESCHEDULE_REQUIRED | HIGH | gare, amministrazione |
| P-004 | SAL_DEADLINE · SAL2 (verifica) | T-5 · MEDIUM | struttura.si, gare |
| P-005 | MILESTONE_DEADLINE · CONTRACT_SIGNED | T+1 · CRITICAL | gare, dirigente |
| P-005 | RESCHEDULE_REQUIRED | HIGH | gare, amministrazione |
| P-008 | MILESTONE_DEADLINE · AWARD | T+1 · CRITICAL | gare, dirigente |
| P-008 | RESCHEDULE_REQUIRED | HIGH | gare, amministrazione |
| P-010 | SAL_DEADLINE · SAL1 (= SAL scaduto) | T+1 · CRITICAL | struttura.sicurezza-ict@demo.invalid (solo e-mail), gare, dirigente |

- **Totali:** 9 alert aperti, di cui 4 `CRITICAL`. Notifiche: **17 in-app** e **19 e-mail** in outbox. Una seconda esecuzione di `run_checks` non aggiunge nulla.
- **Anomalie:** P-005 `EXPECTED_DOCUMENT_MISSING` (garanzia, HIGH) · P-007 `EXPECTED_DOCUMENT_MISSING` (documento tecnico, MEDIUM) · P-010 `DATE_SEQUENCE_INCONSISTENT` (HIGH).
- **Coda di validazione:** almeno P-005 `CONFLICT` sull'importo (310.500,00 estratto contro 310.000,00 validato).
- **Simulazioni automatiche `DRAFT`** (DEC-041) su P-002, P-005, P-008, con alternativa FASTEST al 12/10/2026 e `amount_shifted = 0`.

### 10.5 Simulazioni attese
| Scenario | Input | `date_changes` | `amount_shifted` | `annual_impact` | Criticità |
|---|---|---|---|---|---|
| S-02 / T-006–T-007 · P-002 MANUAL | `MEMORY_SUBMISSION` → **2026-11-16** (Δ +52) | 7 | 150.000,00 | 2026: −150.000 · 2027: +150.000 | `BUDGET_OVERFLOW` 2027 **80.000,00** BLOCKING |
| P-002 FASTEST (= MIN_ANNUAL_IMPACT, accorpate) | → 2026-10-12 (Δ +17) | 7 | 0,00 | — | nessuna |
| S-04 · P-005 MANUAL | `CONTRACT_SIGNED` → **2026-11-12** (Δ +45) | 1 | 62.000,00 | 2026: −62.000 · 2027: +62.000 | nessuna (2027: 310.000 ≤ 400.000) |
| S-05 / T-008 · P-008 MANUAL | `AWARD` → **2026-11-20** (Δ +60) | 3 | 250.000,00 | 2026: −250.000 · 2027: +250.000 | `BUDGET_OVERFLOW` 2027 **100.000,00** BLOCKING |

Movimento delle righe, verificato con il calendario della §8.1:
- **P-002:** 16/10 → 07/12/2026; 27/11/2026 → 18/01/2027; 30/04 → 21/06/2027.
- **P-005:** 15/12/2026 → 29/01/2027; 30/06 → 16/08/2027 (il 14/08 è sabato e il 15/08 festivo).
- **P-008:** 23/10 → 22/12/2026; 20/11/2026 → 19/01/2027; 30/06 → 30/08/2027; 31/03 → 30/05/2028.

Demo (§13.3 della specifica): si confrontano FASTEST e MANUAL su P-002. Si **approva FASTEST**: nuova versione v2, baseline intatta, il flag si chiude e i reminder si riarmano sul 12/10. Su un'altra simulazione si mostra il rifiuto motivato (T-010). In alternativa, l'approvazione di MANUAL richiede l'override del Dirigente.

### 10.6 KPI attesi al seed (T-025)
| KPI | Valore |
|---|---|
| `procedures_total` | 12 |
| `procedures_late` | 4 (P-002, P-005, P-008, P-010) |
| `to_reschedule` | 3 (P-002, P-005, P-008) |
| `critical_alerts` | 4 |
| `programmed` | 3.639.050,00 (P-011 esclusa) |
| `contracted` | 792.650,00 (P-004, P-006, P-009, P-010) |
| `paid` | 87.250,00 |
| `at_risk` | 612.000,00 (uncovered 0,00 + slipping 612.000,00) |
| Fabbisogno per anno | 2026: 1.377.530,00 · 2027: 1.905.520,00 · 2028: 356.000,00 (somma = programmato) |
| Filtro T-003: `health=RED` + `year=2027` | P-002, P-005, P-008, P-010 |

### 10.7 Documenti seed (DEC-070)
I documenti riproducono **layout e terminologia degli atti reali con dati inventati**. I modelli di layout M1–M7 sono descritti in [05 §6.2](05_analisi_documenti_reali.md) e richiamati nella colonna "Modello" della tabella:
- **M1** memoria per il Direttore Generale;
- **M2** capitolato o scheda offerta;
- **M3** determina, con segnatura di registro e struttura VISTI/CONSIDERATO/DETERMINA;
- **M4** documento di stipula o ordine MePA, con XML UBL incorporato e importi senza separatore delle migliaia;
- **M5** contratto INAPP;
- **M6** addendum con piano SAL, importi netti e lordi;
- **M7** variante "stampa su PDF", cioè testo convertito in tracciati, senza layer di testo e senza immagine a piena pagina.

Ogni documento:
- riporta a piè di pagina "DEMO – documento sintetico";
- è su carta intestata "INAPP DEMO";
- indica solo ruoli generici, senza nomi di persone;
- usa CIG e CUP `*-DEMO-Pxxx` e numeri di registro con prefisso `DEMO`.

Percorsi: `seed/documents/P-xxx/<tipo>.pdf`.

| # | Percorso | Proc. | Tipo | Modello | Caratteristica / scopo |
|---|---|---|---|---|---|
| 1 | `P-001/memoria_bozza.pdf` | P-001 | MEMORIA (bozza) | M1 | filigrana BOZZA, senza segnatura; riparto per annualità 20/80 su 120.000 |
| 2 | `P-002/scheda_fabbisogno.pdf` | P-002 | FABBISOGNO | M1 ridotto | |
| 3 | `P-002/modulo_modifica.pdf` | P-002 | MODULO_MODIFICA | M3 ridotto | proposta di nuova data di inizio attività; importi per annualità prima e dopo |
| 4 | `P-003/memoria.pdf` | P-003 | MEMORIA | M1 | segnatura del 10/09/2026; aperta con OEPV |
| 5 | `P-003/capitolato_tecnico.pdf` | P-003 | DOCUMENTO_TECNICO (CAPITOLATO) | M2 | |
| 6 | `P-004/determina_indizione.pdf` | P-004 | DETERMINA_INDIZIONE | M3 | impegni 2026/2027 coerenti con il `COMMITMENT` del seed |
| 7 | `P-004/contratto.pdf` | P-004 | CONTRATTO (CONTRATTO_PUBBLICO) | M5 | netto, IVA e lordo; decorrenza 20/05/2026; 12 mesi; CIG demo |
| 8 | `P-004/addendum_piano_sal.pdf` | P-004 | ADDENDUM (piano SAL) | M6 | 20/50/30 con date e importi netti e lordi (47.600 / 119.000 / 71.400) |
| 9 | `P-004/attestazione_regolare_esecuzione_sal1.pdf` | P-004 | VERBALE_SAL | M3 ridotto | |
| 10 | `P-004/relazione_sal2.pdf` | P-004 | DELIVERABLE | carta intestata del fornitore | caricato dal fornitore |
| 11 | `P-005/determina_aggiudicazione.pdf` | P-005 | DETERMINA_AGGIUDICAZIONE | M3 | **310.500,00** nel "PRESO ATTO della spesa" (conflitto atteso); clausola sulla garanzia definitiva |
| 12 | `P-006/documento_stipula_mepa.pdf` | P-006 | CONTRATTO (TD_MEPA) | M4 + XML | 32.500 + 7.150 = 39.650 |
| 13 | `P-006/certificato_regolare_esecuzione.pdf` | P-006 | CRE | M3 ridotto | |
| 14 | `P-007/memoria_scansionata.pdf` | P-007 | MEMORIA | M1 **raster** | solo immagine (OCR, T-015) |
| 15 | `P-008/determina_indizione.pdf` | P-008 | DETERMINA_INDIZIONE | M3 | prenotazioni per annualità su due fonti demo |
| 16 | `P-008/bando.pdf` | P-008 | BANDO | estratto GUUE/portale | |
| 17 | `P-009/ordinativo_convenzione.pdf` | P-009 | CONTRATTO (CONTRATTO_ESECUTIVO_AQ) | M4 + XML | 250.000 + 55.000 = 305.000; firmato il 01/07/2026 |
| 18 | `P-010/contratto.pdf` | P-010 | CONTRATTO (CONTRATTO_PUBBLICO) | M5 | stipula 10/06/2026 (incoerenza voluta) |
| 19 | `P-010/determina_aggiudicazione.pdf` | P-010 | DETERMINA_AGGIUDICAZIONE | M3 | registrata il 20/06/2026: rende `DATE_SEQUENCE_INCONSISTENT` verificabile anche sui documenti |
| 20 | `P-011/determina_revoca.pdf` | P-011 | DETERMINA_REVOCA | M3 | revoca con rilascio della prenotazione |
| 21 | `P-012/determina_aggiudicazione.pdf` | P-012 | DETERMINA_AGGIUDICAZIONE | M3 | |
| 22 | `da_associare/determina_indizione_cig_demo_p012.pdf` | P-012 | DETERMINA_INDIZIONE | **M7** | nessun ID nel nome: associazione per CIG o oggetto (US-021); senza layer di testo, quindi serve l'OCR |

Con i documenti attesi della §9.3 e la regola della §8.7, questi documenti producono **solo** le 3 anomalie della §10.4. L'unico `CONFLICT` della coda di validazione resta P-005.

`seed/fixtures/` (solo test, mai caricati dal seed):
- ZIP con un documento dalla data impossibile (T-016);
- ZIP con path traversal / ZIP slip;
- ZIP bomb ridotto;
- file oltre il limite;
- eseguibile rinominato `.pdf`;
- `addendum_anno_errato.pdf`;
- `memoria_text_layer_parziale.pdf` (importo lordo solo come tracciati);
- `ordine_mepa_ordine_scomposto.pdf`;
- `procedures_messy.xlsx`.

### 10.8 Schema di `expected_results.json`

```json
{
  "oracle_version": "1.0", "reference_date": "2026-10-01",
  "procedures": {
    "P-001": {"status": "MEMORY_EXPECTED", "health": "AMBER",
      "health_drivers": [{"rule": "DEADLINE_IN_ATTENTION_WINDOW", "target": "MEMORY_SUBMISSION"}],
      "next_deadline": {"target": "MEMORY_SUBMISSION", "date": "2026-10-06", "days": 5},
      "reschedule_required": false,
      "amounts": {"programmed": "120000.00", "contracted": null, "paid": "0.00", "residual": "120000.00",
                  "at_risk": "0.00"},
      "annual_need": {"2026": "24000.00", "2027": "96000.00"},
      "open_alerts": [{"rule": "MILESTONE_DEADLINE", "target": "MEMORY_SUBMISSION", "level": "T-5", "severity": "HIGH"}],
      "anomalies": []}
  },
  "notifications": {"in_app": 17, "email": 19},
  "kpi": {"procedures_total": 12, "procedures_late": 4, "to_reschedule": 3, "critical_alerts": 4,
          "programmed": "3639050.00", "contracted": "792650.00", "paid": "87250.00",
          "at_risk": {"total": "612000.00", "uncovered": "0.00", "slipping": "612000.00"}},
  "simulations": {"S-02": {"procedure": "P-002", "source": "MEMORY_SUBMISSION", "candidate_date": "2026-11-16",
     "expected": {"date_changes": 7, "amount_shifted": "150000.00",
                  "annual_impact": {"2026": "-150000.00", "2027": "150000.00"},
                  "criticalities": [{"code": "BUDGET_OVERFLOW", "year": 2027, "amount": "80000.00", "severity": "BLOCKING"}]}}}
}
```

---

## 11. Piano a incrementi

> **Piano storico:** la tabella sottostante è il piano originario e include componenti poi sostituiti (SQLite, Docker, backup locale, OpenAPI). Non è il backlog corrente e non va usata per dedurre che una feature sia ancora da implementare. Al 2026-11-04 I0–I7 risultano completati in locale (US-103 parziale), I8 è parziale e le richieste DEC-111 1–6 sono implementate. La richiesta 7 (indicatori desiderati per la dashboard iniziale) è in attesa di definizione con INAPP. Per lo stato effettivo e le attività residue fa fede [04_avanzamento.md](04_avanzamento.md).

Ogni incremento si chiude con: stack pulito avviabile, quality gate verde, oracle delle sezioni attive verde, README aggiornato, tag git. Le dipendenze fra storie che contraddicono quest'ordine (CR-19) si risolvono così: **prima il percorso manuale/seed, poi quello automatico**.

| Inc. | Contenuto | Storie | Sezioni oracle | Exit |
|---|---|---|---|---|
| **I0 Fondazioni** (P0) | git, pnpm, Next.js 16 + TS 6 strict, `/health` e `/ready`, skeleton a strati + dependency-cruiser + guard, config (env Zod) e `Clock`, Drizzle + migrazioni + `db/sql/triggers.sql`, UoW SQLite (WAL, mutex, `IMMEDIATE`, lettura separata), `Money`/`divRoundHalfUp`/`MoneyString`, coda job con lease + heartbeat (worker scheletro), auth a sessione + CSRF + argon2id, 7 account, RBAC + object-level, audit append-only, error envelope, correlation ID, log JSON (pino), adapter LLM `disabled`, `bindRoute` + contratti Zod + `docs/openapi.json`, shell frontend (login, banner demo, ruolo attivo, formattazione it-IT), Vitest (template DB) + Playwright, script di quality gate, **`expected_results.json` scritto dalla §10**, generazione dei documenti seed e del workbook (TS) | US-001, 002, 003, 110 (base), 111 (base) | — | servizi healthy; test 401/403/CSRF; test di immutabilità dell'audit, anche dopo una ricreazione di tabella; test architetturale; test di lease concorrente; test schema "nessun REAL" |
| **I1 Portafoglio e cronoprogramma** (P0) | modelli YAML + validatore, calendario, import seed idempotente con evidenze `SEED_FILE`, versioni/baseline, generazione milestone, stati milestone, stato procedura, handoff, `procedure_snapshot` e `procedure_snapshot_year`, ricerca FTS5 (`procedure_search`), selezione del modello (§9.1), lista con filtri in URL, scheda (Panoramica, Cronoprogramma, Audit) | US-100 (config), 101 (base), 010, 012, 030, 031, 032 (stato), 033, 011, 072 (parz.), 013 | `status`, `next_deadline`, `amounts.programmed` | T-001, T-002, T-003 |
| **I2 Alert e anomalie** (P0) | `run_checks` (CLI sincrona + job `RUN_CHECKS`) + scheduler `croner` con leader lease, policy di alert (incluso T-1M), escalation, outbox + dispatcher nodemailer → Mailpit (at-least-once, `Message-ID` stabile), centro alert, presa in carico/risoluzione/sospensione, anomalie che non richiedono estrazione, health completo | US-040, 041, 042, 043, 083 (base), 032 (health) | `health`, `health_drivers`, `open_alerts`, `anomalies`, `notifications` | T-004, T-005, T-013 (alert), T-014 |
| **I3 Riprogrammazione** (P0) | BudgetAllocation, righe forecast, flag + simulazione automatica, motore di simulazione, criticità, alternative, submit/approve/reject/override, versioni, wizard UI a 5 step | US-050, 051, 052, 053, 054, 061 (disponibilità) | `simulations`, `reschedule_required`, `at_risk` | T-006–T-010 |
| **I4 Contratti e SAL** (P0) | contratto + addendum, piano SAL, transizioni SAL, fatture, liquidazioni, pagamenti parziali, storni, invarianti, annullamento/rilascio P-011, vista riconciliata | US-060, 061, 062, 063, 064, 065 | `amounts.*`, `annual_need` | T-011, T-012, T-013, T-024 |
| **I5 Dashboard, validazione, audit** (P0) | dashboard direzionale e operativa, scheda completa, export CSV (`csv-stringify`), XLSX (`exceljs`), PDF (`@react-pdf/renderer`), coda di validazione su `extraction_proposals.json`, provenienza (seed/manuale), audit consultabile | US-070, 071, 072, 073, 080, 081 (base), 082 | `kpi` | T-018, T-023, T-025; **demo script passi 1–8 in E2E** |
| **I6 Documenti** (P1) | import cartella/ZIP (`yauzl` + limiti), hash, protezione upload, associazione automatica (CIG, oggetto, documento `da_associare`), estrazione in ordine XML MePA → layer di testo (`unpdf`) → OCR `tesseract.js` (`ita` locale) nel worker, pagine PNG pre-renderizzate (`@napi-rs/canvas`), parser di date in lettere e di importi con e senza migliaia, viewer pagina/cella, conflitti | US-020, 021, 022, 023, 081, 112 (upload) | coda di validazione | T-015, T-016 |
| **I7 Assistente e amministrazione** (P1) | intenti deterministici in italiano con fonti, domande di portafoglio, sicurezza dell'assistente, UI di config (modelli, calendario, soglie), utenti e ruoli, dizionari e gerarchia delle fonti, stato del sistema, reset transazionale (backup `VACUUM INTO` preventivo), `cli backup`/`restore`, import del workbook nel formato reale (`workbook_mapping.yaml`, solo su fixture) | US-090, 091, 092, 100 (UI), 101 (UI), 102, 103, 110, 111, 112 | — | T-019–T-022 |
| **I8 Hardening e consegna** | T-001…T-025 completi, generatore TS di 1.000 procedure (`cli perf generate`) per NFR-002/003, test di soak web + worker (0 `SQLITE_BUSY` lato web), hash chain dell'audit (`cli audit verify`), checklist manuale di accessibilità, valutazione di Node 26 LTS e Drizzle 1.0 (con DEC), axe, test di sicurezza, runbook demo e tecnico, pacchetto evidenze (§13.4), video E2E del demo script | — | tutte | DoD §13 |

**Assistente (I7):** parser deterministico (regex e parole chiave italiane, entità `P-\d{3}`, "prossimi N giorni"). Intenti minimi della US-090/091. Ogni numero arriva da use case già esistenti (gli stessi della dashboard) e porta `evidence_refs`. Un intento non riconosciuto restituisce esempi di domande. Adapter LLM: solo `DisabledLlm` e `FakeLlm` (per i test di timeout/errore).

---

## 12. Test e quality gate

### 12.1 Livelli
- **Unit** (`tests/unit`, Vitest): test del dominio puro, inclusi Money, date, alert, KPI e simulazione.
- **Integration/API** (`tests/integration`, `tests/api`, Vitest): usano Postgres tramite `POSTGRES_URL`; `scenarioDb()` tronca tutte le tabelle applicative, ricarica `scenarios` e ricalcola i check. `fileParallelism` è disattivato perché il DB è condiviso fra i test. Non presumere un DB in memoria o isolato per file.
- **API** (`tests/api`, comandi e route handler invocati con sessione): test di permessi, ambito object-level, validazione, risposte e invarianti di dominio. Non è presente una matrice automatica generata dai contratti route né una verifica OpenAPI.
- **E2E** (`e2e/`, Playwright con `pnpm test:e2e`): `demo-script.spec.ts` sul dataset `scenarios` e `guida.spec.ts` sul dataset `inapp`; l'axe è incluso nei test UI. Il bootstrap E2E prepara i server e pulisce il database prima dell'avvio: valgono le cautele della §12.2.

### 12.2 Sicurezza del database di test
- **Pericolo: i test cancellano i dati.** `tests/helpers/db.ts` esegue `TRUNCATE ... RESTART IDENTITY CASCADE` su tutte le tabelle applicative del Postgres indicato da `POSTGRES_URL`; `e2e/clean-db.mjs` fa lo stesso prima degli E2E.
- Non eseguire `pnpm test`, `pnpm verify` (che include `pnpm test`) o `pnpm test:e2e` contro il database Vercel, la demo o un database con dati da conservare. Il target deve essere isolato e sacrificabile.
- Questo requisito operativo è in conflitto con DEC-115, che prevede un solo database per sviluppo, test e Vercel. La suite non è stata ancora convalidata sul Postgres post-porting; risolvere il conflitto prima di considerare verde la quality gate corrente.
- I test usano `fixedClock("2026-10-01")`; la suite E2E avvia due server Next su database puliti e dataset `scenarios`/`inapp`.

### 12.3 Tracciabilità
I test esistenti identificano storie e decisioni nei titoli (`describe('[DEC-111] …')`, `test('[T-004] …')`). Non è presente un generatore automatico di traceability; aggiornare i test delle storie modificate e l'avanzamento manualmente.

### 12.4 Comandi di verifica attuali

Nel repository attuale `pnpm verify` esegue `pnpm typecheck`, `pnpm guards` e `pnpm test`. `pnpm test:e2e` è una suite separata. **Entrambi i comandi dei test svuotano il database puntato da `POSTGRES_URL`**: seguire §12.2 e non lanciarli su un database contenente dati da conservare.

`pnpm guards` (`scripts/guards.ts`) fallisce se trova:
- `Date.now`, `new Date()` senza argomenti o `Temporal.Now` fuori da `src/infrastructure/clock`;
- `parseFloat`, `Number(`, `toFixed` o `Math.round` in `src/domain`, `src/application`, `src/contracts` e `src/ui` (eccezioni solo in `guards.allowlist.json`, con motivazione);
- la direttiva `'use server'`;
- `TOTAL(`, `AVG(`, `AS REAL` o colonne `real(` nello schema e nel SQL;
- un trigger di `REQUIRED_TRIGGERS` assente da `db/sql/triggers.sql`;
- file `.env` versionati o un lockfile mancante.

Su Windows i comandi pnpm si eseguono in PowerShell o nel terminale VS Code. Docker non è richiesto.

---

## 13. Definition of Done

**Storia completata:**
- ogni criterio di accettazione ha almeno un test automatico verde;
- RBAC verificato via API, anche nei casi negativi;
- audit scritto per le mutazioni sensibili;
- UI con stati loading, empty, error e unauthorized, ed etichette accessibili;
- input delle route validati con Zod dove previsto;
- nessuna regola duplicata tra UI e backend;
- `04_avanzamento.md` aggiornato e commit fatto.

**Incremento completato:** criteri d'accettazione coperti e verificati su un database appropriato, README e avanzamento aggiornati, tag. Per reset e collaudo Postgres vedere §12.2.

**MVP completato:** DoD §13.2 della specifica + §1 di questa guida + evidenze §13.4 della specifica in `docs/evidenze/`. Le deviazioni registrate nel registro hanno impatto e workaround.

---

## 14. Checklist di sessione

**Apertura:** leggere avanzamento e registro → `git status/log` → verificare che `POSTGRES_URL` non punti a un database con dati da conservare prima di qualsiasi test distruttivo → scegliere il lavoro non bloccato.

**Chiusura:**
- quality gate verde, oppure il problema è annotato con la diagnosi;
- `04_avanzamento.md` aggiornato con ultimo passo, prossimo passo e blocchi;
- le nuove decisioni sono nel registro;
- commit fatto, senza segreti né file temporanei.
