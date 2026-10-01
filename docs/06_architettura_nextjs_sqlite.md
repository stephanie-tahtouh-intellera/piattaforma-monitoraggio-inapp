# Riprogettazione architetturale — Next.js fullstack + SQLite

> **Versione:** 1.0 · **Data:** 01/10/2026 · **Stato:** proposta, da integrare in [02_guida_sviluppo_agente.md](02_guida_sviluppo_agente.md), [01_analisi_criticita.md](01_analisi_criticita.md), [03_registro_decisioni.md](03_registro_decisioni.md) e `CLAUDE.md`
> **Decisione:** [ADR-0001](adr/0001-nextjs-fullstack-sqlite.md) · **Deviazione dalla specifica:** DEV-004 (testo nella §5.10)
>
> Su richiesta del cliente, l'MVP si sviluppa **solo in TypeScript con Next.js fullstack e un database SQLite**: niente Python, FastAPI o PostgreSQL. Questo documento contiene le scelte motivate (§1), i limiti di SQLite e le mitigazioni (§2), l'architettura del codice (§3), il runtime (§4) e il **testo sostitutivo pronto da incollare** nella guida e in `CLAUDE.md` (§5). I principi non negoziabili della specifica (§2.4) e della guida restano **tutti invariati**.

## Indice
0. [Sintesi](#0-sintesi)
1. [Stack e scelte motivate](#1-stack-e-scelte-motivate)
2. [SQLite: limiti e mitigazioni](#2-sqlite-limiti-e-mitigazioni)
3. [Architettura del codice](#3-architettura-del-codice)
4. [Runtime e distribuzione](#4-runtime-e-distribuzione)
5. [Impatto sulla guida e su CLAUDE.md](#5-impatto-sulla-guida-e-su-claudemd)
6. [ADR](#6-adr)
7. [Verifiche eseguite e fonti](#7-verifiche-eseguite-e-fonti)

---

## 0. Sintesi

| Area | Scelta |
|---|---|
| Runtime | Node.js **24 LTS**; un'unica immagine Docker per `web`, `worker` e `init` |
| Web e API | **Next.js 16** (App Router): UI + API REST `/api/*` tramite **route handler**. Server Actions non ammesse |
| Persistenza | **SQLite 3.53** (WAL) con il driver **better-sqlite3 13** e l'ORM **Drizzle 0.45** (migrazioni SQL di drizzle-kit, più SQL post-migrazione per trigger e FTS5) |
| Importi | **Centesimi interi**: `bigint` nel dominio (value object `Money`), `INTEGER` con CHECK nel DB, stringa `"47600.00"` in JSON. ROUND_HALF_UP implementato in aritmetica intera |
| Date | **Temporal** (`PlainDate`) tramite `temporal-polyfill`; calendario e festività da `config/calendar.yaml`; Pasquetta calcolata da una funzione pura |
| Auth | **Sessioni custom su DB** (token casuale, in DB solo l'hash), password **argon2id** (`@node-rs/argon2`), CSRF a doppio invio firmato più controllo dell'Origin |
| Contratti | **Zod 4** come unica fonte per validazione, tipi del client e **OpenAPI** (`@asteasolutions/zod-to-openapi`) |
| Job | Processo **worker separato**, stesso codebase; coda su tabella SQLite con **lease** atomico (`BEGIN IMMEDIATE` + `UPDATE … RETURNING`); outbox transazionale; scheduler `croner` |
| Documenti | `unpdf`/`pdfjs-dist` (testo e rendering), `tesseract.js` (OCR, lingua `ita` inclusa nell'immagine), `@react-pdf/renderer` (PDF generati), `exceljs` (XLSX), `csv-stringify` (CSV), `nodemailer` → Mailpit |
| Qualità | Vitest 5 (unit/integration/api su DB SQLite usa-e-getta), Playwright 1.63 + axe, ESLint 9 + typescript-eslint, `tsc` 6.0 strict, dependency-cruiser, pnpm |

**Le tre decisioni più delicate**
1. **Importi:** in SQLite non esiste un tipo decimale esatto. Si usano centesimi interi con CHECK `typeof(x)='integer'`, un `Money` opaco (`valueOf()` lancia un errore) e controlli automatici (lint, test sullo schema DB e sui contratti JSON) che impediscono a un `number` di rappresentare un importo.
2. **Concorrenza e job:** un solo scrittore alla volta. Ogni processo ha una connessione di scrittura protetta da mutex, con transazioni `IMMEDIATE` brevi e senza I/O esterno, più una connessione di sola lettura. I job si prendono in carico con un lease atomico; la leadership dello scheduler passa da una tabella di lease. `SKIP LOCKED` e i lock advisory non servono.
3. **Auth:** Auth.js con credenziali impone le sessioni JWT, non revocabili lato server, mentre la guida richiede sessioni server-side, impersonazione e ruolo attivo. Si adotta quindi una soluzione custom piccola e testata, costruita su primitive consolidate. Better Auth resta il ripiego documentato.

**Cosa si perde rispetto a PostgreSQL** (dettaglio nella §2.11): scritture concorrenti, tipo `NUMERIC`, ruoli/GRANT/RLS a livello DB, `ALTER TABLE` completo, accesso di rete e alta affidabilità. Per una demo locale con pochi utenti sono perdite accettabili. **Per un pilota con dati reali si migra a PostgreSQL** (§2.12).

---

## 1. Stack e scelte motivate

### 1.1 Runtime, linguaggio, pacchetti
- **Node.js 24.21 LTS "Krypton"**, nel container `node:24-slim` (Debian, glibc). Node 26 diventa LTS il 28/10/2026 e porta Temporal nativo e `node:sqlite` stabile: il passaggio si valuta con una DEC dopo I0, quando Node 26 sarà LTS (vedi CR-46). Alpine è scartata: musl, font e canvas danno problemi.
- **TypeScript 6.0.x** in modalità `strict`, con `noUncheckedIndexedAccess` ed `exactOptionalPropertyTypes`. **Non** si usa TypeScript 7.0 (il compilatore nativo): typescript-eslint 8.71 supporta TypeScript solo fino a `<6.1`.
- **pnpm 12.8**, fissato con `packageManager` in `package.json` e installato nel Dockerfile con `npm i -g pnpm@<versione>` (non si dipende da corepack, che non è più distribuito con Node ≥ 25). Lockfile obbligatorio, `--frozen-lockfile` in CI e nel Dockerfile. Va mantenuta l'allowlist degli script di build delle dipendenze (es. `esbuild`). better-sqlite3 13, `@node-rs/argon2` e `@napi-rs/canvas` usano binari precompilati e non hanno script di installazione.
- **Un solo `package.json`**, senza workspace multipli: il monorepo è un singolo pacchetto con cartelle a strati (§3). Si evita la complessità di pnpm workspace in un MVP.

### 1.2 Next.js 16 (App Router): cosa usare e quando

| Esigenza | Si usa | Non si usa |
|---|---|---|
| **Ogni mutazione** (creazione, transizione, pagamento, approvazione) | **Route handler** `src/app/api/**/route.ts`, chiamato dai client component tramite `apiClient` (aggiunge `X-CSRF-Token` e `Idempotency-Key`) e TanStack Query `useMutation` | **Server Actions** (vietate: endpoint impliciti fuori dall'OpenAPI, non testabili come API, idempotenza e CSRF diversi dal resto) |
| API REST documentate della spec §10 e della guida §6.3 | Route handler, definiti da contratti Zod (§1.9) | — |
| Dati per il primo render di una pagina | **Server Component** che chiama **direttamente** le query dell'application layer con l'`Actor` della sessione (stessa autorizzazione delle API) | `fetch` dal server verso la propria `/api` |
| Liste con filtri in URL (T-003) | Server Component che legge `searchParams` | stato dei filtri solo lato client |
| Parti interattive o con polling (centro alert, stato job, anteprima simulazione) | Client component + TanStack Query su `/api` | — |
| Protezione delle pagine | `requireActor()` nel layout server del gruppo `(app)`, con redirect a `/login` | `proxy.ts` usato come confine di sicurezza |
| `proxy.ts` (in Next 16 sostituisce `middleware.ts` e gira su Node) | solo correlation ID e redirect "cosmetico" se manca il cookie | autorizzazione, accesso al DB |
| `instrumentation.ts` | inizializzazione del logger e verifica all'avvio (DB raggiungibile, migrazioni applicate) | scheduler, cron, job |
| Download (export, documenti, pagine PNG) | Route handler in streaming dallo storage | cartella `public/` |
| Lavoro in background | processo `worker` (§1.10) | `node-cron`/`setInterval` nel processo web |

Regole Next specifiche:
- Tutti i segmenti autenticati sono dinamici (`export const dynamic = 'force-dynamic'`). Non si attivano `cacheComponents` né `'use cache'`. Le risposte API con dati hanno `Cache-Control: no-store`.
- I moduli server (`src/infrastructure`, `src/composition`) importano `server-only`, così un import accidentale da un client component fa fallire la build.
- La connessione al DB si apre **in modo lazy**: `next build` analizza i moduli delle route e nel build stage non esiste il volume `/data`. In sviluppo si mantiene un singleton su `globalThis` per non aprire una connessione a ogni HMR.
- Nei route handler i `params` sono una `Promise` (Next ≥ 15).
- `next lint` è stato rimosso in Next 16: si usa ESLint direttamente.
- `better-sqlite3`, `@node-rs/argon2`, `@react-pdf/renderer` e `pino` sono già nella lista predefinita `serverExternalPackages` di Next. Le librerie native pesanti (OCR, canvas) restano nel worker.

### 1.3 ORM e migrazioni: Drizzle vs Prisma

| Criterio | **Drizzle ORM 0.45.3** + drizzle-kit 0.31 | Prisma ORM 7.10 |
|---|---|---|
| Transazioni SQLite | `behavior: 'immediate'` supportato (verificato nel sorgente: mappa su `.immediate()` di better-sqlite3); SQL esplicito quando serve | Con l'adapter better-sqlite3 (connessione unica) le query di altre richieste possono finire dentro una transazione interattiva aperta; nessun controllo diretto su `BEGIN IMMEDIATE` |
| Tipi custom (Money, PlainDate) | `customType` con `toDriver`/`fromDriver` | Limitati; gli importi diventerebbero `BigInt` grezzi, da convertire a mano |
| `Decimal` | Non necessario (centesimi) | Il `Decimal` su SQLite ha affinità numerica e rischio di perdita di precisione: va evitato comunque |
| CHECK, indici parziali, SQL raw | `check()`, `index().where()`, `sql\`\`` | CHECK non modellabili nello schema (solo SQL nelle migrazioni) |
| Migrazioni | File SQL generati e modificabili, più migrazioni `--custom`; runner `migrate()` a runtime senza CLI nell'immagine | File SQL generati; runtime separato |
| Peso e generazione codice | Nessun passo di generazione, solo TS | `prisma generate`, client generato |
| Portabilità verso PostgreSQL | Stessa API (`pgTable`), schema da riscrivere ma query quasi identiche | Cambio del `provider`, più semplice |
| Maturità | 0.x stabile; la 1.0 è in RC (cambi in arrivo) | Molto matura; Prisma 8 in RC |

**Scelta: Drizzle 0.45.x**, fissato alla minor version. Il controllo esplicito di transazioni e SQL è decisivo per i vincoli di questo progetto: singolo scrittore, trigger, CHECK, FTS5. Prisma semplifica una futura migrazione, ma rende più difficile proprio ciò che SQLite richiede. Il passaggio a Drizzle 1.0 si valuta con una DEC quando sarà GA.

Limiti noti di drizzle-kit su SQLite, con mitigazione (§2.5):
- non genera le tabelle `STRICT`: si compensa con CHECK `typeof()` espliciti;
- **ricrea la tabella** per molti `ALTER`, e i trigger della tabella vanno persi: trigger e FTS stanno in `db/sql/*.sql` idempotenti, rieseguiti dopo ogni migrazione e verificati da un test;
- non modella trigger e tabelle virtuali: sono gestiti fuori dallo schema TS.

### 1.4 Driver: better-sqlite3 vs libsql vs node:sqlite

| Criterio | **better-sqlite3 13.0.3** | @libsql/client 0.18 | `node:sqlite` |
|---|---|---|---|
| Installazione Windows/Docker | Prebuilt N-API **dentro il tarball** (8 piattaforme, glibc e musl, Windows), nessun `node-gyp`. **Verificato: installazione in 6 s su questa macchina Windows** | Binari prebuilt per piattaforma | Nessuna dipendenza |
| Versione SQLite | **3.53.4** inclusa, con FTS5, JSON, funzioni matematiche (verificato) | fork libSQL, segue SQLite con ritardo | dipende da Node |
| API | Sincrona, molto veloce; `backup()`, `serialize()`, apertura da buffer in memoria (DB di test istantanei) | Asincrona | Sincrona |
| Stabilità | Matura | Stabile, ma orientata a Turso/remoto | RC su Node 24, stabile su Node 26 |
| Drizzle | Driver di prima classe | Driver di prima classe | Solo in Drizzle 1.0 beta |

**Scelta: better-sqlite3 13** (richiede Node ≥ 22). libsql conviene solo se si vuole Turso o una replica remota, fuori perimetro. `node:sqlite` resta una possibile evoluzione con Node 26 LTS e Drizzle 1.0, per azzerare le dipendenze native.

Conseguenza dell'API sincrona: una query lenta **blocca l'event loop** del processo. Per questo le query delle liste leggono la proiezione `procedure_snapshot` indicizzata, i lavori pesanti stanno nel worker e le transazioni sono brevi (CR-38).

### 1.5 Importi: centesimi interi, ROUND_HALF_UP, nessun `number`

**Confronto.** Le opzioni sono due: `TEXT` con decimal.js/big.js, oppure `INTEGER` in centesimi. Su SQLite `TEXT` non regge:
- `SUM()` su testo converte in `REAL`, quindi in float;
- i confronti e gli `ORDER BY` sono lessicografici;
- i CHECK `≥ 0` diventano fragili.

Con `INTEGER` invece `SUM` è esatto (e su overflow lancia `integer overflow` invece di degradare: verificato), i CHECK sono nativi e gli indici funzionano. **Scelta: centesimi interi.**

| Strato | Rappresentazione |
|---|---|
| Dominio | `Money` (value object immutabile su `bigint` di centesimi). Costruttori: `Money.fromCents(bigint)` e `Money.parse("47600.00")` (regex `^-?\d{1,13}\.\d{2}$`). Nessun costruttore da `number`. `valueOf()` lancia `TypeError`, così `m + 1` o `m < n` falliscono subito; `toJSON()` → `"47600.00"` |
| Percentuali | `Percent` in centesimi di punto (`20%` → `2000n`), da stringa `"20.00"` |
| DB | colonne `*_cents INTEGER NOT NULL CHECK (typeof(x)='integer' AND x >= 0)` (i delta con segno solo dove servono). Tipo custom Drizzle `moneyCents` (`fromDriver` verifica `Number.isSafeInteger`, cioè fino a circa 90.000 miliardi di €, poi converte in `bigint`) |
| SQL | ammessi solo `SUM`, `+`, `-` e confronti sulle colonne `*_cents`. **Vietati** `TOTAL()`, `AVG()`, `/`, `*` con decimali, `CAST(… AS REAL)` e colonne `REAL`/`NUMERIC`/`DECIMAL`. I risultati aggregati passano da `.mapWith(Money.fromDriverInteger)` |
| JSON API | stringa a 2 decimali (`"47600.00"`, `"-150000.00"`), schema `MoneyString` (Zod, string con brand) |
| UI | riceve `MoneyString` e la formatta con `Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(s)`, che accetta stringhe decimali esatte (Intl.NumberFormat v3): **nessuna conversione a `number`**. La UI non importa il dominio |

**Arrotondamento ROUND_HALF_UP** (a metà, lontano da zero, come `Decimal.ROUND_HALF_UP` di Python), in aritmetica intera:

```ts
// src/domain/money/rounding.ts
export function divRoundHalfUp(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new RangeError('divisore non positivo');
  const q = n / d;                 // BigInt tronca verso zero
  const r = n % d;
  const absR = r < 0n ? -r : r;
  if (2n * absR >= d) return n < 0n ? q - 1n : q + 1n;
  return q;
}
// importo SAL = divRoundHalfUp(grossCents * pctHundredths, 10_000n); ultimo SAL = gross − Σ precedenti (DEC-033)
// es. 23_800_000n * 2000n / 10_000n = 4_760_000n → "47600.00"
```

`decimal.js` (10.6) **non** entra nel dominio: si usa solo nei test come oracle indipendente (property-based con fast-check: `divRoundHalfUp` ≡ `Decimal.div().toDecimalPlaces(0, ROUND_HALF_UP)`).

**Come si garantisce che non circolino `number` per gli importi**
1. **Tipi:** `Money` e `MoneyString` non sono assegnabili a `number`; typescript-eslint con `restrict-plus-operands` e `no-unsafe-*`.
2. **Runtime:** `Money.valueOf()` lancia un errore; `Money.parse` rifiuta i `number` (`typeof` controllato).
3. **Lint** (`no-restricted-syntax`/`no-restricted-globals`) in `src/domain`, `src/application`, `src/contracts`, `src/ui`: vietati `parseFloat`, `Number(`, `toFixed`, `Math.round`, operatori unari `+x` su stringhe. Eccezione unica e motivata: `src/infrastructure/export/spreadsheet.ts` (§1.13).
4. **Test sullo schema DB:** per ogni tabella, `PRAGMA table_info` e `sqlite_schema`: nessuna colonna `REAL/NUMERIC/DECIMAL/FLOAT/DOUBLE`; ogni `*_cents` ha il CHECK `typeof(...)='integer'`.
5. **Test sui contratti:** genera il JSON Schema di tutte le risposte; ogni proprietà `type: number` deve stare in un'**allowlist** di campi non monetari (`page`, `size`, `total`, `days`, `year`, `version_no`, `sequence`, `count`, `confidence`…). I `number` sono l'eccezione, non la regola.
6. **Seed:** il loader rifiuta importi JSON non stringa (`SEED_FORMAT_ERROR`).

### 1.6 Date, fuso orario, calendario
- **Scelta: Temporal tramite `temporal-polyfill` 1.0.5**, importato da un solo modulo, `src/domain/shared/temporal.ts`. Le date di business sono `Temporal.PlainDate`, che non ha ora né fuso: niente sorprese da ora legale e niente slittamenti UTC. Gli istanti tecnici (audit, log, lease) sono `Temporal.Instant`. La conversione istante → data di business usa `Europe/Rome`.
- `date-fns` 4 + `@date-fns/tz` sono scartati per il dominio: lavorano su `Date`, che è un istante, quindi per l'aritmetica di sole date c'è il rischio di errori di fuso. `@js-temporal/polyfill` è scartato perché più pesante e lento. Con Node 26 LTS si potrà passare al Temporal nativo cambiando solo il modulo di re-export.
- **Calendario:** festività da `config/calendar.yaml` (guida §8.1), con regola `FORWARD`. Il **Lunedì dell'Angelo** viene da una funzione pura `easterSunday(year)` (algoritmo anonimo gregoriano) + 1 giorno, testata su 06/04/2026, 29/03/2027 e 17/04/2028. `date-holidays` è scartata: dati esterni che cambiano tra versioni rendono l'oracle non deterministico.
- **DB:** date `TEXT 'YYYY-MM-DD'` con `CHECK (x IS date(x))`, che rifiuta anche `2026-02-30` (verificato). Istanti `TEXT` ISO-8601 UTC con millisecondi e `Z`, ordinabili lessicograficamente.
- **UI:** `gg/mm/aaaa` formattando la stringa ISO, senza passare da `new Date()`.
- **Clock** (DEC-002): porta `Clock { referenceDate(): PlainDate; now(): Instant }`. `ConfigClock` legge `APP_REFERENCE_DATE` o `demo.reference_date` (default `2026-10-01`); `FixedClock` serve ai test. In dominio e application sono vietati `Date.now`, `new Date()` senza argomenti e `Temporal.Now` (lint + guard).

### 1.7 Autenticazione, sessioni, CSRF, password

| Opzione | Valutazione |
|---|---|
| Auth.js (next-auth) | Con il provider **Credentials** sono ammesse solo sessioni **JWT**: niente sessioni su DB, nessuna revoca server-side; ruolo attivo e impersonazione finirebbero nel token. La v5 è ancora `beta`. **Scartata.** |
| Better Auth 1.7 | Valida: sessioni su DB, email/password, plugin admin con impersonazione, adapter Drizzle/SQLite. Però aggiunge tabelle ed endpoint propri fuori dall'OpenAPI e dall'error envelope; il modello ruolo@ambito resta comunque custom. **Ripiego documentato** se la soluzione custom non supera i test di sicurezza |
| **Custom (modello "Lucia v3/Copenhagen Book")** | Circa 300 righe testabili, pieno controllo su ruolo attivo, impersonazione, audit e rate limit. **Scelta.** |

Progetto (DEC-097):
- **Password:** argon2id con `@node-rs/argon2` 2.2 (prebuilt, nessuna compilazione), parametri OWASP (m = 19 MiB, t = 2, p = 1). Gli hash si calcolano al seed da `DEMO_PASSWORD`. Se l'utente non esiste si verifica comunque un hash fittizio, per non rivelare l'esistenza dell'account dai tempi. (`crypto.argon2` nativo di Node ≥ 24.7 è un'alternativa da valutare con una DEC per togliere la dipendenza; bcrypt è scartato.)
- **Sessione:** token di 32 byte casuali (`crypto.getRandomValues`, base64url), cookie `inapp_session` con `HttpOnly; SameSite=Lax; Path=/` e `Secure` se `APP_ORIGIN` è https. **Nel DB si salva solo `sha256(token)`.** Tabella `session(id_hash, user_id, active_role, impersonated_by, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at)`. Scadenza per inattività 8 h (scorrevole) e assoluta 12 h. `last_seen_at` si aggiorna al massimo ogni 5 minuti, per non generare scritture a ogni richiesta. Rotazione a login, cambio ruolo e impersonazione; logout = revoca.
- **CSRF:** il cookie `inapp_csrf` (non HttpOnly) contiene `HMAC-SHA256(SESSION_SECRET, session_id)`. Su ogni metodo non sicuro servono l'header `X-CSRF-Token` uguale al valore atteso (confronto a tempo costante) **e** un `Origin` presente in `APP_ALLOWED_ORIGINS`. Il login controlla solo l'Origin. Le GET non mutano mai lo stato (l'unica scrittura ammessa in GET è il record di audit degli export).
- **Autorizzazione:** in `src/application/authz`: la matrice della guida §7.3 come **dati** più i controlli object-level (struttura, contratto). I route handler dichiarano il `permission` (per documentazione e controllo grossolano), ma il controllo vincolante sta nello use case, così vale anche per i Server Component che leggono direttamente. Fuori ambito → `403` senza dati (T-017).
- **Rate limit:** `rate-limiter-flexible` 11, in memoria (un solo processo web) su login, import e assistente. Ogni login fallito va in audit.

### 1.8 Validazione: Zod 4
- **Zod 4.6** per input HTTP (body, query, params), file di seed, YAML di configurazione (letti con `yaml` 2.9) e variabili d'ambiente (`src/infrastructure/config/env.ts`, fail-fast all'avvio).
- Gli schemi delle API stanno in `src/contracts`, che non dipende da nulla se non da Zod. I client component li importano per React Hook Form (`zodResolver`) e per i tipi (`z.infer`): **nessuna generazione di tipi da OpenAPI**. L'openapi-typescript della DEC-091 decade.
- La conversione da contratto a dominio (es. `MoneyString` → `Money`) avviene nel mapping del comando dell'application layer, non nello schema: così la UI non trascina il dominio nel bundle client.

### 1.9 OpenAPI dalle definizioni Zod
Le API REST della spec §10 e della guida §6.3 restano il contratto documentato: servono ai test API, all'evidenza §13.4 e alle integrazioni future.
- **`@asteasolutions/zod-to-openapi` 9.1** (supporta Zod 4). Ogni endpoint è un **contratto** in `src/contracts/routes/*.ts` (metodo, path, schemi, permesso, idempotenza, risposte d'errore). Il `route.ts` di Next lo **lega** a un handler:

```ts
// src/contracts/routes/finance.ts
export const registerPayment = defineContract({
  method: 'post', path: '/api/sals/{id}/payments', tags: ['finance'],
  permission: 'PAYMENT_REGISTER', idempotencyKey: 'required',
  request: { params: z.object({ id: Id }), body: RegisterPaymentBody },
  responses: { 201: PaymentDto, 409: ErrorEnvelope, 422: ErrorEnvelope },
});

// src/app/api/sals/[id]/payments/route.ts
export const POST = bindRoute(registerPayment, (ctx, { params, body }) =>
  ctx.useCases.registerPayment(ctx.actor, { salId: params.id, ...body }));
```

- `bindRoute` (in `src/app/_http/`) applica, in quest'ordine: correlation ID, sessione → `Actor`, CSRF, validazione Zod, `Idempotency-Key`, `If-Match`, chiamata allo use case, mappatura degli errori nell'envelope §10.2 e log.
- `pnpm openapi` genera `docs/openapi.json` (versionato). La gate fallisce se il file non è aggiornato (`pnpm openapi:check`). Viene servito su `/api/openapi.json`, con Swagger UI (`swagger-ui-dist`, asset locali, nessuna CDN) su `/api/docs`.
- Test di coerenza: ogni `route.ts` esporta solo handler legati a un contratto, e ogni contratto ha la sua implementazione (si scandisce `src/app/api`).

### 1.10 Job, scheduler, outbox
**Scelta: processo `worker` separato**, stesso codebase e stessa immagine (`node dist/worker.js`, bundle esbuild). Scartati `instrumentation.ts` + node-cron nel processo web, perché:
- girerebbe in ogni istanza del server e a ogni ricarica in sviluppo (duplicati);
- legherebbe il ciclo di vita dei job a quello delle richieste HTTP;
- OCR e import, che consumano CPU, bloccherebbero l'event loop della UI.

| Componente | Progetto |
|---|---|
| Coda | tabella `job(id, type, dedupe_key UNIQUE parziale, payload_json, status QUEUED/RUNNING/DONE/FAILED, priority, run_at, attempts, max_attempts, locked_by, lease_until, last_error, correlation_id, created_at, finished_at)` |
| Accodamento | nella **stessa transazione** dello use case che lo origina (outbox transazionale). Deduplicazione: `INSERT … ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING` |
| Presa in carico | lease atomico in `BEGIN IMMEDIATE` (SQL nella §2.3); polling ogni 1 s; nessun LISTEN/NOTIFY |
| Completamento | effetti sul DB + `status='DONE' WHERE id=? AND locked_by=?` **nella stessa transazione**: se il lease è stato perso (0 righe), si fa rollback e l'effetto non avviene due volte |
| Recupero | un reaper rimette in `QUEUED` (con backoff) o in `FAILED` i job `RUNNING` con lease scaduto. I job lunghi (OCR) rinnovano il lease |
| Scheduler | `croner` 10 (fuso `Europe/Rome`, `protect` contro le sovrapposizioni). Accoda `RUN_CHECKS` ogni 5 minuti con `dedupe_key = 'run_checks@<slot>'`. Solo il **leader** pianifica (tabella `leader_lease`, §2.3) |
| Outbox e-mail | tabella `outbox(id, channel, recipient, template, payload_json, status, attempts, next_attempt_at, message_id, sent_at)`, scritta nella stessa transazione dell'alert. Dispatcher con lo stesso lease; consegna **at-least-once** con `Message-ID: <outbox-{id}@inapp.demo.invalid>` stabile |
| Heartbeat | `worker_heartbeat(worker_id, beat_at, version)` ogni 30 s; `/ready` e il healthcheck del worker lo verificano (< 120 s) |
| Esecuzione deterministica | `cli run-checks --date 2026-10-01` gira **in-process e in modo sincrono** (test, bootstrap); `POST /api/jobs/run-checks` accoda e risponde `202 {job_id}` |

### 1.11 E-mail
**nodemailer 10** con trasporto SMTP verso `mailpit:1025` (`secure:false`, `ignoreTLS:true`), adapter `SmtpNotifier` dietro la porta `Notifier`. Template in italiano (App. A della specifica) come funzioni pure che producono oggetto e testo (testo semplice + HTML minimale). Negli E2E le e-mail si verificano con l'API di **Mailpit v1.31** (`GET http://mailpit:8025/api/v1/messages`).

### 1.12 Documenti: PDF, OCR, pagine
| Funzione | Libreria | Dove gira |
|---|---|---|
| Estrazione del testo nativo per pagina | `unpdf` 1.8 (build serverless di `pdfjs-dist` 6.3) | worker |
| Rendering delle pagine in PNG (viewer, OCR) | `unpdf.renderPageAsImage` + `@napi-rs/canvas` 1.0 (prebuilt, nessun toolchain) | worker, al momento dell'import; il web serve i PNG dallo storage |
| OCR di fallback | `tesseract.js` 7.0 (WASM), lingua **`ita`**: `ita.traineddata` (tessdata_fast, Apache-2.0) **nel repository** in `vendor/tessdata/` con SHA-256 annotato; `langPath` locale, nessun download da CDN | worker, pool di 1 worker, timeout di 60 s per pagina |
| Criterio di fallback | pagina con meno di 30 caratteri di testo nativo → OCR a circa 300 dpi; si salvano `method = TEXT_LAYER | OCR_TESSERACT` e `confidence` (T-015) | — |
| ZIP | `yauzl` 3.4 (rifiuta percorsi assoluti e `..`), più limiti propri su numero di voci, byte decompressi e rapporto di compressione (zip bomb) | worker |
| Tipo di file | `file-type` 22 (magic number) + allowlist delle estensioni; nome normalizzato; storage `/data/storage/<sha256[0:2]>/<sha256>` fuori dalla web root | web (upload in streaming con limite di dimensione) + worker |

Con `OCR_ENABLED=false` (o con OCR indisponibile) si ottiene un errore recuperabile: il documento resta consultabile e gli elementi passano in coda manuale (US-110).

### 1.13 Export: PDF, CSV, XLSX
- **PDF** (report della procedura, evidenza P-002): `@react-pdf/renderer` 4.9, `renderToBuffer` nel route handler; font OFL in `vendor/fonts/` (Noto Sans) per accenti e simbolo €. La stessa libreria genera, **una tantum**, i documenti di seed (DEC-070 aggiornata, §5.5).
- **CSV:** `csv-stringify` 6.9 (sync). Profilo "Excel italiano": separatore `;`, BOM UTF-8, importi `47600,00` (dalla stringa, senza conversione numerica), date ISO.
- **XLSX:** `exceljs` 4.4 (export e lettura del workbook di seed). Una cella numerica XLSX è per natura un double IEEE: l'**unica** conversione `Money → number` ammessa nel codebase è `moneyToSpreadsheetNumber()` in `src/infrastructure/export/spreadsheet.ts`, con formato `#,##0.00 €`. Un test property-based verifica che la rilettura con 2 decimali restituisca esattamente la stringa di partenza. In lettura si accettano celle numeriche con al massimo 2 decimali (`Money.parse(String(n))`, con rifiuto se i decimali sono di più) oppure celle di testo.
- Ogni export scrive un `ExportRecord` con filtri e hash del file, più un audit (T-023).

### 1.14 Test
- **Vitest 5** con tre progetti: `unit` (dominio e application con fake in memoria), `integration` (SQLite reale su file o in memoria), `api` (route handler invocati in-process con `Request` reali, sessione e CSRF inclusi). Copertura con `@vitest/coverage-v8` e soglia per glob su `src/domain/**`.
- **fast-check** 4 per le proprietà di `Money`, dell'arrotondamento e del calendario.
- **DB usa-e-getta:** `globalSetup` crea una volta `template.db` (migrazioni + SQL post-migrazione + seed) e ne prende la versione serializzata. Ogni file di test apre `new Database(buffer)` **in memoria** (millisecondi, isolamento totale). I test che richiedono WAL, file o più processi copiano il template in una cartella temporanea e la cancellano alla fine.
- **Oracle:** template → `run_checks(2026-10-01)` → confronto campo per campo con `seed/expected_results.json`, sezioni attivate con `ORACLE_SECTIONS` (invariato).
- **Playwright 1.63** + `@axe-core/playwright` 4.13, in un container costruito sull'immagine ufficiale `mcr.microsoft.com/playwright:v1.63.0-noble`. Prima della suite si esegue un reset via API admin, con token di conferma.

### 1.15 Lint, formattazione, typecheck, architettura
- **ESLint 9.39.x** (flat config) con `eslint-config-next` 16.3, typescript-eslint 8.71 (regole type-aware), react-hooks, jsx-a11y. **Non** si usa ESLint 10: `eslint-plugin-jsx-a11y` (incluso in `eslint-config-next`) dichiara compatibilità solo fino alla 9.
- **Prettier 3.9** (`--check` nella gate).
- **`tsc --noEmit`** con TypeScript 6.0.
- **dependency-cruiser 18.5** come test architetturale: regole fra strati, divieto di cicli e di moduli `node:*` o npm nel dominio (§3.2). Si sceglie al posto di eslint-plugin-boundaries perché controlla anche i pacchetti esterni e i cicli con un solo strumento.
- **Guard** (`scripts/guards.ts`): `Date.now|new Date\(\)|Temporal\.Now` fuori da `infrastructure/clock`; `'use server'` in tutto il repository; `TOTAL\(|AVG\(|AS REAL|real\(` in schema e SQL; presenza dei trigger obbligatori in `db/sql/triggers.sql`; assenza di `.env` versionati; lockfile presente.

### 1.16 Versioni di riferimento (verificate sul registry npm il 01/10/2026)

| Pacchetto | Versione | Nota |
|---|---|---|
| Node.js | 24.21.0 LTS | Node 26 LTS dal 28/10/2026 (DEC da valutare) |
| pnpm | 12.8.1 | |
| typescript | 6.0.3 | non 7.0.2 (incompatibile con typescript-eslint) |
| next / react | 16.3.8 / 19.3.0 | |
| drizzle-orm / drizzle-kit | 0.45.3 / 0.31.11 | 1.0 in RC |
| better-sqlite3 | 13.0.3 | SQLite 3.53.4 incluso |
| zod / @asteasolutions/zod-to-openapi | 4.6.5 / 9.1.0 | |
| swagger-ui-dist | 5.33.1 | |
| temporal-polyfill | 1.0.5 | |
| @node-rs/argon2 | 2.2.1 | |
| @oslojs/crypto / @oslojs/encoding | 1.0.1 / 1.1.0 | hash, HMAC, base64url |
| rate-limiter-flexible | 11.2.1 | |
| nodemailer / Mailpit | 10.0.13 / v1.31.3 | |
| croner | 10.0.1 | |
| pino | 10.3.1 | log JSON, redazione dei segreti |
| yaml | 2.9.1 | |
| tesseract.js | 7.0.0 | |
| unpdf / pdfjs-dist | 1.8.1 / 6.3.289 | |
| @napi-rs/canvas | 1.0.9 | |
| @react-pdf/renderer | 4.9.0 | |
| exceljs | 4.4.0 | ultima release 10/2023 (CR-46) |
| csv-stringify | 6.9.0 | |
| yauzl / file-type | 3.4.0 / 22.1.1 | |
| @tanstack/react-query / @tanstack/react-table | 5.104.0 / 9.2.4 | |
| react-hook-form / tailwindcss / recharts | 7.89.0 / 4.3.3 / 3.10.1 | shadcn/ui via CLI |
| vitest / @vitest/coverage-v8 / fast-check | 5.0.3 / 5.0.3 / 4.10.2 | |
| @playwright/test / @axe-core/playwright | 1.63.0 / 4.13.0 | |
| eslint / typescript-eslint / eslint-config-next | 9.39.5 / 8.71.0 / 16.3.8 | |
| prettier / dependency-cruiser | 3.9.9 / 18.5.0 | |
| esbuild / tsx / concurrently | 0.28.2 / 4.23.15 / 10.0.5 | bundle worker/cli; esecuzione script; dev |
| decimal.js | 10.6.0 | solo nei test (oracle degli arrotondamenti) |

Nel lockfile si fissano le versioni esatte. Un aggiornamento di major passa da una DEC-1xx.

---

## 2. SQLite: limiti e mitigazioni

### 2.1 Configurazione di ogni connessione
```sql
PRAGMA journal_mode = WAL;        -- persistente nel file; lettori concorrenti a uno scrittore
PRAGMA synchronous = FULL;        -- durabilità prima delle prestazioni (NORMAL solo con DEC motivata dalle misure di I8)
PRAGMA foreign_keys = ON;         -- va impostato su OGNI connessione
PRAGMA busy_timeout = 5000;       -- attesa del lock di scrittura (configurabile: DB_BUSY_TIMEOUT_MS)
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -20000;       -- circa 20 MB
-- sola connessione di lettura:
PRAGMA query_only = ON;
```
`PRAGMA optimize` all'apertura e periodicamente (job del worker). All'avvio di `init` si eseguono `PRAGMA quick_check` e `PRAGMA foreign_key_check`.

### 2.2 Concorrenza: un solo scrittore, transazioni brevi
- WAL permette **più lettori e un solo scrittore** alla volta, su tutti i processi (`web`, `worker`, `cli`).
- **Unit of Work** (DEC-096): ogni processo apre **una connessione di scrittura** e **una di sola lettura**.
  - `uow.write(fn)` acquisisce un **mutex asincrono di processo**, esegue `BEGIN IMMEDIATE`, chiama `fn` con i repository legati alla connessione di scrittura, poi `COMMIT`, oppure `ROLLBACK` in caso di errore.
  - `IMMEDIATE` prende subito il lock di scrittura: niente deadlock da upgrade read→write, e `SQLITE_BUSY` si presenta solo all'inizio, gestito da `busy_timeout`.
  - Le letture fuori transazione usano la connessione di sola lettura, che vede solo dati committati (isolamento a snapshot di WAL).
  - La UoW è rientrante (`AsyncLocalStorage` + `SAVEPOINT`), cosa che serve al seed e al reset.
- **Le porte sono asincrone** (`Promise`) anche se il driver è sincrono. Così una futura migrazione a PostgreSQL non cambia le firme degli use case (§2.12). Il mutex impedisce che due richieste dello stesso processo si intreccino nella stessa transazione: è il difetto noto di Prisma con la connessione unica.
- **Regole per le transazioni:**
  - dentro `uow.write` sono ammessi solo accessi ai repository. Niente SMTP, OCR, file system o `fetch`: il contesto transazionale espone solo i repository;
  - durata obiettivo < 50 ms; oltre 200 ms viene registrato un log `warn` (misurato dalla UoW);
  - `run_checks` lavora **a blocchi** (una transazione per procedura), così le scritture del web si inseriscono fra un blocco e l'altro.
- **Attenzione:** con better-sqlite3 l'attesa di `busy_timeout` è **sincrona** e blocca l'event loop del processo che aspetta. Per questo le transazioni devono essere brevi (CR-38).
- **Locking ottimistico** (spec §10.1): colonna `version INTEGER`, `UPDATE … WHERE id=? AND version=?`; zero righe → `409`. `STALE_SIMULATION` (DEC-043) invariato.
- **Idempotency-Key:** tabella `idempotency_key(actor_id, key, route, request_hash, status, response_json, created_at)` con `UNIQUE(actor_id, key)`, scritta nella stessa transazione della mutazione. Stessa chiave con un `request_hash` diverso → `409 IDEMPOTENCY_CONFLICT`.
- **Verifica eseguita:** 3 processi Node che prendono in carico 2.000 job dallo stesso file WAL con il pattern della §2.3: 0 doppie acquisizioni (`max(attempts)=1`), 0 `SQLITE_BUSY` con `busy_timeout=5000`, circa 0,5 ms per acquisizione + completamento su Windows.

### 2.3 Lease dei job senza `SKIP LOCKED` né lock advisory
In SQLite lo scrittore è uno solo, quindi `SELECT` + `UPDATE` dentro `BEGIN IMMEDIATE` sono già atomici fra processi. `SKIP LOCKED` non serve.

```sql
-- presa in carico (dentro BEGIN IMMEDIATE)
UPDATE job
   SET status = 'RUNNING', locked_by = :worker, lease_until = :lease_until,
       attempts = attempts + 1, started_at = :now
 WHERE id = (SELECT id FROM job
              WHERE status = 'QUEUED' AND run_at <= :now
              ORDER BY priority, run_at, id LIMIT 1)
RETURNING *;

-- recupero dei lease scaduti
UPDATE job
   SET status = CASE WHEN attempts >= max_attempts THEN 'FAILED' ELSE 'QUEUED' END,
       locked_by = NULL, lease_until = NULL, run_at = :retry_at
 WHERE status = 'RUNNING' AND lease_until < :now;

-- leadership dello scheduler (sostituisce il lock advisory)
INSERT INTO leader_lease(name, holder, lease_until) VALUES ('scheduler', :me, :until)
ON CONFLICT(name) DO UPDATE SET holder = excluded.holder, lease_until = excluded.lease_until
 WHERE leader_lease.holder = excluded.holder OR leader_lease.lease_until < :now
RETURNING holder;   -- una riga = sono il leader
```
Indice: `CREATE INDEX job_ready ON job(status, priority, run_at, id);` più `CREATE UNIQUE INDEX job_dedupe ON job(dedupe_key) WHERE dedupe_key IS NOT NULL;`.

### 2.4 Nessun `NUMERIC` esatto
Si rimedia con i centesimi interi della §1.5. Divieti SQL: `TOTAL`, `AVG`, divisioni, colonne `REAL`. Perdite e rischi residui nella CR-40.

### 2.5 Vincoli, trigger, immutabilità
- **CHECK** (dichiarati con `check()` di Drizzle): importi (`typeof='integer' AND >= 0`), date (`x IS date(x)`), enum (`status IN (…)`, generati dalle costanti TS), JSON (`json_valid(x)`), coerenze locali (`net_cents + vat_cents = gross_cents`; `paid ≤ liquidated ≤ accepted ≤ amount` sul SAL, dove le colonne sono nella stessa riga).
- **Audit append-only** (guida §6.1). In SQLite non esistono GRANT, quindi si usano solo i **trigger**:
  ```sql
  CREATE TRIGGER IF NOT EXISTS audit_event_no_update BEFORE UPDATE ON audit_event
  BEGIN SELECT RAISE(ABORT, 'AUDIT_APPEND_ONLY'); END;
  CREATE TRIGGER IF NOT EXISTS audit_event_no_delete BEFORE DELETE ON audit_event
  BEGIN SELECT RAISE(ABORT, 'AUDIT_APPEND_ONLY'); END;
  ```
  Stessa protezione per `financial_movement`, `procedure_version`, `payment_forecast_line`, `milestone_forecast` (immutabilità delle versioni), `alert_notification` e `validation_decision`. Per `procedure_version` è permesso un solo `UPDATE`: l'impostazione di `approved_at`/`approved_by` da `NULL` a valore (`WHEN OLD.approved_at IS NOT NULL OR <altre colonne cambiate>` → abort). Verificato: UPDATE e DELETE vengono rifiutati con `AUDIT_APPEND_ONLY`.
- **Perdita dei trigger nelle ricreazioni** (CR-39): drizzle-kit ricrea le tabelle per molti `ALTER`, e i trigger della tabella eliminata spariscono. Mitigazione:
  1. trigger e indici speciali stanno **solo** in `db/sql/triggers.sql` (idempotente: `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`), applicato da `cli migrate` **dopo ogni** migrazione;
  2. un test di integrazione verifica, su un DB migrato da zero **e** su uno aggiornato da una migrazione precedente, la presenza di tutti i trigger dell'elenco `REQUIRED_TRIGGERS` e il loro effetto (UPDATE/DELETE rifiutati);
  3. `/ready` risponde `503` se manca un trigger obbligatorio.
- **Hash chain dell'audit** (raccomandata, I8): `audit_event.prev_hash`, `hash = sha256(prev_hash || json canonico)`, calcolati nell'application layer (lo scrittore è unico, quindi la catena è lineare); `cli audit verify`. Rileva le manomissioni fatte da chi ha accesso al file (CR-42).

### 2.6 JSON1
JSON è integrato in SQLite ≥ 3.38. Si usa solo per dati **non interrogati né vincolati**: `before`/`after` dell'audit, `evidence_refs`, payload di job e outbox, risultato serializzato della simulazione, valori di `config_version`. Sempre con `CHECK (json_valid(x))`. I dati su cui si filtra o si applicano vincoli stanno in colonne o tabelle proprie (spec §12.2), es. `procedure_snapshot_year` invece di `json_each` sul fabbisogno annuo.

### 2.7 Indici, proiezioni, ricerca full-text
- `procedure_snapshot` (guida §4.4) con indici su `health`, `status`, `structure_id`, `next_deadline_date`, `reschedule_required`; `procedure_snapshot_year(procedure_id, year, need_cents, available_cents)` con PK `(procedure_id, year)` e indice `(year, procedure_id)` per il filtro per annualità (T-003).
- Alert: `UNIQUE(rule_code, target_type, target_id, due_date)` (DEC-012), indice `(state, severity)`. Notifiche: `UNIQUE(alert_id, level, recipient, channel)`. Movimenti: `(procedure_id, year)`.
- **FTS5** per la ricerca nel portafoglio (US-011):
  ```sql
  CREATE VIRTUAL TABLE IF NOT EXISTS procedure_search USING fts5(
    code, title, structure_label, supplier_name, cig, cup,
    tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
  ```
  La tabella è mantenuta dal repository dello snapshot **nella stessa transazione** (`DELETE` + `INSERT` per procedura), senza trigger. `cli search rebuild` la ricostruisce. Ricerca: `MATCH` con prefisso (`attivita*` trova "attività": verificato). FTS5 non ha uno stemmer italiano, ma prefissi e rimozione dei diacritici bastano per codici, oggetti e nomi (CR-49).

### 2.8 Prestazioni (NFR-002, NFR-003)
- La lista legge `procedure_snapshot` filtrato e paginato (`LIMIT/OFFSET` con `size ≤ 100`), più un `COUNT(*)` sullo stesso filtro. Con 1.000 righe e gli indici della §2.7 il costo atteso è dell'ordine dei millisecondi, molto sotto i 2 s di p95. Il valore si **misura** in I8 con `pnpm perf:generate` (1.000 procedure sintetiche) e un test che chiama l'API 200 volte (p95 ≤ 2 s, con soglia d'allarme interna a 200 ms).
- La simulazione (NFR-003) è una funzione pura in memoria su ≤ 30 milestone: microsecondi; la persistenza della bozza è una transazione.
- Ricalcolo dello snapshot: una procedura per transazione. `run_checks` su 1.000 procedure gira nel worker a blocchi, e si misura che le scritture del web non attendano oltre `busy_timeout` (test di soak in I8: 0 `SQLITE_BUSY` lato web).

### 2.9 Backup, restore, reset della demo
- **Backup** (`cli backup`): `VACUUM INTO '/data/backups/<ts>/inapp.db'` produce una copia consistente e compattata con un solo comando, senza bloccare gli scrittori in WAL. A questa si aggiunge il manifest dei file di storage (immutabili e indirizzati per hash, quindi basta copiarli). `db.backup()` di better-sqlite3 resta l'alternativa incrementale.
- **Restore** (`cli restore <dir>`), **solo a servizi fermi**: `PRAGMA integrity_check` sulla copia → sostituzione di `/data/inapp.db` → eliminazione di `-wal`/`-shm` → `migrate` (se la copia è più vecchia) → riavvio. Comando: `docker compose stop web worker && docker compose run --rm init restore /data/backups/<ts> && docker compose start web worker`.
- **Reset della demo** (US-112, T-022): ADMIN, token di conferma, `APP_ENV=demo`.
  1. `VACUUM INTO` di sicurezza in `backups/pre-reset-<ts>`, così l'audit precedente non si perde.
  2. Una sola transazione `IMMEDIATE`:
     - `DROP` dei trigger di guardia;
     - svuotamento delle tabelle in ordine inverso di FK;
     - seed (gli stessi use case di `seed`, rientranti con `SAVEPOINT`);
     - ricreazione dei trigger;
     - `system_meta.db_epoch += 1`;
     - audit `DEMO_RESET` con conteggi e nome del backup (spec §11.2);
     - `COMMIT`.
  3. `run_checks` alla data di riferimento.

  Gli altri processi vedono il DB prima o dopo, mai a metà. I job in corso falliscono il completamento (lease perso, epoch cambiata) e i loro effetti vengono annullati.
  Il reset è l'unico punto del codice autorizzato a rimuovere i trigger fuori dalle migrazioni: `src/infrastructure/db/reset.ts`, coperto da un test dedicato. Le sessioni vengono revocate tutte.
- **Ripartenza da zero:** `docker compose down -v && docker compose up --build`.

### 2.10 File del DB su volume Docker
- **Volume nominato** `appdata` montato su `/data` in `init`, `web` e `worker`. Contiene `inapp.db` (+ `-wal`, `-shm`), `storage/` e `backups/`.
- **Web e worker possono condividere il file in sicurezza** perché girano sullo **stesso kernel**: la VM WSL2 di Docker Desktop, con un filesystem locale ext4. Il file `-shm`, mappato in memoria, e i lock POSIX sono coerenti fra i container. È lo stesso presupposto dei sidecar tipo Litestream.
- **Vietato** il bind mount di una cartella Windows (`./data:/data`): passa da un filesystem di rete (9p/virtiofs) dove i lock e la memoria condivisa di WAL non sono affidabili, con rischio di corruzione. Vietati anche NFS/SMB e volumi condivisi fra host diversi (CR-41).
- Tutti i container girano con lo stesso utente non root (`node`, uid 1000). L'immagine crea `/data` di proprietà di `node`: Docker copia proprietario e permessi nel volume nominato al primo montaggio.
- In sviluppo senza Docker (`pnpm dev`) il file sta in `./.data/inapp.db` (in `.gitignore`), su disco locale NTFS: WAL funziona.

### 2.11 Cosa si perde rispetto a PostgreSQL

| Perdita | Impatto sull'MVP | Mitigazione |
|---|---|---|
| Scritture concorrenti (MVCC multi-writer) | Basso: pochi utenti demo, transazioni di pochi ms | UoW `IMMEDIATE`, transazioni brevi, `run_checks` a blocchi |
| `NUMERIC(14,2)` esatto | Medio: niente aritmetica decimale in SQL | Centesimi interi + `Money` + controlli automatici (§1.5) |
| Tipi ricchi (`date`, `timestamptz`, enum, array, range, JSONB con indici GIN) | Basso | CHECK, tabelle di supporto, testo ISO |
| Ruoli, GRANT, RLS, audit protetto dal DBMS | Medio: chi ha accesso al file può rimuovere i trigger | Accesso al file solo dai container, hash chain dell'audit, backup |
| `SELECT … FOR UPDATE [SKIP LOCKED]`, lock advisory, `LISTEN/NOTIFY` | Basso | Lease su tabella, polling a 1 s |
| `ALTER TABLE` completo | Medio: ricreazione delle tabelle, perdita dei trigger | SQL post-migrazione + test di presenza (§2.5) |
| Full-text con dizionario italiano | Basso | FTS5 con prefissi e `remove_diacritics` |
| Accesso di rete, più istanze applicative, HA, replica, PITR | Nullo per la demo, bloccante per la produzione | Fuori perimetro (spec §2.2); `VACUUM INTO` per i backup |
| `statement_timeout`, `pg_stat_statements`, strumenti di analisi | Basso | Misura della durata delle transazioni nella UoW, log |

### 2.12 Quando migrare a PostgreSQL e come restare migrabili
**Si migra quando si verifica almeno una di queste condizioni:**
- si passa a un **pilota con dati reali** o a utenti INAPP in produzione (policy IT, backup PITR, HA);
- servono più istanze applicative o un DB raggiungibile in rete (BI, integrazioni InGov/Civilia);
- le misure mostrano attese sul lock di scrittura (p95 > 100 ms) o transazioni lunghe inevitabili, come import massivi concorrenti;
- serve sicurezza a livello DB (ruoli separati per l'audit, RLS);
- il DB supera qualche decina di GB.

**Regole di migrabilità** (da far rispettare dall'inizio):
1. Drizzle e SQL **solo** in `src/infrastructure/db`. Application e dominio vedono porte asincrone.
2. SQL specifico di SQLite (FTS5, `json_*`, `typeof`, pragma) isolato in `src/infrastructure/db/sqlite/` e in `db/sql/`, un file per funzione.
3. Costrutti portabili: `INSERT … ON CONFLICT … DO NOTHING/UPDATE` (non `INSERT OR IGNORE/REPLACE`), `RETURNING`, CTE; niente `rowid` nel codice applicativo.
4. Tipi con mappatura diretta: `*_cents` → `BIGINT` (o `NUMERIC(14,2)` con una vista di conversione), date `TEXT` → `DATE`, istanti → `timestamptz`, JSON `TEXT` → `jsonb`.
5. La UoW è già asincrona: su PostgreSQL diventa una transazione di un client del pool. Il lease dei job diventa `FOR UPDATE SKIP LOCKED` dietro la stessa porta `JobQueue`.
6. I test di integrazione passano dalle porte: la suite si riusa su PostgreSQL cambiando l'adapter.

Stima indicativa della migrazione: schema Drizzle `pgTable` + adapter + trigger in PL/pgSQL + test, circa 1–2 settimane per un agente, senza toccare dominio e UI.

---

## 3. Architettura del codice

### 3.1 Layout del repository
```
/src/domain/              # TS puro: money, calendar, milestones, alerts, health, rescheduling, finance, anomalies
/src/application/         # use case, query, porte (Clock, UnitOfWork, repository, Storage, Ocr, Llm, Notifier,
                          #   JobQueue, Accounting, Procurement), authz (matrice §7.3 + object-level), errori applicativi
/src/contracts/           # Zod: DTO di request/response, MoneyString, codici d'errore, contratti delle route,
                          #   schemi dei file di seed e di config. Dipende solo da zod
/src/infrastructure/      # db (schema Drizzle, repository, UoW, migrate, reset, sqlite/), auth (sessioni, argon2, csrf),
                          #   mail, ocr, pdf, spreadsheet/export, storage, llm (disabled/fake), clock, config, logging
/src/composition/         # composition root (server-only): collega le porte agli adapter; createContext(actor)
/src/app/                 # Next.js App Router
  (public)/login/         #   pagine pubbliche
  (app)/…                 #   pagine autenticate (UI-01…UI-10), layout con requireActor() e banner DEMO
  api/**/route.ts         #   route handler REST (solo bindRoute + contratto)
  _http/                  #   bindRoute, error mapping, correlation, cookie
  health/route.ts         #   GET /health
  ready/route.ts          #   GET /ready
/src/ui/                  # componenti React (shadcn/ui), formatter it-IT, apiClient, hook TanStack Query
/worker/                  # main.ts (loop, scheduler, reaper, heartbeat), handlers/ (RUN_CHECKS, IMPORT, OCR, OUTBOX…)
/cli/                     # main.ts: bootstrap | migrate | seed [--if-empty|--reset] | run-checks [--date] | reset --yes
                          #   | backup | restore <dir> | worker-health | search rebuild | audit verify | perf generate
/db/migrations/           # SQL generato da drizzle-kit (+ migrazioni --custom)
/db/sql/                  # SQL post-migrazione idempotente: triggers.sql, fts.sql
/config/                  # templates/*.yaml, calendar.yaml, alert_policies.yaml (invariati)
/seed/                    # json, procedures.xlsx, documents/ (+ SHA256SUMS), fixtures/, expected_results.json
/vendor/                  # tessdata/ita.traineddata, fonts/ (con licenze e SHA-256)
/tests/{unit,integration,api}/   # Vitest; helper in tests/_support
/e2e/                     # Playwright, demo-script.spec.ts
/scripts/                 # check.sh, guards.ts, traceability.ts, openapi.ts, generate-seed-documents.ts,
                          #   generate-seed-workbook.ts
/docs/                    # guida, adr/, openapi.json, runbook, traceability.md
Dockerfile  docker-compose.yml  .dependency-cruiser.cjs  eslint.config.mjs  drizzle.config.ts
next.config.ts  vitest.config.ts  playwright.config.ts  .env.example  README.md  CLAUDE.md
```

### 3.2 Regole di dipendenza

| Da \ verso | domain | application | contracts | infrastructure | composition | app | ui |
|---|---|---|---|---|---|---|---|
| **domain** | ✓ | — | — | — | — | — | — |
| **application** | ✓ | ✓ | — | — | — | — | — |
| **contracts** | — | — | ✓ | — | — | — | — |
| **infrastructure** | ✓ | ✓ (porte) | ✓ (schemi seed/config) | ✓ | — | — | — |
| **composition** | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| **app** (route, pagine) | — | ✓ (tipi, errori) | ✓ | — | ✓ | ✓ | ✓ |
| **ui** | — | — | ✓ (solo tipi e schemi) | — | — | — | ✓ |
| **worker / cli** | — | ✓ | ✓ | — | ✓ | — | — |

Pacchetti esterni ammessi nel **dominio**: solo `temporal-polyfill`. Vietati `node:*`, `next`, `react`, `drizzle-orm`, `better-sqlite3` e `zod`: il dominio non valida input esterni, li riceve già tipizzati. Nell'application: niente `next`, `drizzle-orm`, `better-sqlite3`, `node:fs`.

Controllo automatico con **dependency-cruiser** (`pnpm arch`, nella gate), estratto:
```js
// .dependency-cruiser.cjs (estratto)
forbidden: [
  { name: 'domain-puro', severity: 'error',
    from: { path: '^src/domain' },
    to: { pathNot: ['^src/domain', '^node_modules/temporal-polyfill'] } },
  { name: 'application-senza-framework', severity: 'error',
    from: { path: '^src/application' },
    to: { path: ['^src/(infrastructure|composition|app|ui)', 'node_modules/(next|drizzle-orm|better-sqlite3)', '^(fs|node:fs)$'] } },
  { name: 'ui-senza-dominio', severity: 'error',
    from: { path: '^src/ui' }, to: { path: '^src/(domain|application|infrastructure|composition)' } },
  { name: 'no-cicli', severity: 'error', from: {}, to: { circular: true } },
]
```
In aggiunta: `server-only` in `infrastructure` e `composition`; lint e guard della §1.15.

### 3.3 Porte e adapter

| Porta (application) | Adapter di default | Adapter di test |
|---|---|---|
| `Clock` | `ConfigClock` (env/config, `Europe/Rome`) | `FixedClock` |
| `UnitOfWork` + repository | `SqliteUnitOfWork` (Drizzle/better-sqlite3) | stesso adapter su DB in memoria (integration); fake in memoria (unit) |
| `JobQueue` | `SqliteJobQueue` | in-process sincrono |
| `Notifier` | `OutboxNotifier` (scrive l'outbox) + `SmtpSender` (worker, nodemailer) | `CapturingSender` |
| `Storage` | `LocalContentAddressedStorage` (`/data/storage`) | cartella temporanea |
| `PdfReader` / `PageRenderer` | `UnpdfReader` / `UnpdfCanvasRenderer` | file in `seed/documents` |
| `Ocr` | `TesseractJsOcr` (`ita`, locale) · `DisabledOcr` | `FakeOcr` (risultati fissi, timeout simulati) |
| `Llm` | `DisabledLlm` | `FakeLlm` (timeout/errore) |
| `PasswordHasher` | `Argon2idHasher` | parametri ridotti nei test |
| `SpreadsheetReader/Writer`, `PdfRenderer`, `CsvWriter` | exceljs, @react-pdf/renderer, csv-stringify | — |
| `Accounting`, `Procurement` | stub demo | stub |

### 3.4 Flusso di una mutazione
`route.ts` → `bindRoute(contract)`: correlation ID → `Actor` dalla sessione → CSRF/Origin → validazione Zod → `Idempotency-Key`/`If-Match` → use case(`actor`, comando).

Lo use case:
1. autorizza (permesso + object-level);
2. carica tramite la connessione di lettura;
3. calcola con le funzioni pure del dominio (`referenceDate` da `Clock`);
4. `uow.write`, dove scrive i dati, l'**audit** (prima/dopo, motivazione, correlation ID), l'**outbox** o i job e aggiorna lo snapshot;
5. ritorna il DTO.

Gli errori applicativi (`ForbiddenError`, `InvariantViolation`, `StaleSimulation`…) vengono mappati in `bindRoute` nell'envelope §10.2. Un errore inatteso diventa `500 INTERNAL_ERROR` con `correlation_id`, senza stack trace (NFR-016).

### 3.5 Osservabilità
- `pino` con log JSON su stdout, `redact` per password, cookie, header `authorization`/`x-csrf-token` e contenuti dei documenti.
- Correlation ID: `proxy.ts` genera `x-correlation-id` se manca. `bindRoute` lo mette in `AsyncLocalStorage`; logger, audit e job lo propagano.
- Metriche minime (US-111) da tabelle e contatori in memoria, esposte su `/api/system/status` (ADMIN): durata delle richieste, errori, job per stato, età dell'heartbeat, alert aperti, documenti, coda outbox.

---

## 4. Runtime e distribuzione

### 4.1 docker-compose.yml (minimale)
```yaml
name: inapp
x-app: &app
  build: { context: ., target: runtime }
  image: inapp-app:local
  env_file: [.env]
  volumes: [appdata:/data]
  init: true
services:
  init:                      # one-shot: migrate + SQL post-migrazione + seed --if-empty + run-checks
    <<: *app
    entrypoint: ["node", "dist/cli.js"]
    command: ["bootstrap"]
    restart: "no"
  web:
    <<: *app
    command: ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
    ports: ["127.0.0.1:3000:3000"]
    depends_on:
      init: { condition: service_completed_successfully }
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 3s
      retries: 12
      start_period: 20s
  worker:
    <<: *app
    command: ["node", "dist/worker.js"]
    depends_on:
      init: { condition: service_completed_successfully }
      mailpit: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "node", "dist/cli.js", "worker-health"]   # heartbeat < 120 s
      interval: 30s
      timeout: 5s
      retries: 4
      start_period: 30s
  mailpit:
    image: axllent/mailpit:v1.31.3
    ports: ["127.0.0.1:8025:8025"]     # UI; SMTP 1025 solo sulla rete interna
    healthcheck:
      test: ["CMD", "/mailpit", "readyz"]
      interval: 10s
      retries: 6
  tools:                     # lint, typecheck, test non E2E (profilo tools)
    build: { context: ., target: dev }
    profiles: [tools]
    env_file: [.env]
    volumes: [appdata:/data]
  e2e:                       # Playwright (profilo e2e)
    build: { context: ., target: e2e }
    profiles: [e2e]
    environment: { BASE_URL: "http://web:3000", MAILPIT_URL: "http://mailpit:8025" }
    depends_on:
      web: { condition: service_healthy }
volumes:
  appdata: {}
```
Note:
- `APP_ALLOWED_ORIGINS=http://localhost:3000,http://web:3000`: l'E2E raggiunge il web con il nome di servizio e il controllo dell'Origin (§1.7) deve accettarlo.
- `web` non dipende da `worker`, per evitare che il web resti non healthy quando il worker è giù: il degrado si vede su `/ready` e su `/api/system/status`.

**Dockerfile** (multi-stage, una sola immagine applicativa):

| Stage | Contenuto |
|---|---|
| `base` | `node:24.21-slim`, `npm i -g pnpm@12.8.1` |
| `deps` | `pnpm install --frozen-lockfile` (binari nativi Linux installati **nel container**, mai copiati da Windows: `node_modules` in `.dockerignore`) |
| `dev` | `deps` + sorgenti (target del servizio `tools`) |
| `build` | `next build`, `esbuild` per `dist/worker.js` e `dist/cli.js` (`--platform=node --packages=external`) |
| `prod-deps` | `pnpm install --prod --frozen-lockfile` |
| `runtime` | utente `node`, `NODE_ENV=production`, copia di `node_modules` di produzione, `.next`, `public`, `dist`, `db/`, `config/`, `seed/`, `vendor/`; `mkdir /data` di proprietà di `node` |
| `e2e` | `mcr.microsoft.com/playwright:v1.63.0-noble` + dipendenze di sviluppo + `e2e/` e `playwright.config.ts` |

`output: 'standalone'` **non** si usa: worker e cli hanno bisogno delle dipendenze native (better-sqlite3, canvas, argon2) che lo standalone pota per il solo web. L'immagine è più grande ma più robusta. La scelta va rivista solo se la dimensione dell'immagine diventa un problema.

### 4.2 `/health` e `/ready`
- `GET /health` (liveness): processo vivo, `{status:"ok", version, commit}`, **senza** toccare il DB.
- `GET /ready` (readiness): `200` se **db** (connessione aperta + `SELECT 1`), **migrations** (ultima migrazione = attesa), **triggers** (tutti i `REQUIRED_TRIGGERS` presenti) e **storage** (`/data/storage` scrivibile) sono ok. Nel corpo riporta anche `scheduler` (età dell'heartbeat), `mail`, `ocr` e `llm` (`disabled`) come `ok | degraded | disabled`, senza farli fallire (US-110, US-111). Altrimenti `503` con l'elenco dei componenti, senza dettagli sensibili.
- Worker: `cli worker-health` → exit 0 se l'heartbeat ha meno di 120 s.

### 4.3 Avvio, seed, reset
- **Comando unico:** `docker compose up --build` (in CI e nella gate: `docker compose up -d --build --wait`).
- `init` esegue `bootstrap`, che è idempotente:
  1. `migrate` (migrazioni drizzle + `db/sql/*.sql`);
  2. `PRAGMA quick_check`;
  3. se il DB è vuoto (`system_meta.seeded_at IS NULL`): `seed` + `run-checks --date <reference_date>`.

  Al primo avvio, quando `web` diventa healthy, la demo è già nello stato dell'oracle (T-001, T-004).
- **Reset:** `docker compose run --rm init reset --yes`, oppure dalla UI admin (`POST /api/admin/reset` con token). Procedura nella §2.9.
- **Backup/restore:** `docker compose run --rm init backup` / §2.9.
- **Migrazioni concorrenti impossibili:** le esegue solo `init`, prima degli altri servizi. `web` e `worker` verificano soltanto la versione dello schema e non migrano.

### 4.4 Sviluppo locale (Windows, senza Docker)
`pnpm install` → `docker compose up -d mailpit` → `pnpm db:bootstrap` → `pnpm dev`. Quest'ultimo usa `concurrently`: `next dev` + `tsx watch worker/main.ts`, con DB in `./.data/inapp.db`. Le modifiche allo schema si fanno con `pnpm db:generate` (drizzle-kit) e si rivedono a mano nel SQL generato prima del commit.

---

## 5. Impatto sulla guida e su CLAUDE.md

### 5.1 Decisioni di default (guida §3)

| DEC | Esito | Nuovo testo (se cambia) |
|---|---|---|
| DEC-001 | Resta | — |
| DEC-002 | **Cambia** | Porta `Clock.referenceDate()` → `Temporal.PlainDate`: legge `demo.reference_date` dalla config (default `2026-10-01`), sovrascrivibile da `APP_REFERENCE_DATE`. Timezone `Europe/Rome`. `Clock.now()` → `Temporal.Instant` per audit, log e lease, separato dalla data di business. Vietati `Date.now()`, `new Date()` senza argomenti e `Temporal.Now` in `src/domain` e `src/application` (lint + guard). |
| DEC-010…013 | Restano | — |
| DEC-020 | Resta | (YAML letto con `yaml` e validato con Zod) |
| DEC-021…025 | Restano | — |
| DEC-030…032 | Restano | — |
| DEC-033 | **Cambia** | Importi in **centesimi interi**: `Money` su `bigint` nel dominio, `INTEGER` con `CHECK (typeof(x)='integer' AND x>=0)` nel DB (colonne `*_cents`), stringhe a 2 decimali in JSON (`"47600.00"`). ROUND_HALF_UP (metà lontano da zero) con `divRoundHalfUp` in aritmetica intera. Importo SAL = `divRoundHalfUp(gross_cents × pct_centesimi, 10000)`; l'**ultimo SAL** = `gross − Σ precedenti`. In SQL solo `SUM`, `+`, `-` e confronti. |
| DEC-040…042 | Restano | — |
| DEC-043 | Resta | (locking ottimistico con colonna `version`; `409 STALE_SIMULATION` invariato) |
| DEC-044 | Resta | — |
| DEC-050, DEC-051 | Restano | — |
| DEC-060…062 | Restano | — |
| DEC-070 | **Cambia** | Documenti seed generati **una volta** da `scripts/generate-seed-documents.ts` (`@react-pdf/renderer` per i PDF di testo; `@napi-rs/canvas` per l'immagine del documento "scansionato", inserita in un PDF senza layer di testo), con font in `vendor/fonts/` e metadati di data fissi (`2026-09-01T00:00:00Z`). File salvati nel repository; hash in `seed/documents/SHA256SUMS`, verificati da un test. Elenco nella §10.7. |
| DEC-080 | Resta | — |
| DEC-090 | Resta | (invio con nodemailer verso Mailpit v1.31) |
| DEC-091 | **Cambia** | **Next.js fullstack** (App Router), stessa origine, nessun proxy verso altri backend. Le mutazioni passano **solo** da route handler `/api/*` definiti da contratti Zod; **Server Actions vietate**. I Server Component leggono tramite le query dell'application layer con l'`Actor` della sessione; TanStack Query solo per mutazioni e parti interattive. Sessione in cookie `httpOnly; SameSite=Lax` con sessioni server-side in SQLite; CSRF a doppio invio firmato (`X-CSRF-Token`) + controllo dell'Origin sulle mutazioni. Tipi del client da `z.infer` sui contratti, senza generazione da OpenAPI. |
| DEC-092 | **Cambia** | Nessun Redis. Coda di job su tabella SQLite con **lease atomico** (`BEGIN IMMEDIATE` + `UPDATE … RETURNING`), deduplicazione con indice unico, reaper dei lease scaduti; leadership dello scheduler su tabella `leader_lease`; heartbeat in DB. Processo `worker` separato, stesso codebase. |
| DEC-093 | **Cambia** | Test Vitest in `tests/{unit,integration,api}`; E2E Playwright in `e2e/` nella radice. |
| DEC-094, DEC-095 | Restano | — |
| **DEC-096** (nuova) | Nuova | **SQLite come unico DB.** WAL, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000`. Per processo: una connessione di scrittura con mutex e transazioni `IMMEDIATE` brevi senza I/O esterno, più una di sola lettura (`query_only`). Porte asincrone. Trigger e FTS in `db/sql/*.sql` riapplicati dopo ogni migrazione. File su volume Docker nominato, mai bind mount Windows. |
| **DEC-097** (nuova) | Nuova | **Autenticazione custom** con sessioni su DB (in DB solo `sha256` del token), argon2id (`@node-rs/argon2`), scadenza per inattività 8 h / assoluta 12 h, rotazione a login, cambio ruolo e impersonazione. Ripiego: Better Auth (ADR-0001). |
| **DEC-098** (nuova) | Nuova | **Contratti API in Zod** (`src/contracts`) come unica fonte per validazione, tipi del client e OpenAPI (`@asteasolutions/zod-to-openapi`). `docs/openapi.json` versionato e verificato nella gate; Swagger UI su `/api/docs`. |
| **DEC-099** (nuova) | Nuova | **Documenti in JS:** testo con `unpdf`, rendering con `@napi-rs/canvas`, OCR con `tesseract.js` (`ita` locale, nessuna CDN), tutto nel worker; pagine PNG pre-renderizzate all'import. |

### 5.2 Testo sostitutivo della guida §4 (pronto da incollare)

````markdown
## 4. Architettura e stack concreti

> Stack unico TypeScript: Next.js fullstack + SQLite (ADR-0001, DEV-004). Nessun componente Python. Dettagli e motivazioni: [06_architettura_nextjs_sqlite.md](06_architettura_nextjs_sqlite.md).

### 4.1 Servizi Docker Compose

| Servizio | Immagine/base | Porta host | Ruolo | Healthcheck |
|---|---|---|---|---|
| `init` | `Dockerfile` target `runtime` (Node 24 slim) | — | One-shot `cli bootstrap`: migrazioni + `db/sql/*.sql` + `seed --if-empty` + `run-checks` alla data di riferimento | exit 0 |
| `web` | stessa immagine | `127.0.0.1:3000` | Next.js: UI, API REST `/api/*`, `/health`, `/ready`, `/api/docs` | `GET /ready` |
| `worker` | stessa immagine | — | Scheduler (`RUN_CHECKS` ogni 5 min), coda job (import, OCR, render pagine), dispatcher outbox | heartbeat < 120 s |
| `mailpit` | `axllent/mailpit:v1.31` | `127.0.0.1:8025` (UI) | SMTP mock (1025 interno) | `/mailpit readyz` |
| `tools` (profilo `tools`) | target `dev` | — | lint, typecheck, test unit/integration/api | — |
| `e2e` (profilo `e2e`) | target `e2e` (`mcr.microsoft.com/playwright:v1.63.0-noble`) | — | E2E e axe | — |

Volume nominato `appdata` → `/data` (`inapp.db` + `-wal`/`-shm`, `storage/` fuori dalla web root, `backups/`), condiviso da `init`, `web` e `worker` sullo stesso host. **Vietato** il bind mount di una cartella Windows per `/data`. `web` e `worker` dipendono da `init` (`service_completed_successfully`); solo `init` esegue migrazioni.

### 4.2 Librerie di riferimento (versioni esatte nel lockfile)
- **Piattaforma:** Node.js 24 LTS, TypeScript 6.0 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), pnpm 12 (`packageManager` fissato).
- **Web/API:** Next.js 16 (App Router), React 19, Zod 4, @asteasolutions/zod-to-openapi 9 + swagger-ui-dist, TanStack Query 5, TanStack Table, React Hook Form + `zodResolver`, shadcn/ui (Radix) + Tailwind 4, Recharts 3.
- **Persistenza:** better-sqlite3 13 (SQLite 3.53 con FTS5/JSON), Drizzle ORM 0.45 + drizzle-kit 0.31.
- **Dominio:** solo `temporal-polyfill` (date `PlainDate`); `Money` su `bigint`, implementazione interna.
- **Sicurezza:** @node-rs/argon2 (argon2id), @oslojs/crypto ed @oslojs/encoding (hash, HMAC, base64url), rate-limiter-flexible.
- **Job e notifiche:** croner (scheduler), nodemailer → Mailpit.
- **Documenti:** unpdf/pdfjs-dist (testo, rendering), @napi-rs/canvas, tesseract.js 7 con `ita.traineddata` in `vendor/tessdata/`, yauzl (ZIP), file-type (MIME), @react-pdf/renderer (PDF generati), exceljs (XLSX), csv-stringify (CSV), yaml.
- **Log:** pino (JSON, redazione).
- **Qualità:** ESLint 9 (flat) + eslint-config-next + typescript-eslint, Prettier, dependency-cruiser, Vitest 5 + @vitest/coverage-v8 + fast-check, Playwright + @axe-core/playwright. decimal.js solo nei test.
- Puoi sostituire una libreria solo con una DEC-1xx motivata. Gli aggiornamenti di major passano da una DEC.

### 4.3 Layout del repository

```
/src/domain/          # TS puro: entità, value object (Money, Percent, BusinessDate), regole pure
/src/application/     # use case, query, porte (Clock, UnitOfWork, repository, JobQueue, Storage, Ocr, Llm, Notifier,
                      #   PasswordHasher, Accounting, Procurement), authz (matrice §7 + object-level), errori applicativi
/src/contracts/       # Zod: DTO request/response, MoneyString, codici d'errore, contratti delle route, schemi seed/config
/src/infrastructure/  # db (Drizzle, repository, UoW, migrate, reset, sqlite/), auth, mail, ocr, pdf, export, storage,
                      #   llm (disabled/fake), clock, config (env Zod), logging
/src/composition/     # composition root server-only: porte → adapter, createContext(actor)
/src/app/             # Next.js: (public)/login, (app)/… pagine UI-01…UI-10, api/**/route.ts, _http/ (bindRoute),
                      #   health/route.ts, ready/route.ts
/src/ui/              # componenti React, formatter it-IT, apiClient (CSRF, Idempotency-Key), hook TanStack Query
/worker/              # main.ts (loop, scheduler, reaper, heartbeat), handlers/
/cli/                 # bootstrap | migrate | seed [--if-empty|--reset] | run-checks [--date] | reset --yes | backup
                      #   | restore <dir> | worker-health | search rebuild | audit verify | perf generate
/db/migrations/       # SQL di drizzle-kit (+ migrazioni --custom)
/db/sql/              # SQL post-migrazione idempotente (triggers.sql, fts.sql)
/config/templates/*.yaml  /config/calendar.yaml  /config/alert_policies.yaml
/seed/                # §10 (json, procedures.xlsx, documents/ + SHA256SUMS, expected_results.json, fixtures/)
/vendor/              # tessdata/, fonts/ (licenze e SHA-256)
/tests/{unit,integration,api}/   /e2e/
/scripts/             # check.sh, guards.ts, traceability.ts, openapi.ts, generate-seed-documents.ts, generate-seed-workbook.ts
/docs/                # guida, adr/, openapi.json, runbook, traceability.md
Dockerfile  docker-compose.yml  .env.example  README.md  CLAUDE.md
```

### 4.4 Regole di dipendenza (da far rispettare)
- `src/domain` importa solo da `src/domain` e da `temporal-polyfill`: niente `node:*`, `next`, `react`, `zod`, `drizzle-orm`, `better-sqlite3`. `src/application` importa solo da `domain` e da sé stesso. `src/contracts` importa solo `zod`. `src/ui` non importa `domain`, `application`, `infrastructure` né `composition` (solo i tipi e gli schemi di `contracts`). `infrastructure` e `composition` importano `server-only`. Controllo automatico con **dependency-cruiser** (`pnpm arch`, regole in `.dependency-cruiser.cjs`, cicli vietati).
- Le funzioni di calcolo (date, importi, stati, health, simulazione) sono pure e prendono `referenceDate` come parametro.
- Ogni mutazione passa da un route handler `/api/*` (Server Actions vietate) e da un use case che autorizza (permesso + object-level) e, **nella stessa transazione** `uow.write`, scrive dati, audit, outbox/job e snapshot. Nessun I/O esterno dentro la transazione.
- I Server Component leggono solo tramite le query dell'application layer con l'`Actor` corrente (stessa autorizzazione delle API); mai `fetch` verso la propria `/api` né accesso diretto a Drizzle.
- I valori derivati usati nelle liste (health, stato, prossima scadenza, importo a rischio, totali annui) stanno in `procedure_snapshot` e `procedure_snapshot_year`, con la ricerca in `procedure_search` (FTS5). Sono ricalcolati da `run_checks` e dopo ogni evento sulla procedura, nella stessa transazione (NFR-002).
- Il frontend non fa aritmetica sugli importi: riceve `MoneyString` e la formatta con `Intl.NumberFormat('it-IT', …).format(stringa)`.

### 4.5 Persistenza SQLite
- Pragma su ogni connessione: `journal_mode=WAL`, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000`, `temp_store=MEMORY`. Per processo: una connessione di scrittura (mutex + `BEGIN IMMEDIATE`) e una di lettura (`query_only=ON`). La UoW è rientrante con `SAVEPOINT`. Le porte sono asincrone.
- Transazioni brevi (obiettivo < 50 ms; log `warn` oltre 200 ms); `run_checks` usa una transazione per procedura.
- Tipi: importi `*_cents INTEGER` con CHECK `typeof='integer'` e `>= 0` (tipo custom Drizzle `moneyCents` ↔ `Money`); date `TEXT` con `CHECK (x IS date(x))`; istanti `TEXT` ISO-8601 UTC; enum con `CHECK (… IN (…))`; JSON solo per dati non interrogati, con `CHECK (json_valid(x))`. Vietate colonne `REAL/NUMERIC/DECIMAL` e, in SQL, `TOTAL`, `AVG`, `CAST AS REAL` e divisioni sugli importi.
- Locking ottimistico con colonna `version`; `Idempotency-Key` in tabella con `UNIQUE(actor_id, key)`.
- Migrazioni: `pnpm db:generate` (drizzle-kit, SQL rivisto a mano); `cli migrate` applica le migrazioni e poi `db/sql/*.sql` (trigger, FTS5), che sono idempotenti.

### 4.6 Job, scheduler, outbox
- Tabella `job` con lease atomico (`UPDATE … WHERE id=(SELECT … LIMIT 1) RETURNING *` in `BEGIN IMMEDIATE`), `dedupe_key` unica, reaper dei lease scaduti, rinnovo del lease per i job lunghi. Effetti sul DB e completamento del job nella stessa transazione, condizionati a `locked_by`.
- Scheduler `croner` nel worker; solo il leader (`leader_lease`) accoda `RUN_CHECKS` ogni 5 minuti (`dedupe_key = run_checks@<slot>`).
- Outbox scritta nella stessa transazione dell'evento; il dispatcher invia con nodemailer (at-least-once, `Message-ID` stabile).
- `worker_heartbeat` ogni 30 s. `cli run-checks --date` gira in-process e in modo sincrono (test, bootstrap); `POST /api/jobs/run-checks` accoda e risponde `202`.

### 4.7 Autenticazione, sessioni, CSRF
- Password argon2id (`@node-rs/argon2`, m=19 MiB, t=2, p=1), hash al seed da `DEMO_PASSWORD`, verifica a tempo costante anche per utenti inesistenti.
- Cookie `inapp_session` (32 byte casuali, `HttpOnly; SameSite=Lax; Path=/`, `Secure` con https); nel DB solo `sha256(token)`. Scadenza per inattività 8 h, assoluta 12 h; rotazione a login, cambio ruolo e impersonazione; logout = revoca.
- CSRF: cookie `inapp_csrf` = `HMAC(SESSION_SECRET, session_id)`, header `X-CSRF-Token` obbligatorio sui metodi non sicuri, confronto a tempo costante, `Origin` in `APP_ALLOWED_ORIGINS`.
- `proxy.ts` non è un confine di sicurezza: genera il correlation ID e fa redirect se manca il cookie. L'autorizzazione sta negli use case.
- Rate limit in memoria su login, import e assistente; audit dei login falliti.

### 4.8 Convenzioni API (oltre alla §10.1 della specifica)
- Ogni endpoint è un contratto Zod in `src/contracts/routes/` legato al `route.ts` con `bindRoute`. `docs/openapi.json` si genera con `pnpm openapi` ed è verificato nella gate; Swagger UI su `/api/docs`.
- Paginazione `page`/`size` (size massima 100) in tutto il prodotto. Risposta: `{items, page, size, total}`.
- Errori nell'envelope della §10.2. Codici stabili, ad esempio: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CSRF_REJECTED`, `FINANCIAL_INVARIANT_VIOLATION`, `INVALID_TRANSITION`, `STALE_SIMULATION`, `BLOCKING_CRITICALITY_REQUIRES_OVERRIDE`, `FOUR_EYES_VIOLATION`, `IDEMPOTENCY_CONFLICT`, `VERSION_CONFLICT`, `UPLOAD_REJECTED`, `INTERNAL_ERROR`.
- `Idempotency-Key` obbligatoria su import, pagamenti, liquidazioni e approvazioni. Header `If-Match` (versione) su PATCH e transizioni.
- Date ISO `YYYY-MM-DD`; importi come stringa decimale a 2 cifre (`MoneyString`); ogni valore consolidato include `source_type` ed `evidence_refs`. Nelle risposte `number` solo per campi non monetari in allowlist (test dei contratti).
- `Cache-Control: no-store` sulle risposte con dati; segmenti autenticati dinamici, niente `'use cache'`.
- In UI: date `gg/mm/aaaa`, importi `Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'})` sulla stringa. Banner sempre visibile: **"Ambiente DEMO — data di riferimento 01/10/2026"**.

### 4.9 Documenti, OCR, export
- Upload in streaming con limite di dimensione, allowlist estensione + `file-type`, nome normalizzato, storage `/data/storage/<sha256[0:2]>/<sha256>`. ZIP estratti nel worker con `yauzl` e limiti contro path traversal, ZIP slip e archive bomb, con audit dei rifiuti.
- Worker: testo nativo con `unpdf`; se una pagina ha meno di 30 caratteri → render a circa 300 dpi con `@napi-rs/canvas` → `tesseract.js` (`ita`, `langPath` locale, timeout di 60 s per pagina). Si salvano `method` e `confidence`. Le pagine PNG per il viewer si pre-renderizzano all'import. `OCR_ENABLED=false` produce un errore recuperabile.
- Export: CSV (`csv-stringify`, `;`, BOM, importi `47600,00`), XLSX (`exceljs`; unica conversione `Money → number` ammessa: `moneyToSpreadsheetNumber`), PDF (`@react-pdf/renderer`, font in `vendor/fonts/`). Ogni export → `ExportRecord` + audit.
````

### 5.3 Testo sostitutivo della guida §12 (pronto da incollare)

````markdown
## 12. Test e quality gate

### 12.1 Livelli
- **Unit** (`tests/unit`, Vitest, nessun I/O): calendario (weekend, festività, Pasquetta, fine anno), stati delle milestone, policy di alert e livelli, health, propagazione e simulazione (casi §10.5), `Money` e `divRoundHalfUp` (property-based con fast-check, decimal.js come oracle), arrotondamenti SAL, invarianti, KPI, matrice dei permessi. Copertura `src/domain/**` ≥ 70% delle righe (obiettivo 85%).
- **Integration** (`tests/integration`, **SQLite reale**, lo stesso motore della demo): migrazioni da zero e da una versione precedente; presenza ed effetto dei trigger obbligatori (audit, movimenti e versioni immutabili) anche dopo una ricreazione di tabella; schema senza colonne `REAL/NUMERIC` e con CHECK sugli `*_cents`; seed idempotente (T-002); oracle; `run_checks` idempotente; locking ottimistico; idempotency key; **lease concorrente** (3 processi figli, 0 doppie acquisizioni); recupero dei lease scaduti; outbox at-least-once; reset transazionale; FTS5.
- **API** (`tests/api`, route handler invocati in-process con `Request` reali e cookie di sessione): RBAC per ogni endpoint, con la matrice ruolo × endpoint generata dai contratti delle route, inclusi i 403 object-level (T-017); CSRF (header mancante o errato, Origin estraneo → 403 `CSRF_REJECTED`); envelope di errore; idempotenza; coerenza contratti ↔ `route.ts`; nessun `number` monetario nelle risposte.
- **E2E** (`e2e/`, Playwright nel servizio `e2e`, contro lo stack Docker): flussi T-0xx, lo spec `demo-script.spec.ts` che ripete la §13.3 della specifica, verifica delle e-mail tramite l'API di Mailpit; axe sulle pagine UI-01…UI-10 senza violazioni serious/critical. Prima della suite: reset via `POST /api/admin/reset`.

### 12.2 Database usa-e-getta
- `globalSetup` di Vitest costruisce una sola volta `template.db` (migrazioni + `db/sql` + seed) e ne conserva la versione serializzata.
- Ogni file di test apre una copia **in memoria** (`new Database(buffer)`). I test che richiedono WAL, file o più processi copiano il template in una cartella temporanea univoca e la cancellano alla fine.
- Nessun test dipende dall'ordine di esecuzione o dal DB di un altro test. La data di business arriva sempre da `FixedClock` (2026-10-01, salvo casi espliciti).
- Test oracle: template → `run_checks(2026-10-01)` → confronto campo per campo con `seed/expected_results.json`, sezioni attivate da `ORACLE_SECTIONS` (elenco esplicito, senza skip silenziosi).

### 12.3 Tracciabilità
Ogni test porta nel titolo l'ID della storia o del test di collaudo (`describe('[US-040] …')`, `test('[T-004] …')`). `scripts/traceability.ts` genera `docs/traceability.md` (storia → test → esito) dai report JSON di Vitest e Playwright. La gate **fallisce** se una storia MUST dell'incremento chiuso non ha test.

### 12.4 Quality gate (`scripts/check.sh`, documentata nel README)

```
docker compose up -d --build --wait
docker compose --profile tools run --rm tools pnpm verify
docker compose --profile e2e run --rm e2e
docker compose --profile tools run --rm tools pnpm traceability --check
```

`pnpm verify` = `format:check` (Prettier) → `lint` (ESLint, regole type-aware) → `typecheck` (`tsc --noEmit`) → `arch` (dependency-cruiser) → `guards` → `test:ci` (unit + integration + api, con copertura e soglie) → `openapi:check` → `audit` (`pnpm audit --prod --audit-level high`, con eccezioni documentate in `docs/audit-exceptions.md`; saltato solo con `CHECK_OFFLINE=1`, annotandolo).

`pnpm guards` (`scripts/guards.ts`) fallisce se trova:
- `Date.now`, `new Date()` senza argomenti o `Temporal.Now` fuori da `src/infrastructure/clock`;
- `parseFloat`, `Number(`, `toFixed` o `Math.round` in `src/domain`, `src/application`, `src/contracts` e `src/ui` (eccezioni solo in `guards.allowlist.json`, con motivazione);
- la direttiva `'use server'`;
- `TOTAL(`, `AVG(`, `AS REAL` o colonne `real(` nello schema e nel SQL;
- un trigger di `REQUIRED_TRIGGERS` assente da `db/sql/triggers.sql`;
- file `.env` versionati o un lockfile mancante.

Su Windows la gate si esegue da Git Bash o WSL. Per un ciclo veloce si può lanciare `pnpm verify` sull'host; la gate valida resta quella nei container.
````

### 5.4 Modifiche alla guida §6 (modello dati e vincoli)
- **§6.1, tabella entità:** sostituire la riga `Session` con `Session | id_hash (sha256 del token), user_id, active_role, impersonated_by, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at | Auth, impersonazione (DEC-097)`. Aggiungere le righe:
  - `Job | type, dedupe_key, payload_json, status, priority, run_at, attempts, max_attempts, locked_by, lease_until, last_error, correlation_id | Coda (DEC-092)`
  - `Outbox | channel, recipient, template, payload_json, status, attempts, next_attempt_at, message_id, sent_at | Notifiche e-mail`
  - `LeaderLease | name, holder, lease_until | Scheduler singolo`
  - `WorkerHeartbeat | worker_id, beat_at, version | /ready, US-111`
  - `IdempotencyKey | actor_id, key, route, request_hash, status, response_json | spec §10.1`
  - `SystemMeta | schema_version, seeded_at, db_epoch | bootstrap, reset`
  - `ProcedureSnapshotYear | procedure_id, year, need_cents, available_cents | Filtro per annualità (NFR-002)`
  - `ProcedureSearch (FTS5) | code, title, structure_label, supplier_name, cig, cup | Ricerca (US-011)`
  - `DocumentPage | document_id, page_no, text, method, confidence, png_path | OCR, viewer`
- **§6.1, paragrafo "Vincoli"** (sostituire): "SQLite non ha GRANT: l'audit è **append-only tramite trigger** `BEFORE UPDATE/DELETE … RAISE(ABORT,'AUDIT_APPEND_ONLY')`. Lo stesso vale per `financial_movement`, `procedure_version` (unica eccezione: l'impostazione dell'approvazione da NULL), `payment_forecast_line`, `milestone_forecast`, `alert_notification` e `validation_decision`. I trigger stanno in `db/sql/triggers.sql`, sono riapplicati dopo ogni migrazione e verificati da test e da `/ready`. Importi `*_cents INTEGER` con `CHECK (typeof(x)='integer' AND x >= 0)` (i delta con segno solo nei risultati di simulazione, in JSON come stringhe). Date `CHECK (x IS date(x))`, enum `CHECK (… IN …)`, JSON `CHECK (json_valid(x))`, coerenze di riga (`net_cents + vat_cents = gross_cents`). Le chiavi interne sono `INTEGER PRIMARY KEY`; i codici di business (`P-001`) sono `UNIQUE` e sono gli unici citati da oracle e test."
- **§6.3, endpoint:** aggiungere `POST /api/auth/logout` · `POST /api/me/active-role` · `GET /api/openapi.json` · `GET /api/docs` · `GET /api/admin/jobs/{id}`. Per `POST /api/jobs/run-checks`: risposta `202 {job_id}`. Per `GET /api/documents/{id}/pages/{n}.png`: servito dallo storage (pre-renderizzato dal worker).

### 5.5 Modifiche alla guida §10 (formati seed)
- **§10.1, elenco "File"**, aggiungere in coda: "Formati: **importi** sempre come stringa decimale a 2 cifre (`"120000.00"`); un importo `number` è rifiutato dal loader con `SEED_FORMAT_ERROR`. **Percentuali** come stringa (`"20.00"`). **Date** `"YYYY-MM-DD"`. Ogni file è validato con lo schema Zod di `src/contracts/seed/`; gli errori riportano file e percorso. `users.json` **non** contiene password: gli hash argon2id si calcolano al seed da `DEMO_PASSWORD`, con salt casuale, quindi T-002 confronta conteggi e chiavi naturali, non gli hash. `procedures.xlsx` è generato **una volta** da `scripts/generate-seed-workbook.ts` (exceljs) e versionato: importi in celle numeriche con al massimo 2 decimali (formato `#,##0.00`), date in **celle di testo ISO** (niente numeri seriali Excel); il loader converte con `Money.parse(String(n))` e rifiuta valori con più di 2 decimali."
- **§10.7, nota DEC-070:** "Documenti generati da `scripts/generate-seed-documents.ts` (DEC-070 aggiornata) e versionati con `seed/documents/SHA256SUMS`. Il n. 13 è un PDF con sola immagine (testo rasterizzato con `@napi-rs/canvas`, rumore deterministico da PRNG con seme fisso), senza layer di testo."
- **§10.1, test oracle:** "DB vuoto → seed → `run_checks(2026-10-01)`" resta; nei test si parte dal template della §12.2.

### 5.6 Modifiche alla guida §11 (piano a incrementi)
Sostituire la riga **I0**:

| Inc. | Contenuto | Storie | Sezioni oracle | Exit |
|---|---|---|---|---|
| **I0 Fondazioni** (P0) | git, pnpm, Next.js 16 + TS 6 strict, Dockerfile multi-stage e compose (`init`, `web`, `worker`, `mailpit`, profili `tools` ed `e2e`), `/health` e `/ready`, skeleton a strati + dependency-cruiser + guard, config (env Zod) e `Clock`, Drizzle + migrazioni + `db/sql/triggers.sql`, UoW SQLite (WAL, mutex, `IMMEDIATE`, lettura separata), `Money`/`divRoundHalfUp`/`MoneyString`, coda job con lease + heartbeat (worker scheletro), auth a sessione + CSRF + argon2id, 7 account, RBAC + object-level, audit append-only, error envelope, correlation ID, log JSON (pino), adapter LLM `disabled`, `bindRoute` + contratti Zod + `docs/openapi.json`, shell frontend (login, banner demo, ruolo attivo, formattazione it-IT), Vitest (template DB) + Playwright, script di quality gate, **`expected_results.json` scritto dalla §10**, generazione dei documenti seed e del workbook (TS) | US-001, 002, 003, 110 (base), 111 (base) | — | servizi healthy; test 401/403/CSRF; test di immutabilità dell'audit, anche dopo una ricreazione di tabella; test architetturale; test di lease concorrente; test schema "nessun REAL" |

Altre righe:
- **I1:** aggiungere "ricerca FTS5 (`procedure_search`) e `procedure_snapshot_year`".
- **I2:** sostituire "`run_checks` + scheduler" con "`run_checks` (CLI sincrona + job `RUN_CHECKS`) + scheduler `croner` con leader lease"; "outbox + dispatcher Mailpit" → "outbox + dispatcher nodemailer → Mailpit (at-least-once, `Message-ID` stabile)".
- **I5:** "export CSV/XLSX/PDF" → "export CSV (`csv-stringify`), XLSX (`exceljs`), PDF (`@react-pdf/renderer`)".
- **I6:** "estrazione testuale + OCR" → "estrazione testuale (`unpdf`) + OCR `tesseract.js` (`ita` locale) nel worker, pagine PNG pre-renderizzate (`@napi-rs/canvas`), ZIP con `yauzl` + limiti".
- **I7:** "reset e backup" → "reset transazionale (backup `VACUUM INTO` preventivo), `cli backup`/`restore`".
- **I8:** aggiungere "generatore TS di 1.000 procedure (`cli perf generate`), test di soak web + worker (0 `SQLITE_BUSY` lato web), hash chain dell'audit (`cli audit verify`), valutazione DEC Node 26 LTS / Drizzle 1.0".

### 5.7 Altre modifiche puntuali alla guida
- **§2.2 punto 3:** marker di tracciabilità → "`describe('[US-040] …')` / `test('[T-004] …')` (Vitest e Playwright)".
- **§2.2 punto 4:** "… → API (route handler con contratto Zod e `bindRoute`, RBAC object-level nello use case) → UI …".
- **§2.2 punto 6:** "OpenAPI" → "contratti Zod e `docs/openapi.json` (`pnpm openapi`)".
- **§2.5:** "Niente `# type: ignore`, `any` o `eslint-disable`…" → "Niente `any`, `@ts-ignore`/`@ts-expect-error` o `eslint-disable` senza un commento che lo motivi". "Non usare `date.today()`, `datetime.now()`, `Date.now()`…" → "Non usare `Date.now()`, `new Date()` senza argomenti o `Temporal.Now` nel dominio e nell'application". "Non usare `float`… né in Python né in TypeScript" → "Non usare `number` per gli importi: `Money` (dominio), `*_cents INTEGER` (DB), `MoneyString` (API/UI)". Aggiungere: "Non usare Server Actions. Non fare I/O esterno dentro `uow.write`. Non rimuovere trigger fuori da `db/sql/` e da `infrastructure/db/reset.ts`."
- **§2.6:** aggiungere "`.data/` in `.gitignore`; mai bind mount di cartelle Windows per `/data`".
- **§13, storia completata:** "OpenAPI aggiornata e tipi TS rigenerati" → "contratti Zod aggiornati e `docs/openapi.json` rigenerato".

### 5.8 Modifiche a `CLAUDE.md`
Sostituire le sezioni **Regole non negoziabili**, **Comandi** e **Ambiente** con:

```markdown
## Regole non negoziabili
- Date, importi, stati, permessi, simulazioni: **solo logica deterministica** nel dominio (`src/domain`, TS puro). Mai LLM.
- Baseline immutabile; effettivi intangibili; ogni variazione = nuova versione approvata da un umano, con audit.
- Audit e movimenti finanziari append-only (trigger SQLite in `db/sql/triggers.sql`): storni e compensazioni, mai cancellazioni. Mai rimuovere trigger fuori da `db/sql/` e da `infrastructure/db/reset.ts`.
- Importi: `Money` (centesimi `bigint`) nel dominio, `*_cents INTEGER` nel DB, stringhe `"47600.00"` in JSON. Mai `number`, mai `REAL`, mai `TOTAL`/`AVG`/divisioni SQL sugli importi, nessuna aritmetica sugli importi nella UI.
- Data di business solo dal `Clock` (`APP_REFERENCE_DATE`, default 2026-10-01). In dominio e application niente `Date.now()`, `new Date()` o `Temporal.Now`.
- RBAC e controllo object-level lato server negli use case, su ogni endpoint e su ogni lettura dei Server Component.
- Mutazioni solo tramite route handler `/api/*` con contratto Zod; Server Actions vietate. Dentro `uow.write` nessun I/O esterno.
- Nessun dato demo nei servizi; nessun segreto nel repository.
- `seed/expected_results.json` è l'oracle: non si modifica per far passare un test, solo con una DEV registrata.
- Una storia è finita solo con test automatici per ogni criterio di accettazione.

## Comandi
- Avvio: `docker compose up --build`  (sviluppo senza Docker: `pnpm install && pnpm db:bootstrap && pnpm dev`)
- Quality gate: `bash scripts/check.sh`  (ciclo veloce sull'host: `pnpm verify`)
- Test: `pnpm test` (unit+integration+api) · `pnpm test:e2e` · `pnpm test -- tests/unit/<file>`
- Reset demo: `docker compose run --rm init reset --yes`
- Backup / restore: `docker compose run --rm init backup` · restore solo a servizi fermi (vedi README)
- Run-checks a una data: `docker compose run --rm init run-checks --date 2026-10-01`
- Schema DB: `pnpm db:generate` (rivedere il SQL generato) · `pnpm db:migrate`
- OpenAPI: `pnpm openapi` (rigenera `docs/openapi.json`)

## Ambiente
Windows + Docker Desktop (WSL2). Script eseguiti nei container: fine riga LF (`.gitattributes`). Node 24 LTS, pnpm 12, TypeScript 6. DB SQLite nel volume nominato `appdata` (`/data/inapp.db`): **mai** bind mount di cartelle Windows. In sviluppo locale il DB sta in `./.data/` (ignorato da git). Web e API: http://localhost:3000 (OpenAPI: http://localhost:3000/api/docs). UI e-mail demo: Mailpit su http://localhost:8025.
```
Nella sezione "Leggi prima di lavorare", aggiungere come punto 6: "[docs/06_architettura_nextjs_sqlite.md](docs/06_architettura_nextjs_sqlite.md): motivazioni dello stack Next.js + SQLite e limiti di SQLite."

### 5.9 Nuove criticità (da aggiungere a `01_analisi_criticita.md`, nuova sezione "F — Rischi introdotti dallo stack Next.js + SQLite")

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

### 5.10 Voce per il registro decisioni (`03_registro_decisioni.md`)

```markdown
### DEV-004 — Stack Next.js fullstack + SQLite al posto di FastAPI + PostgreSQL
- Data: 2026-10-01 · Autore: riprogettazione su richiesta del cliente
- Contesto: la specifica §4.1/§4.4/§11.3 indica Python/FastAPI, PostgreSQL, worker Python, Pytest e mypy; il cliente chiede un solo stack Next.js (TypeScript) con SQLite (CR-37).
- Decisione: Next.js 16 fullstack, SQLite (better-sqlite3 + Drizzle), worker Node con lo stesso codebase, Vitest + Playwright. Principi §2.4, API §10, NFR e oracle invariati. Dettagli in docs/06_architettura_nextjs_sqlite.md e ADR-0001.
- Alternative scartate: mantenere FastAPI/PostgreSQL (rifiutato dal cliente); Next.js + PostgreSQL (più robusto, ma richiede un servizio DB in più e non rispetta la richiesta).
- Configurabile: no · Stato: DA VALIDARE (presa d'atto di INAPP dei limiti della §2.11 e del criterio di migrazione della §2.12)
- Impatto su test/oracle: nessuno sui valori attesi; cambiano strumenti e layout dei test (DEC-093).
```

---

## 6. ADR

Testo completo in [docs/adr/0001-nextjs-fullstack-sqlite.md](adr/0001-nextjs-fullstack-sqlite.md). Sintesi:
- **Contesto:** il cliente vuole un solo stack TypeScript e un DB a file, senza Python né PostgreSQL. I vincoli restano: core deterministico, importi esatti, audit append-only, RBAC object-level, avvio con un comando, test riproducibili.
- **Decisione:** Next.js 16 fullstack (route handler come unica superficie di mutazione, contratti Zod → OpenAPI), SQLite in WAL con better-sqlite3 + Drizzle, worker Node separato con coda e lease su tabella, importi in centesimi interi, Temporal per le date, sessioni custom su DB con argon2id.
- **Conseguenze:** un solo linguaggio e un solo tipo di immagine; meno servizi (niente DB server); test sul motore reale e DB di test istantanei. In cambio: un solo scrittore, nessuna sicurezza a livello DB, migrazioni con ricreazione delle tabelle, nessun tipo decimale; mitigazioni nelle CR-37…49. Per un pilota con dati reali si migra a PostgreSQL seguendo la §2.12.

---

## 7. Verifiche eseguite e fonti

**Verifiche pratiche** (01/10/2026, su questa macchina Windows 11, Node 22.16):
- `npm i better-sqlite3@13.0.3`: installato in 6 s senza compilazione; SQLite **3.53.4**; opzioni `ENABLE_FTS5`, `ENABLE_MATH_FUNCTIONS`, `DQS=0`.
- Trigger `RAISE(ABORT)`: UPDATE e DELETE rifiutati; `CHECK (d IS date(d))` rifiuta `2026-02-30`; una tabella `STRICT` rifiuta `REAL` in una colonna `INTEGER` (ma converte `'476'` in intero: per questo servono i CHECK `typeof` anche dove si usasse STRICT); `SUM` oltre `2^63` → errore `integer overflow`; FTS5 `unicode61 remove_diacritics 2`: `attivita*` trova "attività".
- Lease concorrente: 3 processi, 2.000 job, 0 doppie acquisizioni, 0 `SQLITE_BUSY`.
- Drizzle 0.45.3, sorgente `better-sqlite3/session.js`: `transaction(fn, {behavior})` → `nativeTx[behavior ?? 'deferred']`. Il default è `deferred`, quindi la UoW deve imporre `IMMEDIATE`. Nessun supporto alle tabelle `STRICT` né a `integer` in modalità `bigint`, quindi si usa `customType`.
- Registry npm: versioni della §1.16; peer dependency di typescript-eslint 8.71 (`typescript <6.1.0`) e di eslint-plugin-jsx-a11y 6.10.2 (`eslint ≤ 9`).

**Fonti**
- better-sqlite3 v13 (N-API, prebuilt nel tarball): https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0
- Next.js 16 (proxy.ts, rimozione di `next lint`): https://nextjs.org/blog/next-16
- Next.js `serverExternalPackages` (lista predefinita): https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- Auth.js, strategie di sessione (Credentials solo con JWT): https://authjs.dev/concepts/session-strategies
- Prisma 7 + SQLite (adapter better-sqlite3): https://www.prisma.io/docs/orm/core-concepts/supported-databases/sqlite
- Node.js `node:sqlite` (stabilità): https://nodejs.org/api/sqlite.html
- Node.js 26 con Temporal attivo di default, LTS dal 28/10/2026: https://www.infoq.com/news/2026/07/nodejs-26-temporal/
- Node.js `crypto.argon2` (da v24.7.0): https://nodejs.org/api/crypto.html
- tesseract.js (langPath, uso offline in Node): https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md
- unpdf (extractText, renderPageAsImage con @napi-rs/canvas): https://github.com/unjs/unpdf
- SQLite WAL (stesso host, niente filesystem di rete): https://www.sqlite.org/wal.html
- SQLite FTS5: https://www.sqlite.org/fts5.html
