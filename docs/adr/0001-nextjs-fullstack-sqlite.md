# ADR-0001 — Next.js fullstack (TypeScript) + SQLite

- **Stato:** proposto (in attesa di presa d'atto INAPP; vedi DEV-004)
- **Data:** 2026-10-01
- **Riferimenti:** [06_architettura_nextjs_sqlite.md](../06_architettura_nextjs_sqlite.md) · specifica §2.4, §4, §10, §11 · guida §3–§4, §12 · CR-37…CR-49

## Contesto
La specifica (§4.1) propone un frontend Next.js, un backend Python/FastAPI con PostgreSQL e un worker Python. Il cliente chiede **un solo stack**: Next.js fullstack in TypeScript con un database **SQLite**, senza Python né PostgreSQL.

Restano vincolanti:
- core deterministico;
- baseline immutabile;
- audit e movimenti append-only;
- importi decimali esatti, mai in float;
- RBAC server-side object-level;
- AI opzionale;
- avvio con `docker compose up --build`;
- test riproducibili con l'oracle `expected_results.json`;
- API REST documentate (OpenAPI);
- NFR-002 (1.000 procedure, p95 ≤ 2 s).

## Decisione
1. **Next.js 16 (App Router)** per UI e API. Le mutazioni passano solo da **route handler** `/api/*` definiti da contratti **Zod 4**, da cui si genera l'OpenAPI (`@asteasolutions/zod-to-openapi`). I Server Component leggono tramite l'application layer con la stessa autorizzazione. Server Actions vietate.
2. **SQLite 3.53 in WAL** con **better-sqlite3 13** e **Drizzle ORM 0.45**. Per processo: una connessione di scrittura con mutex e transazioni `BEGIN IMMEDIATE` brevi, senza I/O esterno, e una connessione di sola lettura. Porte asincrone per restare migrabili. Trigger (audit append-only, versioni immutabili) e FTS5 in SQL post-migrazione idempotente, verificati da test e da `/ready`.
3. **Importi in centesimi interi:** `Money` su `bigint`, `INTEGER` con CHECK nel DB, stringhe in JSON. ROUND_HALF_UP in aritmetica intera. Controlli automatici contro l'uso di `number` per gli importi.
4. **Date con Temporal** (`PlainDate`, `temporal-polyfill`) e `Clock` iniettato; calendario da configurazione.
5. **Worker Node separato**, stesso codebase e stessa immagine: coda job su tabella con lease atomico, leader lease per lo scheduler (`croner`), outbox transazionale verso Mailpit (nodemailer).
6. **Autenticazione custom:** sessioni su DB (solo l'hash del token), argon2id, CSRF a doppio invio firmato + controllo dell'Origin. Ripiego: Better Auth.
7. **Distribuzione:** un'immagine per `init` (migrazioni + seed if-empty + run-checks), `web` e `worker`, più `mailpit`. Il DB sta su un **volume Docker nominato** condiviso sullo stesso host, mai su un bind mount Windows.

## Alternative considerate
- **FastAPI + PostgreSQL** (specifica): scartata su richiesta del cliente.
- **Next.js + PostgreSQL:** tecnicamente più robusta (concorrenza, NUMERIC, ruoli DB), ma aggiunge un servizio e non rispetta la richiesta. È la destinazione della migrazione per un pilota con dati reali.
- **Prisma** al posto di Drizzle: scartato per il controllo limitato su `BEGIN IMMEDIATE` e sulle transazioni con connessione unica, e per i CHECK non modellabili.
- **libsql / node:sqlite** al posto di better-sqlite3: rimandati (Turso fuori perimetro; `node:sqlite` stabile solo da Node 26 e supportato solo da Drizzle 1.0).
- **Auth.js:** scartato perché con Credentials impone le sessioni JWT, non revocabili lato server.
- **Scheduler in `instrumentation.ts`:** scartato (duplicati per istanza e in sviluppo, job legati al ciclo di vita del web).

## Conseguenze
**Positive**
- Un solo linguaggio, un solo gestore di pacchetti, una sola immagine applicativa.
- Nessun server DB da gestire; avvio più rapido.
- I test girano sul motore reale, con DB usa-e-getta in memoria in pochi millisecondi.
- I tipi sono condivisi fra API e UI senza generazione di codice.
- Backup con un solo comando (`VACUUM INTO`).

**Negative / rischi accettati**
- Un solo scrittore alla volta, e l'event loop si blocca su query lente o attese di lock (CR-38).
- Nessun tipo decimale nativo (CR-40).
- Nessuna sicurezza a livello DB: l'audit è protetto da trigger e da una hash chain, non dal DBMS (CR-42).
- Le migrazioni ricreano le tabelle, con rischio di perdere i trigger (CR-39).
- Il file condiviso richiede lo stesso host e un volume nominato (CR-41).
- Autenticazione custom (CR-43); confini server/client di Next.js (CR-44); maturità di alcune librerie (CR-46).

**Criterio di revisione:** si torna su questa decisione e si migra a PostgreSQL quando si verifica almeno una di queste condizioni:
- pilota con dati reali o produzione;
- più istanze applicative o accesso di rete al DB;
- attese sul lock di scrittura misurate con p95 > 100 ms;
- necessità di sicurezza a livello DB.

Le regole di migrabilità (SQL isolato in `infrastructure/db`, porte asincrone, costrutti portabili, test tramite le porte) valgono fin da I0.
