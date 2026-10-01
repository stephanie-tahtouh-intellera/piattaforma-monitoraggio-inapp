> Conversione automatica in Markdown di `INAPP_MVP_Requisiti_Epiche_User_Stories_v1_0.docx` (v1.0, 1 ottobre 2026). Fonte autorevole: il .docx originale. Le figure sono descritte in testo.

INTELLERA / INAPP

PIATTAFORMA DI MONITORAGGIO,
RIPROGRAMMAZIONE E CONTROLLO FINANZIARIO

Requisiti dettagliati, epiche e user story per un MVP funzionante

> 

> **Obiettivo operativo** — Consegnare a un AI coding agent una specifica sufficiente per creare, avviare e collaudare un vertical slice end-to-end: programmazione → memoria → alert → riprogrammazione → contratto → SAL → pagamento → impatto sulla previsione di spesa.

> VERSIONE 1.0 | DATA 1 ottobre 2026 | STATO Per validazione | DATA DEMO 01/10/2026

> BACKLOG 12 epiche / 48 storie | DATASET 12 procedure sintetiche | CORE Deterministico | SVILUPPO AI coding agent

Classificazione del contenuto

- REQUISITO: comportamento atteso e verificabile dell’MVP.
- PROPOSTA MVP: scelta tecnica o funzionale introdotta per rendere sviluppabile la demo.
- DA VALIDARE: elemento che richiede conferma dei referenti INAPP/Intellera.
Documento preparato per sviluppo assistito da AI. Nessun dato personale o identificativo reale è necessario per eseguire la demo.


# Indice

| Sezione | Contenuto |
|---|---|
| 1 | Scopo, visione e criteri di successo |
| 2 | Perimetro, assunzioni e vincoli |
| 3 | Processo target e attori |
| 4 | Architettura e organizzazione del software |
| 5 | Modello informativo e stati |
| 6 | Regole di business |
| 7 | Dataset sintetico realistico |
| 8 | Backlog: epiche e user story |
| 9 | Requisiti di interfaccia |
| 10 | Contratti API e integrazioni |
| 11 | Requisiti non funzionali e sicurezza |
| 12 | Piano di sviluppo per il coding agent |
| 13 | Collaudo, Definition of Done e demo script |
| 14 | Decisioni aperte e validazione |
| A | Appendici: notifiche, repository, payload, glossario e tracciabilità |

Nota: l’indice è intenzionalmente statico per mantenere il documento stabile nei diversi motori di rendering. I titoli sono numerati e ricercabili.


# 1. Scopo, visione e criteri di successo

> **Base del documento** — Il presente backlog traduce il documento “Piattaforma di monitoraggio delle gare e dei contratti v0.9” e gli appunti integrativi INAPP in specifiche implementabili. I contenuti marcati “Proposta MVP” sono scelte progettuali da validare e non regole amministrative già approvate.


## 1.1 Visione di prodotto

L’MVP è una piattaforma operativa per governare il ciclo di vita di procedure di acquisto e contratti. Non sostituisce MePA, TuttoGare, Civilia o InGov: li tratta come sistemi sorgente o futuri punti di integrazione. Il valore principale è rendere visibili e azionabili le dipendenze tra scadenze amministrative, riprogrammazione e previsione di spesa.

> **North Star** — Il sistema deve dire che cosa sta per scadere, che cosa è già in ritardo, quale procedura va riprogrammata, come cambiano le annualità e quali SAL o pagamenti richiedono un intervento.


## 1.2 Problema da risolvere

- Le date di programmazione sono distribuite in workbook e atti; i ritardi vengono spesso riconosciuti quando hanno già prodotto effetti a cascata.
- La mancata presentazione della memoria entro il termine utile rende necessario spostare la procedura e, di conseguenza, ridistribuire importi e pagamenti sulle annualità.
- La decisione di spostamento richiede una simulazione comprensibile: nuove date, importi spostati, disponibilità residua e criticità.
- Durante l’esecuzione manca una vista integrata di contratto, SAL, liquidazioni, pagamenti e residuo.
- Dati estratti da documenti o proposti dall’AI devono rimanere verificabili e soggetti ad approvazione umana.

## 1.3 Obiettivi misurabili dell’MVP

| ID | Area | Risultato atteso | Evidenza di collaudo |
|---|---|---|---|
| OBJ-01 | Prevenzione | Generare il reminder della memoria almeno a T-5 e le escalation configurate. | T-004 superato. |
| OBJ-02 | Riprogrammazione | Calcolare alternative temporali e finanziarie senza alterare baseline o dati effettivi. | T-006–T-010 superati. |
| OBJ-03 | Controllo finanziario | Riconciliare contratto, SAL, liquidazioni, pagamenti e residuo. | T-011, T-012 e T-024 superati. |
| OBJ-04 | Tracciabilità | Collegare date/importi a fonte, metodo ed eventuale validazione. | T-015, T-016 e T-018 superati. |
| OBJ-05 | Operatività | Avviare il prodotto con un comando e usare 12 scenari demo. | T-001 e T-002 superati. |
| OBJ-06 | Resilienza | Mantenere operativo il core con AI disabilitata. | T-021 superato. |


## 1.4 Utenti e valore atteso

| Attore | Responsabilità | Valore fornito dall’MVP |
|---|---|---|
| Struttura richiedente | Prepara fabbisogno/memoria; verifica esecuzione. | Scadenze, documenti mancanti, stato e deliverable delle proprie procedure. |
| Ufficio Gare | Gestisce dalla memoria alla stipula e gli atti di modifica. | Coda operativa, cronoprogramma, alert, simulazioni e decisioni. |
| Amministrazione / Contabilità | Gestisce disponibilità, impegni, liquidazioni e pagamenti. | Previsione per annualità, SAL, pagamenti, residui e criticità. |
| Fornitore | Contribuisce solo sui contratti assegnati. | Caricamento documenti/deliverable e visibilità limitata. |
| Dirigente / Responsabile | Decide priorità ed eventuale riprogrammazione. | KPI, importi a rischio, scadenze ed escalation. |
| Validatore / Operatore monitoraggio | Consolida dati e gestisce anomalie. | Coda di validazione, fonti e audit. |
| Amministratore piattaforma | Configura modelli, regole e utenti. | Controllo ambiente, parametri, health e reset demo. |


# 2. Perimetro, assunzioni e vincoli


## 2.1 Perimetro incluso

- Portafoglio multi-procedura con baseline, ultima previsione approvata ed effettivo.
- Cronoprogramma configurabile per tipologia, milestone, dipendenze e owner.
- Reminder T-5 per la memoria, ulteriori soglie configurabili, escalation e centro alert.
- Riprogrammazione assistita con simulazione di date, annualità, disponibilità e criticità.
- Scheda contratto; piano SAL; liquidazioni; pagamenti; residui; previsioni.
- Fascicolo documentale con import da cartella/ZIP, hash, OCR di fallback, evidenze e validazione.
- Dashboard direzionale, portafoglio filtrabile, export e audit log.
- Assistente in italiano con intenti deterministici e fonti cliccabili; adapter LLM opzionale.
- Dataset sintetico ripetibile, account demo, Docker Compose, test automatici e reset.

## 2.2 Fuori perimetro della prima versione

- Scrittura automatica in Civilia, InGov, MePA, TuttoGare o nel workbook sorgente.
- Firma digitale, protocollazione, conservazione a norma o approvazione formale di atti.
- Predizione statistica dei ritardi basata su uno storico reale non disponibile.
- Contabilità certificativa o sostituzione delle verifiche dell’Amministrazione.
- SSO produttivo, provisioning da directory, Teams/e-mail reali, VPN e infrastruttura HA/DR.
- Generazione automatica di determine, contratti o atti amministrativi.
- Copertura completa di tutte le tipologie di procedura o di incarichi a esperti.
- Multi-tenancy produttiva e gestione di dati reali non anonimizzati.

## 2.3 Assunzioni operative

| ID | Assunzione | Default MVP |
|---|---|---|
| A-01 | Data di riferimento della demo | 01/10/2026; configurabile. |
| A-02 | Fuso orario | Europe/Rome; calendario demo con festività nazionali configurabili. |
| A-03 | Dati | Tutti sintetici, plausibili e marcati is_demo=true; nessun identificativo reale. |
| A-04 | CIG/CUP | Valori esplicitamente fittizi nel formato CIG-DEMO-Pxxx e CUP-DEMO-Pxxx. |
| A-05 | Autenticazione | Locale per la demo; RBAC server-side; SSO futuro. |
| A-06 | Notifiche | In-app e SMTP mock/MailHog; invio reale futuro. |
| A-07 | Riprogrammazione | Proposta automatica, decisione sempre umana e auditata. |
| A-08 | Regole 1/4/7/9 mesi | Esempi configurabili, non regole ufficiali finché non validate. |
| A-09 | Finanza | Modello coerente ma sintetico; nomenclatura InGov da allineare. |
| A-10 | AI | Non necessaria al core; LLM/OCR sostituibili mediante adapter. |


## 2.4 Principi non negoziabili

> **Core deterministico** — Scadenze, calcoli, stati, simulazioni, SAL, pagamenti e permessi non devono dipendere da un modello generativo. L’AI può estrarre, classificare e spiegare, non assumere decisioni amministrative.

- Baseline immutabile e versionamento esplicito della previsione.
- Nessun valore estratto sovrascrive un valore validato.
- Ogni decisione critica ha autore, data, motivazione e prima/dopo.
- Un dato mancante o conflittuale è uno stato esplicito, non un valore inventato.
- L’interfaccia non usa il solo colore per comunicare gravità o stato.
- Importi persistiti come decimal, mai come floating point binario.

# 3. Processo target e attori

*Figura 1 — Vertical slice end-to-end richiesto per l’MVP.* Flusso: Programmazione → Memoria → Istruttoria e gara → Stipula → Esecuzione → SAL e pagamenti → Chiusura. Trigger d'esempio: "memoria non presentata entro T0 → alert critico → riprogrammazione richiesta". Motori: scadenze (regole, calendario, reminder, escalation); riprogrammazione (simulazione date, dipendenze, approvazione umana); finanziario (annualità, SAL, liquidazioni, pagamenti, residui).


## 3.1 Flusso principale

- La Struttura crea o importa la programmazione e prepara memoria/documento tecnico.
- Il motore scadenze calcola la data obiettivo della memoria e genera reminder, incluso T-5.
- Alla consegna della memoria, la titolarità passa all’Ufficio Gare e viene congelata la baseline.
- Le milestone successive sono calcolate dal modello di procedura; atti e date effettive aggiornano la timeline.
- Un ritardo su una milestone bloccante apre una richiesta di riprogrammazione.
- Ufficio Gare e Amministrazione simulano nuove date, SAL e pagamenti; il sistema evidenzia importi spostati e conflitti.
- Un approvatore accetta o rifiuta la proposta. L’approvazione crea una nuova previsione senza alterare la baseline.
- Durante l’esecuzione, il sistema monitora contratto, SAL, liquidazioni, pagamenti, residuo e scadenze.
- La chiusura richiede saldi coerenti, documenti finali e assenza di alert bloccanti.

## 3.2 Stati della procedura

| Stato | Significato | Owner prevalente |
|---|---|---|
| BOZZA | Programmazione incompleta o non consegnata. | Struttura |
| MEMORIA_ATTESA | Fabbisogno definito; memoria non ancora consegnata. | Struttura |
| ISTRUTTORIA | Memoria consegnata; verifiche e preparazione indizione. | Ufficio Gare |
| GARA | Procedura pubblicata/in corso. | Ufficio Gare |
| AGGIUDICATA | Operatore individuato; stipula da completare. | Ufficio Gare |
| STIPULA | Contratto in preparazione/controfirma. | Ufficio Gare/Fornitore |
| ESECUZIONE | Contratto attivo con deliverable e SAL. | Struttura/Gare |
| CHIUSURA | Verifiche finali, saldo e rendicontazione. | Gare/Amministrazione |
| CHIUSA | Obblighi, pagamenti e controlli completati. | Amministrazione |
| ANNULLATA | Procedura cancellata con rilascio degli importi consentiti. | Approvatore |


## 3.3 Matrice RACI semplificata

| Attività | Struttura | Gare | Amm. | Fornitore | Dir./Valid. |
|---|---|---|---|---|---|
| Programmazione | R/A | C | C | I | I |
| Consegna memoria | R/A | C | I | I | I |
| Istruttoria e gara | I | R/A | C | C | I |
| Simulazione riprogrammazione | C | R | R | I | A |
| Approvazione riprogrammazione | I | C | C | I | A/R |
| Verifica esecuzione | R | A | C | C | I |
| SAL | R | A | C | C | I |
| Liquidazione/pagamento | I | C | R/A | I | I |
| Validazione dati | C | C | C | I | A/R |
| Chiusura | C | R | R | I | A |

Legenda: R = esegue; A = responsabile della decisione; C = consultato; I = informato. La matrice è una proposta MVP da validare.


# 4. Architettura e organizzazione del software

*Figura 2 — Architettura logica proposta; gli adapter esterni restano sostituibili.* Web app Next.js/React/TS → Application API (Procedure & workflow, Rules & scheduler, Rescheduling, Finance & SAL, Documents & evidence, Assistant gateway) → PostgreSQL, Object storage, Scheduler/worker, MailHog/SMTP. Adapter opzionali: OCR locale/Document Intelligence, LLM provider-agnostic, Civilia/InGov/MePA/TuttoGare (futuro), SSO/Teams/e-mail reale (futuro).


## 4.1 Stack di riferimento

| Componente | Tecnologia proposta | Responsabilità |
|---|---|---|
| Frontend | Next.js/React, TypeScript | Routing, UI, query caching, form validation, accessibilità. |
| Backend | Python 3.12, FastAPI, Pydantic, SQLAlchemy | API REST, dominio, regole, autorizzazioni, job. |
| Database | PostgreSQL | Dati transazionali, versioni, audit e ricerca strutturata. |
| Job | Worker/scheduler Python | Controlli periodici, reminder, import e OCR. |
| Documenti | Storage locale o S3-compatible | Originali immutabili, hash, preview e metadati. |
| OCR | PyMuPDF + Tesseract come fallback | Adapter sostituibile con Document Intelligence autorizzato. |
| LLM | Adapter provider-agnostic, disabilitato di default | Solo estrazione/spiegazione non critica. |
| Notifiche | Outbox DB + MailHog/SMTP mock | Demo verificabile senza invii esterni. |
| Test | Pytest + Playwright | Unit, integration, API ed E2E. |
| Distribuzione | Docker Compose | Avvio locale riproducibile e reset seed. |


## 4.2 Moduli backend

| Modulo | Responsabilità |
|---|---|
| identity | Autenticazione demo, RBAC e scope per struttura/contratto. |
| portfolio | Procedure, versioni, baseline, filtri e KPI. |
| workflow | Modelli, milestone, dipendenze, calendari e stati. |
| alerts | Regole, anomalie, escalation, outbox e notifiche. |
| rescheduling | Simulazione, alternative, delta e approvazioni. |
| finance | Budget annuale, contratti, SAL, liquidazioni, pagamenti e residui. |
| documents | Import, hash, classificazione, OCR, evidenze e preview. |
| validation | Coda, conflitti, consolidamento e qualità. |
| assistant | Intenti deterministici, retrieval autorizzato e adapter LLM. |
| audit | Eventi append-only, ricerca e correlazione. |
| admin | Configurazioni versionate, health, job e reset demo. |


## 4.3 Regole di dipendenza

- Il dominio non importa framework web, provider LLM/OCR o storage concreto.
- I calcoli finanziari e temporali sono funzioni pure e testabili.
- Gli adapter implementano porte definite dall’application layer.
- UI e API non duplicano le regole di business: il backend è la fonte di verità.
- Eventi di dominio alimentano audit, alert e notifiche tramite outbox transazionale.
- Configurazioni e dati seed sono file versionati; nessun caso demo è hardcoded nei componenti.

## 4.4 Struttura repository suggerita

```
/frontend/                 # Next.js, TypeScript, componenti e test E2E
/backend/
  app/domain/              # entità, value object, regole pure
  app/application/         # use case, DTO, porte
  app/infrastructure/      # DB, storage, OCR, LLM, SMTP
  app/api/                 # FastAPI, auth, error mapping
  migrations/              # Alembic
/seed/                     # JSON/CSV/XLSX/PDF sintetici
/tests/                    # unit, integration, contract, E2E
/infra/                    # compose, Dockerfile, config
/docs/                     # ADR, OpenAPI, modello dati, runbook
.env.example
docker-compose.yml
README.md
```


# 5. Modello informativo e stati


## 5.1 Entità principali

| Entità | Campi minimi | Ruolo |
|---|---|---|
| Structure | id, code, name, active | Ambito organizzativo degli utenti e delle procedure. |
| User / Role / Scope | id, login, roles, structure_ids, contract_ids | Autenticazione e autorizzazione. |
| Procedure | id, demo_code, object, type, status, owner, structure | Radice del fascicolo e del processo. |
| ProcedureVersion | version, valid_from, reason, approved_by | Baseline e previsioni successive, immutabili. |
| ProcedureFieldValue | field, value, dimension, source, status | Valore programmato, previsto, effettivo o validato. |
| ProcessTemplate | code, version, validity, active | Modello per tipologia di procedura. |
| MilestoneDefinition | code, offset, duration, dependency, owner | Regola configurabile del cronoprogramma. |
| ProcedureMilestone | planned, forecast, actual, state, blocking | Istanza della milestone per una procedura. |
| Document | id, name, hash, type, pages, processing_state | Originale immutabile e metadati. |
| Evidence | document, page/cell, excerpt, method, confidence | Provenienza di un valore o di un collegamento. |
| Validation | target, outcome, correction, note, author, date | Consolidamento umano di dati e associazioni. |
| Contract | supplier_demo, net, VAT, gross, start, end, status | Dati economici e temporali del contratto. |
| SAL | sequence, percent/amount, due, actual, state | Stato di avanzamento e importo maturato. |
| FinancialMovement | type, amount, date, year, reference, status | Prenotazione, impegno, liquidazione, pagamento, rilascio. |
| BudgetEnvelope | year, source, available, reserved, committed | Disponibilità per annualità/fonte. |
| PaymentForecast | date, amount, year, cause, version | Previsione derivata da contratto/SAL. |
| Alert | rule, severity, status, owner, due, evidence | Reminder, ritardo, anomalia o criticità. |
| RescheduleSimulation | cause, assumptions, status, created_by | Scenario non effettivo. |
| RescheduleChange | target, before, after, delta, impact | Cambiamenti temporali/finanziari dello scenario. |
| NotificationOutbox | channel, recipient, template, payload, state | Invio affidabile e verificabile. |
| AuditEvent | actor, action, entity, before, after, correlation_id | Storico append-only. |


## 5.2 Dimensioni del dato

| Dimensione/stato | Definizione | Comportamento |
|---|---|---|
| BASELINE | Valore approvato all’avvio o alla consegna memoria. | Non modificabile; nuove informazioni non la sostituiscono. |
| FORECAST | Ultima previsione approvata. | Versionata; usata per alert e proiezioni correnti. |
| ACTUAL | Fatto amministrativo o finanziario avvenuto. | Richiede evidenza o inserimento manuale auditato. |
| VALIDATED | Valore confermato/corretto da un validatore. | Prevale nelle viste operative senza cancellare l’originale. |
| PROPOSED | Estrazione o calcolo non ancora approvato. | Non deve influire su stati ufficiali salvo regole esplicite. |
| CONFLICT | Più fonti non coerenti. | Richiede decisione e resta visibile nello storico. |
| MISSING | Dato atteso non disponibile. | Può generare anomalia o blocco. |


## 5.3 Stati delle milestone

| Stato | Regola sintetica |
|---|---|
| NOT_STARTED | Dipendenze non concluse o finestra non aperta. |
| UPCOMING | Data futura entro la soglia di attenzione. |
| DUE_SOON | Entro la soglia di reminder, ad esempio T-5. |
| DUE_TODAY | Scadenza nella data di riferimento. |
| OVERDUE | Data superata e actual assente. |
| COMPLETED | Actual registrato e validato o accettato. |
| BLOCKED | Impossibile proseguire per dipendenza o dato/documento mancante. |
| CANCELLED | Non più dovuta per annullamento/versione. |


## 5.4 Stati SAL e pagamenti

SAL: PLANNED → SUBMITTED → VERIFIED → AUTHORIZED → LIQUIDATED → PAID. Sono ammessi REJECTED, SUSPENDED e PARTIALLY_PAID. Ogni transizione è autorizzata, auditata e vincolata agli importi precedenti.

Pagamento: DRAFT → SCHEDULED → EXECUTED → RECONCILED; un pagamento annullato genera una scrittura compensativa, non la cancellazione del movimento.


# 6. Regole di business

Le regole seguenti costituiscono il nucleo deterministico. Devono essere implementate in un modulo di dominio indipendente dall’interfaccia e coperte da test unitari. “Bloccante” indica che l’operazione non può essere confermata; “Alta/Media” indica severità dell’alert o priorità della regola.

| ID | Regola | Definizione verificabile | Severità |
|---|---|---|---|
| BR-001 | Baseline immutabile | La programmazione originaria non è sovrascritta; ogni variazione crea una nuova versione. | Bloccante |
| BR-002 | Tre dimensioni del dato | Baseline, previsione approvata ed effettivo sono sempre separati. | Bloccante |
| BR-003 | Reminder memoria T-5 | Cinque giorni prima della memoria viene generato un alert se non completata. | Alta |
| BR-004 | Riprogrammazione al ritardo | Al T+1 di una milestone bloccante si apre “riprogrammazione richiesta”. | Alta |
| BR-005 | Dipendenze temporali | Una milestone futura non precede la dipendenza più la durata minima. | Bloccante |
| BR-006 | Effettivi intangibili | Le date effettive non cambiano per simulazioni o riprogrammazioni. | Bloccante |
| BR-007 | Approvazione umana | Nessuna riprogrammazione diventa corrente senza approvatore e motivazione. | Bloccante |
| BR-008 | Ricalcolo annualità | Gli importi previsti sono attribuiti all’anno del pagamento previsto. | Alta |
| BR-009 | Disponibilità annuale | Superamento disponibilità genera criticità pari al delta. | Bloccante |
| BR-010 | Piano SAL riconciliato | Le percentuali SAL totalizzano 100%, salvo eccezione configurata. | Alta |
| BR-011 | Catena finanziaria | Pagato <= liquidato <= autorizzato/contrattuale. | Bloccante |
| BR-012 | Pagamenti parziali | Il parziale riduce il residuo e il SAL resta aperto fino a saldo. | Media |
| BR-013 | SAL scaduto | SAL oltre data prevista assume stato scaduto e genera alert. | Alta |
| BR-014 | Evidenza obbligatoria | Date e importi consolidati hanno fonte o inserimento manuale auditato. | Alta |
| BR-015 | Nessun overwrite automatico | Un’estrazione non sovrascrive il validato; genera proposta o conflitto. | Bloccante |
| BR-016 | Import idempotente | Hash e chiavi di business impediscono duplicazioni. | Alta |
| BR-017 | Core senza AI | Alert, calcoli, timeline e finanza funzionano con AI disabilitata. | Bloccante |
| BR-018 | Controllo ruolo | Ogni modifica è autorizzata lato server per ruolo e ambito. | Bloccante |
| BR-019 | Audit obbligatorio | Modifiche e decisioni sensibili generano audit immutabile. | Bloccante |
| BR-020 | Annullamento e rilascio | L’annullamento rilascia solo importi non impegnati e registra il movimento. | Alta |


## 6.1 Algoritmo minimo di scadenza

```
reference_date = configured_demo_date or today(Europe/Rome)
for milestone in active_milestones:
    due = milestone.forecast_date or milestone.baseline_date
    if milestone.actual_date: state = COMPLETED
    elif dependency_incomplete: state = BLOCKED
    elif reference_date > due: state = OVERDUE
    elif business_days(reference_date, due) == 0: state = DUE_TODAY
    elif business_days(reference_date, due) <= reminder_threshold: state = DUE_SOON
    else: state = UPCOMING
    apply_alert_rules(milestone, state)
```


## 6.2 Algoritmo minimo di riprogrammazione

```
1. Acquisire causa, milestone sorgente e nuova data candidata.
2. Propagare il delta sulle sole milestone future non effettive.
3. Rispettare dipendenze, durate minime, calendario e date bloccate.
4. Ricalcolare date previste di SAL e pagamenti.
5. Attribuire ogni importo all'annualità della nuova data prevista.
6. Confrontare il fabbisogno con la disponibilità dell'annualità/fonte.
7. Produrre delta date/importi, criticità e almeno una alternativa quando possibile.
8. Salvare lo scenario come SIMULATION; nessun dato corrente cambia.
9. Solo l'approvazione crea una nuova ProcedureVersion e aggiorna il forecast.
```


## 6.3 Invarianti finanziarie

- contract_gross = contract_net + VAT + eventuali componenti esplicitamente modellate.
- sum(SAL pianificati) = importo contrattuale oppure eccezione motivata/configurata.
- amount_paid <= amount_liquidated <= amount_authorized <= contract_gross.
- residuo_da_pagare = contract_gross - somma(pagamenti eseguiti validi).
- importo_a_rischio = somma delle previsioni che ricadono in annualità senza copertura o oltre l’orizzonte.
- Un pagamento parziale non chiude il SAL; il residuo del SAL rimane esigibile.
- La cancellazione di una procedura non cancella gli impegni già registrati: genera gli eventuali rilasci consentiti.

# 7. Dataset sintetico realistico

> **Vincolo sui dati** — Tutti i dati sono inventati ma plausibili. Denominazioni, importi e date servono a esercitare il prodotto; CIG, CUP, operatori e persone devono essere chiaramente marcati DEMO e non coincidere con soggetti reali.


## 7.1 Composizione del seed

- 12 procedure, 8 strutture, 7 account di ruolo e 4 modelli di procedura.
- Almeno 60 milestone, 12 fascicoli, 18 documenti PDF/XLSX, 8 contratti, 14 SAL e 10 movimenti finanziari.
- Scenari verdi, ambra, rossi e neutrali; due conflitti di disponibilità annuale; un annullamento; un caso chiuso.
- Un PDF immagine per verificare OCR; un documento con data incoerente per verificare l’anomalia; un fascicolo incompleto.
- Data di riferimento fissata al 01/10/2026 per rendere deterministici alert e test.

## 7.2 Portafoglio demo

| ID | Oggetto | Struttura | Tipologia | Importo | Fase | Health | Scenario |
|---|---|---|---|---|---|---|---|
| P-001 | Manutenzione evolutiva piattaforma OrientaLab | Sistemi informativi | Affidamento diretto MePA | € 120.000 | Memoria | AMBRA | Memoria 06/10: T-5 |
| P-002 | Supporto metodologico e project management | Programmazione e controllo | Procedura negoziata | € 480.000 | Memoria | ROSSO | Scaduta; conflitto 2027 € 80.000 |
| P-003 | Indagine campionaria multicanale | Studi e analisi | Procedura aperta | € 720.000 | Istruttoria | VERDE | Avvio nei tempi |
| P-004 | Assistenza specialistica Data Warehouse | Sistemi informativi | Affidamento diretto | € 238.000 | Esecuzione | AMBRA | SAL 2, pagamento 20/10 |
| P-005 | Servizi cloud e continuità operativa | Sistemi informativi | Accordo quadro | € 310.000 | Stipula | ROSSO | Garanzia mancante; +45 gg |
| P-006 | Audit accessibilità portali | Comunicazione | Affidamento diretto | € 39.650 | Chiuso | VERDE | Saldo pagato |
| P-007 | Servizi logistici eventi e seminari | Formazione | Procedura negoziata | € 146.400 | Istruttoria | AMBRA | Documento tecnico mancante |
| P-008 | Evoluzione piattaforma politiche attive | Innovazione digitale | Procedura aperta | € 890.000 | Gara | ROSSO | Conflitto 2027 € 100.000 |
| P-009 | Licenze software statistiche | Metodologie statistiche | Ordine MePA | € 305.000 | Pagamento | AMBRA | Liquidato, non pagato |
| P-010 | Assessment sicurezza e penetration test | Sicurezza ICT | Procedura negoziata | € 210.000 | Esecuzione | ROSSO | SAL 1 non verificato |
| P-011 | Traduzione e revisione linguistica | Relazioni internazionali | Affidamento diretto | € 75.000 | Annullato | NEUTRO | Disponibilità rilasciata |
| P-012 | Formazione avanzata su dati e IA | Sviluppo competenze | Procedura negoziata | € 180.000 | Aggiudicato | VERDE | Stipula 15/10 |


## 7.3 Dati finanziari attesi

| ID | Programmato | Contratto | Riparto / simulazione | SAL | Pagato | Residuo | Focus |
|---|---|---|---|---|---|---|---|
| P-001 | €120.000 | €119.560 | 2026 €23.912; 2027 €95.648 | 20/50/30 | €0 | €119.560 | T-5 memoria |
| P-002 | €480.000 | - | Base 2026 €200k; 2027 €280k
Sim. 2026 €50k; 2027 €430k | da definire | €0 | €480.000 | Overflow €80k |
| P-003 | €720.000 | - | 2027 €504k; 2028 €216k | 70/30 | €0 | €720.000 | - |
| P-004 | €238.000 | €238.000 | 2026 €166.600; 2027 €71.400 | 20/50/30 | €47.600 | €190.400 | SAL 2 |
| P-005 | €310.000 | €310.000 agg. | Base 2026 €62k; 2027 €248k
Sim. 2026 €0; 2027 €310k | 20/80 | €0 | €310.000 | Shift €62k |
| P-006 | €39.650 | €39.650 | 2026 €39.650 | 100 | €39.650 | €0 | Chiuso |
| P-007 | €146.400 | - | 2026 €29.280; 2027 €117.120 | 20/50/30 | €0 | €146.400 | Doc mancante |
| P-008 | €890.000 | - | Base 2026 €350k; 2027 €400k; 2028 €140k
Sim. 2026 €100k; 2027 €650k; 2028 €140k | da definire | €0 | €890.000 | Overflow €100k |
| P-009 | €305.000 | €305.000 | 2026 €305.000 | 100 | €0 | €305.000 | Liquidato |
| P-010 | €210.000 | €210.000 | 2026 €147k; 2027 €63k | 30/40/30 | €0 | €210.000 | SAL scaduto |
| P-011 | €75.000 | - | 2026 €75k rilasciati | - | €0 | €0 | Annullato |
| P-012 | €180.000 | €180.000 agg. | 2026 €54k; 2027 €126k | 30/40/30 | €0 | €180.000 | - |


## 7.4 Scenari di collaudo prioritari

| Scenario | Caso | Input | Risultato atteso |
|---|---|---|---|
| S-01 / P-001 | Memoria in scadenza | Al 01/10/2026 la memoria è prevista il 06/10/2026. | Alert T-5; destinatario Struttura; importo €120.000. |
| S-02 / P-002 | Memoria scaduta e spesa non coperta | Riprogrammare sposta €150.000 dal 2026 al 2027. | 2027 passa a €430.000 su disponibilità €350.000: criticità €80.000. |
| S-03 / P-004 | Esecuzione con SAL | Contratto €238.000, piano 20/50/30; primo SAL pagato. | Pagato €47.600; residuo €190.400; prossimo pagamento 20/10. |
| S-04 / P-005 | Stipula ritardata | Garanzia mancante; stipula slitta di 45 giorni. | €62.000 si spostano dal 2026 al 2027. |
| S-05 / P-008 | Procedura aperta in ritardo | Nuova sequenza sposta pagamenti sulla seconda annualità. | Conflitto 2027 pari a €100.000. |
| S-06 / P-010 | SAL scaduto | SAL 1 previsto ma non verificato. | Alert critico e coda di presa in carico. |
| S-07 / P-011 | Annullamento | Procedura non avviata e importi non impegnati. | Movimento di rilascio €75.000; storico conservato. |


## 7.5 File seed richiesti

```
/seed/
  users.json
  structures.json
  process_templates.json
  annual_budgets.json
  procedures.xlsx
  procedures-details.json
  contracts.json
  sals.json
  financial_movements.json
  documents/
    P-001_memoria_demo.pdf
    P-002_nota_riprogrammazione_demo.pdf
    P-004_contratto_demo.pdf
    P-004_piano_sal_demo.pdf
    P-007_documento_scansionato_demo.pdf
    ...
  expected_results.json
```

expected_results.json deve contenere i KPI, gli alert e i delta attesi per la data demo: i test d’integrazione confrontano il calcolo con questo oracle versionato.


# 8. Backlog: epiche e user story

Priorità: MUST = necessaria per dichiarare funzionante l’MVP; SHOULD = importante ma differibile senza invalidare il vertical slice; COULD = opzionale. Taglie S/M/L sono relative e servono solo a ordinare il lavoro, non costituiscono una stima temporale.

| Epic | Titolo | Storie | MUST | SHOULD |
|---|---|---|---|---|
| EP-00 | Fondazioni, avvio e controllo accessi | 3 | 3 | 0 |
| EP-01 | Portafoglio, programmazione e baseline | 4 | 3 | 1 |
| EP-02 | Fascicolo documentale ed evidenze | 4 | 4 | 0 |
| EP-03 | Workflow, cronoprogramma e responsabilità | 4 | 4 | 0 |
| EP-04 | Scadenze, reminder ed escalation | 4 | 4 | 0 |
| EP-05 | Riprogrammazione assistita e simulazione impatti | 5 | 5 | 0 |
| EP-06 | Contratti, SAL, liquidazioni e pagamenti | 6 | 6 | 0 |
| EP-07 | Dashboard, scheda procedura e report | 4 | 3 | 1 |
| EP-08 | Validazione, qualità del dato e audit | 4 | 4 | 0 |
| EP-09 | Assistente conversazionale con fonti | 3 | 1 | 2 |
| EP-10 | Configurazione e amministrazione | 4 | 2 | 2 |
| EP-11 | Resilienza, osservabilità e sicurezza operativa | 3 | 3 | 0 |

> **Ordine di implementazione** — Il coding agent deve privilegiare un vertical slice dimostrabile: fondazioni → portafoglio/workflow → alert T-5 → riprogrammazione P-002 → finanza P-004 → dashboard/report → documenti/assistente. Le funzionalità non indispensabili non devono ritardare questo percorso.


## EP-00 — Fondazioni, avvio e controllo accessi

> OBIETTIVO Rendere il prototipo riproducibile, utilizzabile da più ruoli e sicuro nelle operazioni essenziali. | OUTCOME Il coding agent può avviare, azzerare e collaudare la soluzione senza dipendenze esterne non documentate. | STORIE 3

> **US-001 — Avvio locale riproducibile** — PERSONA Sviluppatore / amministratore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE Nessuna Come sviluppatore voglio avviare l’intero MVP con un unico comando, così da ottenere frontend, API, database, storage, scheduler e servizio e-mail demo pronti all’uso.

Criteri di accettazione

- Dato Docker e Docker Compose, il comando documentato porta tutti i servizi in stato healthy senza interventi manuali.
- Al primo avvio vengono applicate migrazioni e seed solo se il database è vuoto.
- README con prerequisiti, porte, credenziali demo, test e reset; nessun segreto reale nel repository.
Note di implementazione e limiti

- Comando atteso: docker compose up --build.
- Endpoint /health e /ready obbligatori.
> **US-002 — Accesso demo e cambio ruolo controllato** — PERSONA Utente demo   |   PRIORITÀ MUST   |   TAGLIA S DIPENDENZE US-001 Come partecipante alla demo voglio accedere con account preconfigurati per ciascun ruolo, così da verificare viste e autorizzazioni.

Criteri di accettazione

- Account seed per Struttura, Gare, Amministrazione, Fornitore, Dirigente, Validatore e Admin.
- Ogni account vede il ruolo attivo e solo le funzioni autorizzate.
- Impersonazione disponibile solo ad Admin, chiaramente marcata e auditata; logout invalida la sessione.
Note di implementazione e limiti

- Autenticazione locale ammessa; SSO fuori perimetro.
- Password demo nel README e sostituibili da ambiente.
> **US-003 — Autorizzazioni RBAC e audit delle operazioni** — PERSONA Amministratore piattaforma   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001, US-002 Come amministratore voglio proteggere ogni API e azione UI con ruoli e ambiti, così da impedire modifiche non autorizzate.

Criteri di accettazione

- Richiesta non autenticata = 401; autenticata ma non autorizzata = 403.
- Struttura non approva riprogrammazioni né registra pagamenti; Fornitore vede solo contratti assegnati.
- Ogni modifica sensibile genera audit con utente, data, prima/dopo e motivazione quando richiesta.
Note di implementazione e limiti

- Controlli applicati lato server, non solo nascondendo pulsanti.
- Audit non modificabile dagli utenti applicativi.

## EP-01 — Portafoglio, programmazione e baseline

> OBIETTIVO Disporre di una vista unica delle procedure, mantenendo separati baseline, previsione aggiornata ed effettivo. | OUTCOME INAPP individua scostamenti, responsabilità e importi a rischio senza perdere la programmazione originaria. | STORIE 4

> **US-010 — Caricamento del portafoglio sintetico** — PERSONA Amministratore piattaforma   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001 Come amministratore voglio importare il portafoglio demo da file strutturati, così da riprodurre scenari realistici senza inserimenti manuali.

Criteri di accettazione

- Il seed importa almeno 12 procedure con milestone, annualità, contratti, SAL, pagamenti, documenti e alert coerenti.
- Ogni record è is_demo=true e usa identificativi chiaramente non validi.
- Il secondo import non duplica dati; errori riportano riga/campo e non lasciano parziali non tracciati.
Note di implementazione e limiti

- Supportare JSON/CSV e XLSX per la baseline.
- Il dataset è descritto nel capitolo 8.
> **US-011 — Elenco portafoglio con ricerca e filtri** — PERSONA Operatore di monitoraggio   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-010 Come operatore voglio cercare e filtrare le procedure, così da concentrarmi su scadenze, criticità e responsabilità rilevanti.

Criteri di accettazione

- La lista mostra codice, oggetto, struttura, tipologia, fase, health, prossima scadenza, programmato e importo a rischio.
- Ricerca e filtri per struttura, owner, fase, stato, rischio, annualità, tipologia e alert.
- Ordinamento, paginazione e filtri lato server persistono nell’URL; ritorno dalla scheda conserva il contesto.
Note di implementazione e limiti

- Gestire almeno 1.000 procedure.
- Stati comprensibili anche senza solo colore.
> **US-012 — Confronto baseline, previsione ed effettivo** — PERSONA Dirigente / operatore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-010 Come utente voglio confrontare date e importi programmati, aggiornati ed effettivi, così da capire dove la procedura si è discostata.

Criteri di accettazione

- Per ogni milestone/importo sono mostrati baseline, ultima previsione approvata ed effettivo.
- Scostamento temporale in giorni con segno; economico in euro e percentuale.
- Baseline immutabile; dato mancante o conflittuale mostrato esplicitamente con evidenza.
Note di implementazione e limiti

- Ogni valore espone fonte o indicazione di inserimento manuale.
- Le date effettive non cancellano la baseline.
> **US-013 — Creazione e versione di una procedura in bozza** — PERSONA Struttura richiedente   |   PRIORITÀ SHOULD   |   TAGLIA M DIPENDENZE US-003, US-030 Come Struttura voglio creare o aggiornare una procedura in bozza prima della memoria, così da completare fabbisogno, importi e deliverable.

Criteri di accettazione

- La bozza richiede oggetto, struttura, responsabile, tipologia, importo, annualità e data obiettivo memoria.
- Il salvataggio conserva cronologia e non genera date effettive.
- La consegna memoria blocca la baseline, trasferisce la titolarità a Gare e genera milestone successive.
Note di implementazione e limiti

- La memoria può essere caricata manualmente o estratta.
- Modifiche post-consegna richiedono variazione versionata e motivazione.

## EP-02 — Fascicolo documentale ed evidenze

> OBIETTIVO Costruire un fascicolo digitale verificabile per ciascuna procedura. | OUTCOME Ogni dato importante può essere ricondotto al file, alla pagina o alla cella da cui deriva. | STORIE 4

> **US-020 — Acquisizione da cartella o ZIP** — PERSONA Amministratore / operatore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001, US-010 Come operatore voglio acquisire workbook e PDF da cartella demo o ZIP, così da popolare il fascicolo senza rinominare ogni file.

Criteri di accettazione

- Accetta XLSX/PDF in sottocartelle e conserva nome, hash, dimensione, data import e percorso logico.
- File non conformi o oltre limite sono rifiutati con messaggio esplicito.
- Import idempotente, nessuna modifica ai sorgenti, UI con avanzamento ed esito per file.
Note di implementazione e limiti

- Comando server-side importa /demo-data.
- Scansione ricorsiva obbligatoria.
> **US-021 — Associazione automatica dei documenti** — PERSONA Operatore di monitoraggio   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-020, US-080 Come operatore voglio associare documenti alla procedura tramite identificativi e contenuto, così da ridurre errori di fascicolazione.

Criteri di accettazione

- Ordine di matching: ID demo, CIG/CUP demo, codice interno, similarità oggetto.
- Ogni associazione riporta metodo, affidabilità ed evidenze.
- Sotto soglia entra in validazione; correzione non cancella la proposta originaria.
Note di implementazione e limiti

- Algoritmo deterministico con adapter AI opzionale.
- Un documento è collegato a una sola procedura salvo allegati condivisi espliciti.
> **US-022 — Estrazione campi con OCR di fallback** — PERSONA Validatore   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-020 Come validatore voglio estrarre date, importi, identificativi, atti, operatore, milestone e piano pagamenti, così da confrontare atti e programmazione.

Criteri di accettazione

- Prima estrazione testuale; se assente o sotto soglia, OCR locale configurabile.
- Ogni campo conserva file, pagina, estratto, metodo, affidabilità e timestamp.
- Valori a bassa affidabilità non aggiornano il validato; indisponibilità OCR è recuperabile.
Note di implementazione e limiti

- Campi minimi: tipo/numero/data atto, netto/IVA/lordo, CIG/CUP, date contratto, percentuali e date SAL.
- Pagina renderizzata disponibile come fonte visiva.
> **US-023 — Validazione, correzione e conflitti** — PERSONA Validatore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-021, US-022, US-080 Come validatore voglio approvare, correggere o rifiutare i dati estratti, così da ottenere dati consolidati e tracciabili.

Criteri di accettazione

- La coda mostra proposta, fonte, affidabilità e conflitti.
- Correzione o rifiuto richiedono motivazione; originale sempre conservato.
- Aggiornamento di timeline/contratto/finanza avviene solo dopo conferma dell’impatto.
Note di implementazione e limiti

- Gerarchia fonti configurabile.
- Mai correggere automaticamente un documento sorgente.

## EP-03 — Workflow, cronoprogramma e responsabilità

> OBIETTIVO Rappresentare il processo come sequenza di milestone dipendenti e configurabili. | OUTCOME Ogni procedura dispone di una timeline attiva e non di una semplice cronologia. | STORIE 4

> **US-030 — Generazione cronoprogramma da modello** — PERSONA Ufficio Gare   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-010, US-100 Come Ufficio Gare voglio generare le milestone dalla tipologia e dalla data di avvio, così da avere scadenze coerenti e confrontabili.

Criteri di accettazione

- Il modello genera milestone con offset, durata minima, owner e dipendenze.
- Sono presenti modelli demo 1, 4, 7 e 9 mesi modificabili.
- Le date non lavorative sono spostate secondo regola; nuove versioni modello non alterano procedure esistenti.
Note di implementazione e limiti

- Durate demo non sono termini legali ufficiali.
- La memoria è la prima milestone operativa monitorata.
> **US-031 — Aggiornamento milestone previste ed effettive** — PERSONA Responsabile di fase   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-030 Come responsabile voglio registrare completamento, data effettiva, esito e documenti, così da aggiornare lo stato reale.

Criteri di accettazione

- Stati: prevista, in scadenza, completata, scaduta, sospesa, non applicabile.
- Completamento richiede data e, ove configurato, documento o nota.
- Date effettive non cambiano con riprogrammazione; alert si chiudono solo se condizioni soddisfatte.
Note di implementazione e limiti

- Azioni rispettano owner e permessi.
- Modifiche retrodatate sempre audit.
> **US-032 — Calcolo fase e stato di salute** — PERSONA Operatore / dirigente   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-030, US-040, US-083 Come utente voglio vedere fase corrente e health status calcolati, così da distinguere avanzamento e rischio.

Criteri di accettazione

- Fase dalla prima milestone obbligatoria incompleta; health verde/ambra/rosso/neutro con etichetta.
- Scadenza entro soglia = ambra; superata o conflitto finanziario critico = rosso.
- Regola causale visibile; procedure chiuse/annullate non generano alert ordinari.
Note di implementazione e limiti

- Fase e health sono distinti.
- Prevale la severità maggiore.
> **US-033 — Passaggio di responsabilità** — PERSONA Struttura / Gare / Amministrazione   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003, US-030 Come responsabile di processo voglio che la titolarità cambi in base alla fase, così da inviare promemoria alla persona corretta.

Criteri di accettazione

- Prima della memoria owner Struttura; dopo consegna owner Gare; in esecuzione coinvolte Struttura e Amministrazione.
- Ogni handoff registra data, ruoli e motivazione.
- Alert aperti sono riassegnati senza perdere storico; Fornitore vede solo attività assegnate.
Note di implementazione e limiti

- Responsabilità di addendum/chiusura configurabile.
- RUP è attributo dell’Ufficio Gare nell’MVP.

## EP-04 — Scadenze, reminder ed escalation

> OBIETTIVO Avvisare prima del rischio e non solo registrare il ritardo. | OUTCOME Gli uffici dispongono del tempo necessario per intervenire prima che procedura e spesa slittino. | STORIE 4

> **US-040 — Reminder cinque giorni prima della memoria** — PERSONA Struttura richiedente   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-030, US-101 Come Struttura voglio ricevere un avviso quando mancano cinque giorni alla memoria, così da evitare lo slittamento della procedura.

Criteri di accettazione

- Con soglia T-5 il job genera un alert una sola volta per procedura/livello.
- L’alert riporta procedura, data limite, giorni residui, conseguenza e azione suggerita.
- Compare in-app e nell’outbox demo; si chiude automaticamente se la memoria viene presentata.
Note di implementazione e limiti

- Soglia configurabile per milestone.
- Calcolo usa calendario e data demo.
> **US-041 — Escalation progressiva** — PERSONA Dirigente / responsabile   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-040 Come dirigente voglio ricevere escalation quando un alert non è risolto, così da attivare azioni organizzative prima del blocco.

Criteri di accettazione

- Matrice demo T-10, T-5, T-2, T0 e T+1.
- Destinatari aumentano da owner a Gare e Dirigente; invii idempotenti e tracciati.
- Utente autorizzato può sospendere escalation con motivo e nuova data controllo.
Note di implementazione e limiti

- Canale obbligatorio in-app; SMTP mock incluso.
- Teams/SMS reali fuori perimetro.
> **US-042 — Centro alert operativo** — PERSONA Operatore di monitoraggio   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-032, US-040 Come operatore voglio una coda unica di alert e anomalie, così da assegnare priorità e responsabilità.

Criteri di accettazione

- Filtri per severità, tipo, owner, procedura, struttura, stato e scadenza.
- Ogni elemento mostra regola, evidenza, impatto, responsabile e azioni.
- Viste “mie”, “struttura”, “critici”, “da riprogrammare”, “finanziari”; apertura porta alla sezione pertinente.
Note di implementazione e limiti

- Alert e anomalie condividono la coda ma restano tipologie distinte.
- Export CSV.
> **US-043 — Presa in carico e risoluzione alert** — PERSONA Responsabile di fase   |   PRIORITÀ MUST   |   TAGLIA S DIPENDENZE US-042 Come responsabile voglio prendere in carico e risolvere un alert, così da documentare l’azione e verificarne l’esito.

Criteri di accettazione

- Stati: aperto, preso in carico, sospeso, risolto, chiuso automaticamente.
- Risoluzione manuale richiede nota/allegato e non modifica da sola milestone o finanza.
- Admin può ricalcolare controlli; riesecuzione non duplica alert equivalenti.
Note di implementazione e limiti

- La chiusura non cancella lo storico.
- Utente e data di presa in carico visibili.

## EP-05 — Riprogrammazione assistita e simulazione impatti

> OBIETTIVO Trasformare un ritardo in una decisione informata su date, annualità e criticità. | OUTCOME INAPP valuta prima dell’approvazione come cambia il cronoprogramma e dove si sposta la spesa. | STORIE 5

> **US-050 — Apertura della necessità di riprogrammazione** — PERSONA Ufficio Gare   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-031, US-041 Come Ufficio Gare voglio che una milestone bloccante scaduta apra una proposta di riprogrammazione, così da non lasciare la procedura incoerente.

Criteri di accettazione

- Al T+1 la procedura riceve flag “riprogrammazione richiesta”.
- Sono identificati causa, giorni di ritardo, date downstream e importi potenzialmente spostati.
- La proposta resta bozza e non modifica il piano; apertura manuale consentita con motivazione.
Note di implementazione e limiti

- Comportamento obbligatorio per la memoria.
- Milestone bloccanti configurabili.
> **US-051 — Simulazione delle nuove date** — PERSONA Ufficio Gare   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-050, US-030 Come Ufficio Gare voglio simulare lo spostamento della milestone causale e delle successive, così da ottenere un cronoprogramma realistico.

Criteri di accettazione

- Utente indica data minima, causa, vincoli e note.
- Motore preserva completate/effettive e applica durate, dipendenze e calendario alle sole future.
- Mostra prima/dopo, delta e percorso critico; simulazione salvata separatamente.
Note di implementazione e limiti

- Motore deterministico con orologio applicativo configurabile.
- Calendario applicato in modo uniforme.
> **US-052 — Ricalcolo di SAL, pagamenti e annualità** — PERSONA Amministrazione / Contabilità   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-051, US-062 Come Amministrazione voglio vedere come una riprogrammazione sposta SAL e pagamenti, così da aggiornare la previsione di spesa.

Criteri di accettazione

- Nuova stipula/milestone ricalcola date SAL secondo offset.
- Importi riaggregati per annualità/fonte senza cambiare effettivi.
- Vista mostra importi spostati e differenza baseline; ultimo SAL assorbe centesimi di arrotondamento.
Note di implementazione e limiti

- Supportare qualsiasi piano validato, inclusi 20/50/30 e 30/40/30.
- Pagamento previsto dipende da accettazione e termine configurato.
> **US-053 — Criticità finanziarie e temporali** — PERSONA Dirigente / Amministrazione   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-052, US-061 Come decisore voglio conoscere le criticità della nuova pianificazione, così da evitare una riprogrammazione non sostenibile.

Criteri di accettazione

- Segnala disponibilità annuale superata, fine finanziamento, milestone oltre termine e incoerenze con impegni.
- Ogni criticità indica importo/giorni, regola e azioni; severità bloccante o warning.
- P-002 evidenzia €80.000 nel 2027 e P-008 €100.000.
Note di implementazione e limiti

- Nessuna previsione statistica richiesta.
- Criticità da regole esplicite e riproducibili.
> **US-054 — Confronto e approvazione riprogrammazione** — PERSONA Dirigente / validatore   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-051, US-052, US-053, US-082 Come approvatore voglio confrontare fino a tre alternative e approvarne una, così da creare una nuova previsione senza perdere la baseline.

Criteri di accettazione

- Confronta alternativa più rapida, minore impatto annuale e proposta manuale.
- Ogni alternativa mostra date, importi, criticità e spiegazione.
- Approvazione crea nuova versione e audit; rifiuto conserva simulazione e motivo senza modifiche.
Note di implementazione e limiti

- Alternative ottenibili con euristiche deterministiche.
- Override blocco riservato e motivato.

## EP-06 — Contratti, SAL, liquidazioni e pagamenti

> OBIETTIVO Monitorare l’esecuzione economica del contratto e collegarla alla previsione di spesa. | OUTCOME Il sistema mostra programmato, contrattualizzato, maturato, liquidato, pagato e residuo. | STORIE 6

> **US-060 — Registrazione e consultazione contratto** — PERSONA Ufficio Gare   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-012, US-023 Come Ufficio Gare voglio registrare gli elementi essenziali del contratto, così da avviare il monitoraggio dell’esecuzione.

Criteri di accettazione

- Campi: operatore, CIG/CUP demo, netto, IVA, lordo, stipula, decorrenza, durata, fine e fonte.
- Mostra differenza tra programmato e contrattualizzato.
- Addendum sono versioni collegate; contratto attivo solo dopo aggiudicazione salvo migrazione motivata.
Note di implementazione e limiti

- Identificativi chiaramente sintetici.
- Importi EUR a due decimali.
> **US-061 — Disponibilità e importi per annualità** — PERSONA Amministrazione / Contabilità   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-010 Come Amministrazione voglio gestire stanziato, prenotato, impegnato, liquidato, pagato e disponibilità, così da verificare sostenibilità.

Criteri di accettazione

- Più allocazioni annuali/fonti per procedura.
- Valori negativi vietati e incoerenze segnalate; residuo con formula esplicita e dettaglio movimenti.
- Annullamento P-011 rilascia €75.000 non impegnati e genera movimento auditato.
Note di implementazione e limiti

- Nessuna scrittura InGov.
- Gerarchia grandezze configurabile.
> **US-062 — Definizione piano SAL e pagamenti** — PERSONA Struttura / Ufficio Gare   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-060, US-023 Come responsabile del contratto voglio definire percentuali, importi e date SAL, così da alimentare monitoraggio fisico e finanziario.

Criteri di accettazione

- SAL supporta percentuale/importo, data, deliverable, owner e termine pagamento.
- Somma percentuali = 100 salvo eccezione; importi e arrotondamenti calcolati.
- Piano estratto da addendum deve essere validato prima del consolidamento.
Note di implementazione e limiti

- Dataset con 20/50/30, 30/40/30 e rata unica.
- Milestone contrattuali distinte da quelle di gara.
> **US-063 — Avanzamento del SAL** — PERSONA Struttura / Fornitore / validatore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003, US-062 Come responsabile voglio registrare presentazione, verifica, accettazione o rigetto di un SAL, così da controllare deliverable e pagamenti.

Criteri di accettazione

- Stati minimi: pianificato, presentato, in verifica, accettato, rigettato, fatturato, liquidato, pagato, scaduto.
- Fornitore carica solo sulle procedure assegnate.
- Accettazione richiede data/utente/nota; rigetto motivo; P-010 risulta scaduto.
Note di implementazione e limiti

- Transizioni validate lato server.
- Demo può semplificare passaggi mantenendo stati distinti.
> **US-064 — Liquidazioni e pagamenti parziali** — PERSONA Amministrazione / Contabilità   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-061, US-063 Come Amministrazione voglio registrare liquidazioni e pagamenti totali o parziali, così da conoscere l’utilizzo effettivo.

Criteri di accettazione

- Pagamento registra importo, data, riferimento, SAL, annualità e fonte.
- Somma non supera liquidato né contratto; rettifiche tramite storno, non cancellazione.
- P-004 mostra €47.600 pagati e €190.400 residui; P-009 €305.000 liquidati non pagati.
Note di implementazione e limiti

- Numero mandato facoltativo.
- Nessun IBAN o dato bancario.
> **US-065 — Riconciliazione e previsione finanziaria** — PERSONA Dirigente / Amministrazione   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-061, US-062, US-063, US-064 Come utente voglio una vista riconciliata di contratto, SAL e pagamenti, così da verificare residui, ritardi e previsione.

Criteri di accettazione

- Mostra programmato, contrattualizzato, impegnato, accettato, fatturato, liquidato, pagato e residui.
- Ogni totale è ottenibile dal dettaglio e le formule sono documentate.
- Ritardi aggiornano previsione senza alterare effettivi; differenze generano anomalie.
Note di implementazione e limiti

- Aggregazione mensile, trimestrale e annuale.
- Dato non disponibile non equivale a zero.

## EP-07 — Dashboard, scheda procedura e report

> OBIETTIVO Fornire viste operative e direzionali orientate alle azioni. | OUTCOME Gli utenti rispondono subito a cosa scade, cosa è in ritardo e quale spesa è a rischio. | STORIE 4

> **US-070 — Dashboard direzionale** — PERSONA Dirigente   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-011, US-032, US-065 Come dirigente voglio una dashboard sintetica, così da conoscere stato complessivo, criticità e impatto economico.

Criteri di accettazione

- KPI: procedure, ritardi, da riprogrammare, alert critici, programmato, contrattualizzato, pagato, importo a rischio.
- Filtri per struttura, annualità e fonte; ogni KPI apre il dettaglio.
- Aggiornamento visibile; valori seed riconciliati e testati.
Note di implementazione e limiti

- Stato “dati non disponibili” obbligatorio.
- Dashboard non sostituisce il dettaglio.
> **US-071 — Dashboard operativa delle prossime azioni** — PERSONA Operatore / responsabile   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-042, US-080 Come operatore voglio vedere attività e scadenze ordinate per urgenza, così da organizzare il lavoro quotidiano.

Criteri di accettazione

- Scadenze 7/15/30 giorni, alert presi in carico, validazioni e SAL in attesa.
- Ogni elemento mostra owner, giorni residui, impatto e azione primaria.
- Vista personale e di struttura; azioni rapide applicano le stesse validazioni complete.
Note di implementazione e limiti

- Ordine per severità, scadenza, importo.
- Completate fuori dalla vista ma nello storico.
> **US-072 — Scheda procedura a sezioni** — PERSONA Tutti i ruoli autorizzati   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-003, US-012 Come utente voglio una scheda unica con dati, timeline, documenti, finanza, alert e audit, così da ricostruire la situazione.

Criteri di accettazione

- Testata con codice, oggetto, fase, health, owner, importi e prossima azione.
- Tab: Panoramica, Cronoprogramma, Documenti, Finanza, Alert, Simulazioni, Audit.
- Deep link copiabile; dati filtrati lato API per ruolo.
Note di implementazione e limiti

- Leggibile su 1366x768.
- Mobile responsivo ma non primario.
> **US-073 — Esportazione di report e dati** — PERSONA Dirigente / operatore   |   PRIORITÀ SHOULD   |   TAGLIA M DIPENDENZE US-070, US-072 Come utente voglio esportare sintesi e dettaglio, così da condividere lo stato e conservarne un’istantanea.

Criteri di accettazione

- CSV/XLSX del portafoglio e PDF di procedura/report.
- Export applica filtri e riporta data, utente, perimetro e versione.
- Ogni export è auditato con hash; PDF include fonti essenziali, non documenti completi.
Note di implementazione e limiti

- DOCX facoltativo.
- Formule coerenti con la UI.

## EP-08 — Validazione, qualità del dato e audit

> OBIETTIVO Garantire che automazione e AI assistano senza sostituire la responsabilità umana. | OUTCOME Ogni informazione è verificabile, correggibile e ricostruibile nel tempo. | STORIE 4

> **US-080 — Coda unificata di validazione** — PERSONA Validatore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003 Come validatore voglio una coda delle proposte che richiedono controllo, così da gestire estrazioni, associazioni, conflitti e override.

Criteri di accettazione

- Distingue associazione, campo estratto, conflitto, override e riprogrammazione.
- Ordine per affidabilità, severità, importo e anzianità.
- Approvazione massiva solo per elementi omogenei ad alta affidabilità; ogni decisione auditata.
Note di implementazione e limiti

- Soglie configurabili.
- Impatto mostrato prima della conferma.
> **US-081 — Provenienza e apertura della fonte** — PERSONA Tutti i ruoli autorizzati   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-020, US-023 Come utente voglio aprire la fonte di ogni dato, così da verificare pagina, cella o inserimento che lo supporta.

Criteri di accettazione

- Campi principali mostrano indicatore e link alla fonte.
- PDF apre pagina; XLSX mostra file/foglio/cella; manuale mostra autore e timestamp.
- Fonte originale resta accanto al validato e i link rispettano permessi senza esporre path fisici.
Note di implementazione e limiti

- Viewer integrato o download controllato.
- Assistente riusa lo stesso schema di evidenza.
> **US-082 — Audit e versioni consultabili** — PERSONA Auditor / amministratore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003 Come auditor voglio ricostruire chi ha cambiato cosa e perché, così da verificare processo e decisioni.

Criteri di accettazione

- Audit registra creazione, modifica, approvazione, rifiuto, override, import, export e impersonazione.
- Confronto prima/dopo e motivazione per versioni.
- Filtri per procedura, utente, entità, azione e intervallo; utenti ordinari non possono alterare eventi.
Note di implementazione e limiti

- Mascherare dati sensibili non necessari.
- ProgramVersion e ContractVersion sono oggetti espliciti.
> **US-083 — Anomalie di completezza e coerenza** — PERSONA Operatore / validatore   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-023, US-065 Come operatore voglio rilevare dati mancanti o incoerenti, così da correggere il fascicolo prima di decisioni errate.

Criteri di accettazione

- Regole: date impossibili, importi non riconciliati, SAL non 100, codici conflittuali, documento mancante, pagamento oltre contratto.
- Ogni anomalia ha severità, evidenze, responsabile e stato.
- Seed include data incoerente, documento mancante e conflitto economico; nessuna correzione automatica.
Note di implementazione e limiti

- Anomalie distinte dagli alert temporali ma nella stessa coda.
- Regole unit-tested.

## EP-09 — Assistente conversazionale con fonti

> OBIETTIVO Permettere domande in italiano senza rinunciare a regole, permessi e tracciabilità. | OUTCOME L’utente trova rapidamente stato, scadenze e importi e apre le evidenze. | STORIE 3

> **US-090 — Domande sulla singola procedura** — PERSONA Utente autorizzato   |   PRIORITÀ SHOULD   |   TAGLIA L DIPENDENZE US-072, US-081 Come utente voglio chiedere lo stato di una procedura in linguaggio naturale, così da ottenere una sintesi verificabile.

Criteri di accettazione

- Intenti minimi: stato, scadenza, motivo rischio, importi, SAL, pagamenti, documenti mancanti, ultima riprogrammazione.
- Risposta distingue dati, inferenze di regola e informazioni mancanti.
- Ogni data/importo/fatto include link a evidenza; nessuna modifica o approvazione.
Note di implementazione e limiti

- Parser deterministico ammesso; LLM adapter opzionale.
- Stesso RBAC delle API.
> **US-091 — Domande trasversali sul portafoglio** — PERSONA Dirigente / operatore   |   PRIORITÀ SHOULD   |   TAGLIA L DIPENDENZE US-070, US-090 Come utente voglio porre domande aggregate, così da individuare scadenze, spesa a rischio e pagamenti pendenti.

Criteri di accettazione

- Supporta memorie nei prossimi N giorni, procedure da riprogrammare e pagamenti che slittano.
- Risposta con conteggio, totale, elenco limitato e link alla lista filtrata.
- Aggregazioni coincidono con dashboard; intenti non supportati producono esempi, non invenzioni.
Note di implementazione e limiti

- Limite risultati configurabile.
- Log query senza dati non necessari.
> **US-092 — Comportamento sicuro e resiliente assistente** — PERSONA Amministratore / utente   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003, US-081, US-110 Come amministratore voglio che l’assistente sia vincolato alle fonti e non blocchi il prodotto, così da evitare risposte non verificabili.

Criteri di accettazione

- Con provider AI assente restano intenti deterministici e core.
- Dichiara dati mancanti o conflitti; prompt non bypassa permessi.
- Timeout/errori gestiti senza segreti o stack trace.
Note di implementazione e limiti

- Generazione atti fuori perimetro.
- Risposte non sono decisioni automatiche.

## EP-10 — Configurazione e amministrazione

> OBIETTIVO Evitare regole hardcoded e adattare il prototipo al processo reale. | OUTCOME Le decisioni aperte possono essere validate modificando parametri e modelli. | STORIE 4

> **US-100 — Configurazione modelli di procedura** — PERSONA Amministratore piattaforma   |   PRIORITÀ MUST   |   TAGLIA L DIPENDENZE US-003 Come amministratore voglio configurare fasi, milestone, durate e dipendenze per tipologia, così da adattare il cronoprogramma.

Criteri di accettazione

- Modello versionato con validità, milestone, offset, durata, owner, obbligatorietà e documenti attesi.
- Nuova versione non modifica procedure esistenti salvo migrazione.
- Impedisce dipendenze cicliche; quattro modelli demo 1/4/7/9 mesi marcati esemplificativi.
Note di implementazione e limiti

- Configurazione UI o YAML versionato.
- Regole ufficiali solo dopo validazione.
> **US-101 — Calendari, soglie ed escalation** — PERSONA Amministratore piattaforma   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-003 Come amministratore voglio configurare giorni lavorativi, festività, soglie e destinatari, così da adattare reminder ed escalation.

Criteri di accettazione

- Timezone, weekend, festività, spostamento e data demo configurabili.
- Soglie T-10, T-5, T-2, T0, T+1 attivabili.
- Matrice associa evento, severità, destinatari e canali; modifiche versionate non retroattive.
Note di implementazione e limiti

- Timezone default Europe/Rome.
- Data seed 01/10/2026.
> **US-102 — Gestione utenti, ruoli e ambiti** — PERSONA Amministratore piattaforma   |   PRIORITÀ SHOULD   |   TAGLIA M DIPENDENZE US-003 Come amministratore voglio assegnare ruoli e ambiti di struttura, così da limitare accesso e operazioni.

Criteri di accettazione

- Utente con più ruoli e ambiti.
- Modifiche permessi audit e account disabilitato non accede ma resta nello storico.
- Fornitore associato solo ai contratti autorizzati.
Note di implementazione e limiti

- Gestione locale sufficiente.
- Provisioning directory futuro.
> **US-103 — Dizionari e gerarchia fonti** — PERSONA Amministratore / validatore   |   PRIORITÀ SHOULD   |   TAGLIA M DIPENDENZE US-023, US-080 Come amministratore voglio configurare dizionari e precedenza delle fonti, così da gestire conflitti in modo esplicito.

Criteri di accettazione

- Configurabili tipi documento, stati, fonti, strutture, tipologie e codici anomalia.
- Gerarchia demo: workbook baseline, atti fatti amministrativi, contabilità demo pagamenti.
- Conflitto genera validazione; etichette modificabili senza cambiare codici storici.
Note di implementazione e limiti

- Civilia e InGov fonti future non connesse.
- Nessuna risoluzione silenziosa.

## EP-11 — Resilienza, osservabilità e sicurezza operativa

> OBIETTIVO Rendere l’MVP dimostrabile, diagnosticabile e robusto rispetto a errori e servizi opzionali. | OUTCOME La demo non si interrompe per un provider AI indisponibile e resta diagnosticabile. | STORIE 3

> **US-110 — Funzionamento core senza AI** — PERSONA Utente / amministratore   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001 Come utente voglio continuare a usare portafoglio, scadenze, riprogrammazione e finanza quando l’AI è indisponibile, così da non dipendere da servizi esterni.

Criteri di accettazione

- LLM_PROVIDER=disabled mantiene core e intenti deterministici.
- Estrazioni validate e documenti restano consultabili; solo opzionali sono degradati.
- Dashboard sistema segnala componente indisponibile; test simula timeout.
Note di implementazione e limiti

- Regole e riprogrammazione non invocano LLM.
- OCR disattivabile con errore recuperabile.
> **US-111 — Health check, log e metriche** — PERSONA Amministratore tecnico   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001 Come amministratore tecnico voglio health check, log correlati e metriche, così da diagnosticare import, job e richieste.

Criteri di accettazione

- Health/readiness per web, API, DB, scheduler e storage.
- Correlation ID per richieste/job; errori senza dati sensibili.
- Metriche: durata, errori, job, alert, documenti e coda; UI mostra ultimi job/import.
Note di implementazione e limiti

- Log JSON preferiti.
- Nessun APM esterno obbligatorio.
> **US-112 — Reset, backup e protezione upload** — PERSONA Amministratore tecnico   |   PRIORITÀ MUST   |   TAGLIA M DIPENDENZE US-001, US-020 Come amministratore voglio ripristinare il dataset demo e bloccare file pericolosi, così da mantenere una demo affidabile.

Criteri di accettazione

- Backup/restore documentati; reset richiede conferma e ricarica seed deterministico.
- Upload limitati per estensione, MIME, dimensione e nome, fuori web root.
- Path traversal e ZIP slip rifiutati e auditati.
Note di implementazione e limiti

- Antivirus reale futuro con adapter/quarantena.
- Reset solo Admin.

# 9. Requisiti di interfaccia


## 9.1 Mappa delle schermate

| ID | Schermata | Contenuto minimo |
|---|---|---|
| UI-01 | Accesso demo | Credenziali, ruolo attivo, stato servizi. |
| UI-02 | Dashboard direzionale | KPI, importo a rischio, criticità e filtri. |
| UI-03 | Portafoglio | Tabella server-side, ricerca, filtri, export. |
| UI-04 | Scheda procedura | Panoramica, Timeline, Documenti, Finanza, Alert, Simulazioni, Audit. |
| UI-05 | Centro alert | Code personali/struttura, presa in carico e risoluzione. |
| UI-06 | Wizard riprogrammazione | Causa, date, finanza, criticità e decisione. |
| UI-07 | Contratto e SAL | Importi, piano SAL, liquidazioni e pagamenti. |
| UI-08 | Coda validazione | Proposte, fonti, approva/corregge/rifiuta. |
| UI-09 | Assistente | Prompt, risposta, fonti e link filtrati. |
| UI-10 | Amministrazione | Modelli, calendario, utenti, health e reset. |


## 9.2 Dashboard direzionale

- KPI: procedure totali, in ritardo, da riprogrammare, programmato, contrattualizzato, pagato, importo a rischio.
- Lista “Richiede attenzione” ordinata per severità, data, importo a rischio e anzianità.
- Trend baseline vs forecast per annualità; riparto della spesa; stato SAL/pagamenti.
- Filtri globali per struttura, annualità, tipologia, fase e health; ogni KPI apre il portafoglio filtrato.
- Indicazione della data di riferimento e dell’ultimo aggiornamento; mai usare indicatori senza unità o periodo.

## 9.3 Scheda procedura

| Tab | Contenuto minimo |
|---|---|
| Testata | Codice demo, oggetto, CIG/CUP demo, struttura, owner, tipologia, fase, health e importo. |
| Panoramica | Baseline/forecast/actual, prossima scadenza, problemi aperti, azioni consentite. |
| Timeline | Milestone, dipendenze, owner, date, scostamento, evidenze e stato. |
| Documenti | Fascicolo, classificazione, stato elaborazione, preview e campi estratti. |
| Finanza | Contratto, annualità, SAL, liquidazioni, pagamenti, residuo e previsioni. |
| Riprogrammazioni | Simulazioni, confronto, criticità, decisione e versioni. |
| Alert | Regola, severità, responsabile, evidenza, presa in carico e risoluzione. |
| Audit | Eventi, autore, data, prima/dopo, motivazione e correlation ID. |


## 9.4 Wizard di riprogrammazione

- Step 1 — causa: milestone, motivo, data proposta, vincoli e note.
- Step 2 — cronoprogramma: confronto baseline/forecast/simulazione e date bloccate.
- Step 3 — finanza: pagamenti spostati, annualità, disponibilità e conflitti.
- Step 4 — alternative: almeno una proposta se calcolabile, con motivazione trasparente.
- Step 5 — decisione: invia ad approvazione; approva/rifiuta con motivazione; riepilogo audit.

## 9.5 Accessibilità e feedback

- Navigazione completa da tastiera, focus visibile e ordine logico.
- Stati accompagnati da testo/icona, non solo colore.
- Tabelle con intestazioni, caption/aria-label e filtri etichettati.
- Form con errori contestuali e riepilogo; conferma per operazioni distruttive o irreversibili.
- Loading, empty, partial e error state espliciti per tutte le viste asincrone.
- Importi con valuta e separatori italiani; date in formato gg/mm/aaaa in UI e ISO nelle API.

# 10. Contratti API e integrazioni

L’OpenAPI generato dal backend è parte del deliverable. Gli endpoint sotto sono il minimo richiesto; nomi e granularità possono variare purché le capability e le autorizzazioni rimangano equivalenti.

| Metodo | Endpoint | Scopo | Autorizzazione |
|---|---|---|---|
| POST | /api/auth/login | Accesso demo | Pubblico |
| GET | /api/me | Utente, ruoli e ambiti | Autenticato |
| GET | /api/procedures | Lista, filtri, paginazione | Autenticato |
| POST | /api/procedures | Crea bozza | Struttura/Admin |
| GET | /api/procedures/{id} | Scheda procedura | Autenticato |
| PATCH | /api/procedures/{id} | Aggiorna campi | Per ruolo/fase |
| GET | /api/procedures/{id}/timeline | Milestone/scostamenti | Autenticato |
| POST | /api/procedures/{id}/milestones/{mid}/complete | Completa milestone | Owner/Validatore |
| GET | /api/procedures/{id}/documents | Fascicolo | Autenticato |
| POST | /api/imports | Import ZIP/cartella | Admin/Operatore |
| POST | /api/evidences/{id}/validate | Valida/corregge | Validatore |
| GET | /api/alerts | Coda alert/anomalie | Autenticato |
| POST | /api/alerts/{id}/acknowledge | Presa in carico | Responsabile |
| POST | /api/alerts/{id}/resolve | Risoluzione | Responsabile/Validatore |
| POST | /api/jobs/run-checks | Esegue controlli | Admin |
| POST | /api/procedures/{id}/reschedules/simulate | Simula | Gare/Amm. |
| GET | /api/procedures/{id}/reschedules | Simulazioni/versioni | Autenticato |
| POST | /api/reschedules/{id}/approve | Approva | Approvatore |
| POST | /api/reschedules/{id}/reject | Rifiuta | Approvatore |
| GET | /api/procedures/{id}/contract | Contratto | Autenticato |
| POST | /api/procedures/{id}/contract | Crea contratto | Gare |
| GET | /api/contracts/{id}/sals | Piano SAL | Autenticato |
| POST | /api/contracts/{id}/sals | Crea SAL | Gare/Struttura |
| POST | /api/sals/{id}/transition | Transizione SAL | Per ruolo |
| POST | /api/sals/{id}/payments | Registra pagamento | Amministrazione |
| GET | /api/dashboard/executive | KPI | Dirigente/Operatore |
| POST | /api/assistant/query | Query con fonti | Autenticato |
| GET | /api/audit | Ricerca audit | Auditor/Admin |
| GET | /api/admin/config | Configurazioni | Admin |
| PUT | /api/admin/config/{key} | Aggiorna config | Admin |
| GET | /health | Liveness | Tecnico |
| GET | /ready | Readiness | Tecnico |


## 10.1 Convenzioni API

- Base path /api; JSON UTF-8; date ISO-8601; timezone esplicita dove rilevante.
- Paginazione cursor o page/size, ma coerente in tutto il prodotto.
- Filtri ripetibili o query strutturata documentata; ordinamento con allowlist.
- Idempotency-Key per import, pagamenti e approvazioni ove necessario.
- Optimistic locking mediante version/ETag per modifiche concorrenti.
- Error envelope con code stabile, message utente, details sicuri e correlation_id.
- Ogni risposta contenente valori consolidati include evidence_refs o source_type.
- Nessun endpoint amministrativo esposto senza RBAC e audit.

## 10.2 Error envelope

```
{
  "error": {
    "code": "FINANCIAL_INVARIANT_VIOLATION",
    "message": "Il pagamento supera l'importo liquidato disponibile.",
    "details": {"available": "47600.00", "requested": "50000.00"},
    "correlation_id": "corr-demo-000184"
  }
}
```


## 10.3 Adapter esterni

| Adapter | Porta minima | Default / evoluzione |
|---|---|---|
| OCR | extract_text(file) -> pages, blocks, confidence | Locale di default; cloud solo se autorizzato. |
| LLM | classify/extract/explain(context, schema) | Provider opzionale; timeout e output validato. |
| Storage | put/get/presign/hash | Locale o S3-compatible. |
| Notification | enqueue/send/status | MailHog/SMTP mock; Teams futuro. |
| Accounting | read commitments/payments | Stub demo; InGov futuro. |
| Procurement | read procedure/status | Stub demo; Civilia/MePA/TuttoGare futuro. |


## 10.4 Payload di esempio — simulazione P-002

```
POST /api/procedures/P-002/reschedules/simulate
{
  "cause": "MEMORY_OVERDUE",
  "source_milestone": "MEMORY_SUBMISSION",
  "candidate_date": "2026-11-16",
  "preserve_actual_dates": true,
  "assumptions": {"calendar": "IT-DEMO", "template_version": "NEG-4M-v1"}
}

200 OK
{
  "simulation_id": "RS-DEMO-002-A",
  "date_changes": 7,
  "amount_shifted": "150000.00",
  "annual_impact": {"2026": "-150000.00", "2027": "+150000.00"},
  "criticalities": [{"code": "BUDGET_OVERFLOW", "year": 2027, "amount": "80000.00"}],
  "status": "SIMULATION"
}
```


# 11. Requisiti non funzionali e sicurezza

| ID | Area | Criterio verificabile |
|---|---|---|
| NFR-001 | Portabilità | Avvio completo con Docker Compose; nessuna dipendenza cloud obbligatoria. |
| NFR-002 | Prestazioni lista | Con 1.000 procedure, API portafoglio p95 <= 2 s in ambiente demo locale. |
| NFR-003 | Prestazioni simulazione | Procedura con <=30 milestone e <=20 movimenti: p95 <= 3 s. |
| NFR-004 | Idempotenza | Reimport dello stesso dataset: zero duplicati e stesso esito funzionale. |
| NFR-005 | Integrità monetaria | Decimal, EUR, due cifre; vietati float binari persistiti. |
| NFR-006 | Sicurezza | RBAC server-side, password hashate, validazione input e upload protetto. |
| NFR-007 | Segreti | Nessuna credenziale nel codice/seed; .env.example senza valori reali. |
| NFR-008 | Audit | Eventi sensibili immutabili, ricercabili e correlati a richiesta/job. |
| NFR-009 | Resilienza | AI/OCR indisponibili non bloccano core o dati validati. |
| NFR-010 | Accessibilità | Tastiera, focus, etichette, contrasto e stati non basati solo sul colore. |
| NFR-011 | Osservabilità | Health/readiness, log strutturati, correlation ID e metriche minime. |
| NFR-012 | Testabilità | Unit, integration ed E2E dei flussi P0; copertura dominio obiettivo >=70%. |
| NFR-013 | Manutenibilità | Regole, soglie, modelli e dizionari configurabili; niente dati demo hardcoded. |
| NFR-014 | Privacy demo | Nessun dato personale reale; identificativi e nomi fittizi marcati demo. |
| NFR-015 | Compatibilità | Browser desktop moderni; risoluzione primaria 1366x768+. |
| NFR-016 | Error handling | Errori comprensibili; dettagli tecnici solo nei log; no stack trace esposte. |


## 11.1 Controlli di sicurezza minimi

- Password hashate con algoritmo moderno; cookie/sessione sicuri; CSRF se applicabile.
- Validazione Pydantic/schema di ogni input; query parametrizzate; output encoding.
- Upload allowlist per estensione e MIME, dimensione massima, filename normalizzato, storage fuori web root.
- Rifiuto di path traversal, ZIP slip, archive bomb e file eseguibili; quarantena logica degli upload.
- Autorizzazione object-level: struttura, procedura e contratto verificati lato server.
- Rate limit almeno per login, import e assistant; timeout e limiti token/documento.
- Segreti soltanto da environment/secret store; log senza password, token, documenti o contenuti sensibili.
- Dipendenze pinning/lockfile e scansione vulnerabilità nel CI, con eccezioni documentate.

## 11.2 Audit minimo

| Evento | Prima/dopo | Motivazione | Attore | Correlation ID |
|---|---|---|---|---|
| Correzione campo | Sì | Obbligatoria | Validatore | Sì |
| Approvazione/rifiuto riprogrammazione | Sì | Obbligatoria | Approvatore | Sì |
| Registrazione/revoca pagamento | Sì | Obbligatoria | Amministrazione | Sì |
| Cambio permessi | Sì | Obbligatoria | Admin | Sì |
| Reset demo | Conteggi | Obbligatoria | Admin | Sì |
| Login fallito | No | Tecnica | Utente/IP | Sì |


## 11.3 Criteri di qualità del codice

- Type checking: mypy/pyright backend e TypeScript strict frontend.
- Formatter/linter automatici; nessuna build con errori lint bloccanti.
- Migrazioni DB versionate e testate su database vuoto e aggiornamento.
- Funzioni di dominio con test su casi limite: weekend, fine anno, IVA, parziali, conflitti e date effettive.
- Nessuna logica di importo o data duplicata tra UI, API e job.
- ADR per scelte irreversibili o sostanziali: auth, storage, scheduler, modello versioni, adapter AI.

# 12. Piano di sviluppo per il coding agent

> **Regola di esecuzione** — Il coding agent deve lavorare per incrementi eseguibili. Ogni incremento termina con migrazione, seed, test e README aggiornati. Non deve implementare in parallelo più moduli incompleti che impediscano una demo end-to-end.


## 12.1 Incrementi consigliati

| Incremento | Contenuto | Exit criteria |
|---|---|---|
| I0 — Bootstrap | EP-00; schema base; account; health; seed minimo. | Stack avviabile e T-001/T-002. |
| I1 — Portafoglio | EP-01 + EP-03 base; procedure, versioni, milestone e filtri. | P-001/P-002 visibili con timeline. |
| I2 — Alert | EP-04; scheduler, T-5, overdue, centro alert e outbox. | T-004/T-005 e coda operativa. |
| I3 — Riprogrammazione | EP-05; simulazione P-002, annualità, approvazione e audit. | T-006–T-010. |
| I4 — Contratto e SAL | EP-06; P-004/P-010, pagamenti e invarianti. | T-011–T-013/T-024. |
| I5 — Dashboard/report | EP-07 + parti EP-08; KPI, export, audit e validazione. | T-018/T-023/T-025. |
| I6 — Documenti | EP-02; import, hash, OCR, evidenze e conflitti. | T-014–T-016. |
| I7 — Assistente/admin | EP-09/10/11; intenti, config, AI-off, reset e observability. | T-019–T-022. |


## 12.2 Sequenza operativa per ogni incremento

- Leggere le user story e mappare i criteri di accettazione a test nominati.
- Aggiornare schema dati e migrazioni; evitare colonne JSON per dati che richiedono query/constraint.
- Implementare regole nel dominio e test unitari prima di controller/UI.
- Esporre API con OpenAPI e controlli RBAC/object-level.
- Implementare UI completa di loading/empty/error/unauthorized.
- Aggiornare seed e expected_results.json.
- Eseguire test unit, integration ed E2E; correggere regressioni.
- Aggiornare README, ADR e changelog; fornire screenshot o evidenza test.

## 12.3 Istruzioni vincolanti per l’AI coding agent

- Non inventare regole amministrative mancanti: aggiungere una configurazione o una decisione aperta.
- Non hardcodare P-001/P-002/P-004 nei servizi: i risultati devono derivare dai seed e dalle regole.
- Non usare un LLM per calcolare date, importi, permessi o stati.
- Non alterare la baseline durante simulazioni, reimport o correzioni.
- Non cancellare eventi finanziari/audit; usare revoche o scritture compensative.
- Non dichiarare una story completata senza test automatizzati dei criteri MUST.
- Non esporre file o campi a un ruolo che non abbia accesso alla procedura/contratto.
- Segnalare subito incoerenze tra documento, seed e codice; non riconciliarle silenziosamente.

## 12.4 Deliverable tecnici obbligatori

- Repository completo e avviabile; Dockerfile e docker-compose.yml.
- README con quick start, utenti demo, porte, reset, test e troubleshooting.
- Migrazioni e seed sintetico; expected_results.json.
- Specifica OpenAPI e collezione di richieste di esempio.
- Suite di test con report; matrice story → test.
- ADR principali e diagramma modello dati aggiornato.
- Runbook demo di 10–15 minuti e runbook tecnico di ripristino.
- Nessun segreto, dump reale o dato personale nel repository.

# 13. Collaudo, Definition of Done e demo script


## 13.1 Casi di collaudo

| ID | Test | Azione | Risultato atteso |
|---|---|---|---|
| T-001 | Avvio e seed | Avviare stack pulito. | Servizi healthy; 12 procedure presenti. |
| T-002 | Reimport | Eseguire di nuovo seed/import. | Nessun duplicato; conteggi invariati. |
| T-003 | Filtri | Filtrare ROSSO e annualità 2027. | Risultati coerenti e URL persistente. |
| T-004 | Reminder T-5 | Scheduler al 01/10/2026. | P-001 genera alert memoria e outbox. |
| T-005 | Memoria scaduta | Controlli su P-002. | Alert critico e riprogrammazione richiesta. |
| T-006 | Simulazione date | Spostare memoria P-002. | Future ricalcolate; effettive invariate. |
| T-007 | Finanza P-002 | Aprire simulazione. | 2027 €430k; conflitto €80k. |
| T-008 | Finanza P-008 | Simulare ritardo. | Conflitto 2027 €100k. |
| T-009 | Approva piano | Approvare alternativa. | Nuova versione; baseline intatta; audit. |
| T-010 | Rifiuta piano | Rifiutare con motivo. | Piano invariato; proposta conservata. |
| T-011 | Contratto P-004 | Aprire dettaglio. | 20/50/30; pagato €47.600; residuo €190.400. |
| T-012 | Pagamento parziale | Registrare parziale. | Residuo aggiornato; SAL non chiuso. |
| T-013 | SAL P-010 | Eseguire controlli. | SAL 1 scaduto e alert critico. |
| T-014 | Doc P-007 | Regole completezza. | Anomalia documento tecnico mancante. |
| T-015 | OCR | Importare PDF immagine. | OCR eseguito con metodo/affidabilità. |
| T-016 | Conflitto data | Importare data impossibile. | Anomalia; nessuna correzione automatica. |
| T-017 | Permessi | Fornitore accede a procedura altrui. | 403 e nessun dato esposto. |
| T-018 | Audit | Correggere campo estratto. | Prima/dopo, utente, data, motivo. |
| T-019 | Assistente P-004 | Chiedere pagato. | €47.600 con evidenze. |
| T-020 | Assistente portafoglio | Chiedere procedure da riprogrammare. | Elenco coerente con dashboard. |
| T-021 | AI off | Disabilitare provider. | Core e intenti deterministici operativi. |
| T-022 | Reset demo | Eseguire reset confermato. | Stato seed ripristinato. |
| T-023 | Export | Esportare vista filtrata. | File coerente e auditato. |
| T-024 | Vincolo pagamento | Pagare oltre liquidato. | Operazione rifiutata. |
| T-025 | KPI | Confrontare KPI e dettaglio. | Conteggi/importi riconciliati. |


## 13.2 Definition of Done dell’MVP

- Tutte le user story MUST sono implementate oppure hanno un’eccezione formalmente approvata.
- I test T-001–T-025 sono verdi o hanno deviazione registrata con impatto e workaround.
- La demo ricostruisce gli scenari P-001, P-002, P-004 e P-010 esclusivamente dai seed.
- P-001 genera correttamente il reminder T-5 alla data 01/10/2026.
- P-002 produce una simulazione con overflow 2027 di €80.000 e nessuna modifica prima dell’approvazione.
- P-004 mostra €47.600 pagati e €190.400 residui, con piano 20/50/30.
- Baseline, forecast, actual, proposed e validated sono distinguibili e non sovrascritti.
- Ogni importo/data consolidato ha evidenza o inserimento manuale auditato.
- RBAC è verificato sia in UI sia in API; i test di accesso negativo sono presenti.
- L’applicazione resta operativa con AI disabilitata.
- Avvio, reset e test sono riproducibili su ambiente pulito secondo README.
- Nessun segreto o dato reale è presente nel repository o nei log.

## 13.3 Demo script consigliato (10–15 minuti)

- Accedere come Dirigente e mostrare dashboard, data di riferimento e KPI.
- Aprire “Richiede attenzione” e filtrare le procedure con memoria in scadenza o scaduta.
- Aprire P-001 e mostrare il reminder T-5, destinatario, evidenza e presa in carico.
- Aprire P-002, spiegare il ritardo e avviare la simulazione di riprogrammazione.
- Mostrare date propagate, €150.000 spostati e overflow 2027 di €80.000.
- Confrontare due alternative; approvarne una e mostrare nuova versione e audit.
- Aprire P-004 e mostrare contratto, piano 20/50/30, SAL e residuo €190.400.
- Tentare un pagamento oltre il liquidato per mostrare il blocco deterministico.
- Fare una domanda all’assistente su P-004 e aprire le fonti.
- Disabilitare/mostrare AI off e confermare che portafoglio, alert e finanza restano operativi.

## 13.4 Evidenze da consegnare

- Report test automatici con versione commit.
- Screenshot o registrazione breve dei quattro scenari obbligatori.
- Export portafoglio filtrato e report procedura P-002.
- Esempio audit di approvazione e di pagamento respinto.
- OpenAPI, schema DB/ERD e log di avvio pulito.

# 14. Decisioni aperte e validazione

Queste decisioni non devono bloccare il prototipo: l’MVP usa il default indicato, ma il codice deve renderlo configurabile o isolato dietro un adapter. Prima della messa in produzione è necessaria la validazione formale.

| ID | Tema | Default MVP | Decisione richiesta |
|---|---|---|---|
| D-01 | Durate ufficiali | Modelli demo 1/4/7/9 mesi. | Validare milestone, giorni, sospensioni ed eccezioni. |
| D-02 | Fonte ufficiale | Workbook baseline; atti; contabilità demo. | Confermare gerarchia Excel/Civilia/InGov/atti. |
| D-03 | Approvazioni | Approva Dirigente/Validatore. | Indicare soggetti reali e deleghe. |
| D-04 | Fornitore | Accesso limitato a contratti/SAL assegnati. | Confermare accesso reale. |
| D-05 | Notifiche | In-app + SMTP mock. | Definire e-mail/Teams, mittenti e destinatari. |
| D-06 | Contabilità | Modello sintetico completo. | Allineare campi/formule a InGov e prassi INAPP. |
| D-07 | Assistente | Intenti deterministici + adapter opzionale. | Confermare provider, residency e policy. |
| D-08 | Architettura | React/Next + FastAPI + PostgreSQL. | Confermare stack, hosting e SSO. |
| D-09 | Documenti demo | PDF testuali + una scansione OCR. | Confermare esempi reali anonimizzati. |
| D-10 | Perimetro | Slice end-to-end fino a pagamento. | Confermare rispetto a sola fase pre-contratto. |


## 14.1 Domande per la sessione INAPP

- Qual è la data esatta che rende una memoria “non più utile” e fa scattare la riprogrammazione?
- I cinque giorni sono lavorativi o solari? Quali festività e sospensioni si applicano?
- Quali sono le fasi e durate ufficiali per ciascuna tipologia di procedura?
- Chi può proporre, validare e approvare una riprogrammazione? Sono previste deleghe?
- Quali vincoli di bilancio devono bloccare una proposta e quali sono soltanto avvisi?
- Quali fonti contabili distinguono stanziato, prenotato, impegnato, liquidato e pagato?
- Come vengono definiti e verificati i SAL; esistono casi senza SAL o con percentuali variabili?
- Il fornitore deve accedere alla piattaforma o i documenti sono caricati dagli uffici?
- Quali alert vanno al Direttore e dopo quale escalation?
- La dashboard è richiesta oppure l’interazione deve essere prevalentemente conversazionale?
- Quali OCR/LLM sono autorizzati e quali dati possono lasciare l’ambiente INAPP?
- Quali integrazioni hanno API disponibili, costi, account e ambienti di test?

## 14.2 Scheda di approvazione

| Ruolo | Nome | Esito / note | Data |
|---|---|---|---|
| Referente processo INAPP |  |  |  |
| Referente funzionale Intellera |  |  |  |
| Referente Amministrazione/Contabilità |  |  |  |
| Referente Ufficio Gare |  |  |  |
| Referente tecnico/architettura |  |  |  |


# Appendice A — Template di notifica


## A.1 Reminder memoria T-5

```
Oggetto: [INAPP DEMO] Memoria in scadenza tra 5 giorni — {procedure_code}

La memoria della procedura “{object}” deve essere presentata entro il {due_date}.
In assenza della memoria entro il termine, la procedura potrebbe richiedere una
riprogrammazione con effetti sul cronoprogramma e sulla previsione di spesa.

Importo programmato: {planned_amount}
Responsabile: {owner}
Apri la procedura: {procedure_url}
```


## A.2 Alert riprogrammazione richiesta

```
Oggetto: [INAPP DEMO] Riprogrammazione richiesta — {procedure_code}

La milestone “{milestone}” è scaduta il {due_date} senza completamento registrato.
Il sistema ha predisposto una simulazione che sposta {shifted_amount} e rileva
{criticality_count} criticità finanziarie. La proposta non modifica i dati correnti
finché non viene approvata da un soggetto autorizzato.
```


# Appendice B — Esempio seed procedura

```
{
  "id": "P-002",
  "is_demo": true,
  "object": "Supporto metodologico e project management",
  "structure": "PROGRAMMAZIONE_CONTROLLO",
  "procedure_type": "NEGOTIATED",
  "status": "MEMORY_EXPECTED",
  "health": "RED",
  "identifiers": {"cig": "CIG-DEMO-P002", "cup": "CUP-DEMO-P002"},
  "baseline": {"amount": "480000.00", "memory_due": "2026-09-25"},
  "forecast": {"2026": "200000.00", "2027": "280000.00"},
  "budget_availability": {"2026": "300000.00", "2027": "350000.00"}
}
```


# Appendice C — Glossario

| Termine | Definizione |
|---|---|
| Baseline | Versione originaria approvata della programmazione. |
| Forecast / previsione | Ultima versione approvata di date e importi futuri. |
| Actual / effettivo | Evento o movimento realmente avvenuto. |
| Memoria | Documento che avvia il passaggio operativo verso l’Ufficio Gare. |
| Milestone | Punto del processo con data, owner, dipendenze e stato. |
| Riprogrammazione | Nuova previsione approvata a seguito di ritardo o variazione. |
| SAL | Stato di avanzamento lavori/servizi collegato a verifica e pagamento. |
| Liquidazione | Atto/fase che rende pagabile un importo verificato. |
| Importo a rischio | Previsione priva di copertura o soggetta a slittamento critico. |
| Evidenza | Riferimento a file, pagina, cella o inserimento manuale che supporta un dato. |
| Validazione | Decisione umana su una proposta, correzione o conflitto. |
| Outbox | Coda transazionale di notifiche da inviare o simulare. |


# Appendice D — Matrice di tracciabilità

| Fabbisogno | Epiche | Regole / test | Scenario |
|---|---|---|---|
| Alert 5 giorni prima della memoria | EP-03, EP-04 | BR-003, T-004 | P-001 |
| Riprogrammazione in caso di ritardo | EP-04, EP-05 | BR-004–BR-007, T-005–T-010 | P-002 |
| Suggerimento data e criticità previsione | EP-05 | BR-005, BR-008–BR-009 | P-002, P-005, P-008 |
| Monitoraggio finanziario contratto | EP-06 | BR-010–BR-013, T-011–T-013 | P-004, P-010 |
| SAL e pagamenti effettuati | EP-06 | T-011, T-012, T-024 | P-004 |
| Attori e segregazione responsabilità | EP-00, EP-03, EP-10 | BR-018, T-017 | Tutti |
| Fascicolo, fonti e validazione | EP-02, EP-08 | BR-014–BR-016, T-014–T-018 | P-007 |
| Dashboard e report | EP-07 | T-023, T-025 | Portafoglio |
| Assistente con fonti | EP-09 | T-019–T-021 | P-004/portafoglio |
| Core operativo senza AI | EP-11 | BR-017, NFR-009, T-021 | Tutti |


# Appendice E — Checklist handoff al coding agent

- Documento letto integralmente; decisioni aperte non trasformate in fatti.
- Backlog importato nel sistema di tracking con ID invariati.
- Scenari seed e risultati attesi versionati prima dell’implementazione.
- ADR iniziali creati; stack e auth confermati o motivatamente sostituiti.
- Incremento I0 completato e riproducibile su ambiente pulito.
- Matrice story → test mantenuta in CI.
- Ogni demo build espone commit/versione, data seed e data di riferimento.
- Scostamenti dal documento registrati con rationale e approvazione.
Fine del documento — Versione 1.0 — 1 ottobre 2026
