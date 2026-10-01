# Piattaforma INAPP — monitoraggio, riprogrammazione e controllo finanziario (MVP demo)

MVP dimostrativo su dati **sintetici**: programmazione → memoria → alert → riprogrammazione → contratto → SAL → pagamento → impatto sulla previsione di spesa. Core deterministico; AI opzionale e disattivata di default. Stack: **Next.js fullstack (TypeScript) + SQLite**, worker Node, Mailpit (ADR-0001).

## Leggi prima di lavorare (in quest'ordine)
1. [docs/02_guida_sviluppo_agente.md](docs/02_guida_sviluppo_agente.md) — **guida operativa vincolante**: protocollo, decisioni di default (DEC), regole precise, modelli di procedura, seed/oracle, piano a incrementi. Prevale sulla specifica dove differisce.
2. [docs/04_avanzamento.md](docs/04_avanzamento.md) — stato corrente e prossimo passo.
3. [docs/03_registro_decisioni.md](docs/03_registro_decisioni.md) — decisioni e deviazioni successive.
4. [docs/00_specifica_originale_v1_0.md](docs/00_specifica_originale_v1_0.md) — storie, criteri di accettazione, NFR. Consulta la sezione della storia su cui lavori.
5. [docs/07_design_brand_identity.md](docs/07_design_brand_identity.md) + `docs/design/tokens.css` — **vincolanti per qualsiasi lavoro di UI**.
6. Contesto, da consultare quando serve:
   - [01_analisi_criticita.md](docs/01_analisi_criticita.md) — perché la guida si discosta dalla specifica (CR-xx);
   - [05_analisi_documenti_reali.md](docs/05_analisi_documenti_reali.md) — processo reale, import del workbook, estrazione dagli atti;
   - [06_architettura_nextjs_sqlite.md](docs/06_architettura_nextjs_sqlite.md) — motivazioni dello stack e limiti di SQLite;
   - [08_risposte_criticita.md](docs/08_risposte_criticita.md) — fonti normative.

## Regole non negoziabili
- Date, importi, stati, permessi e simulazioni: **solo logica deterministica** nel dominio (`src/domain`, TS puro). Mai LLM.
- Baseline immutabile; effettivi intangibili; ogni variazione è una nuova versione approvata da un umano, con audit.
- Audit e movimenti finanziari append-only (trigger SQLite in `db/sql/triggers.sql`): storni e compensazioni, mai cancellazioni. I trigger si rimuovono solo da `db/sql/` e da `infrastructure/db/reset.ts`.
- Importi: `Money` (centesimi `bigint`) nel dominio, `*_cents INTEGER` nel DB, stringhe `"47600.00"` in JSON. Mai `number`, mai `REAL`, mai `TOTAL`/`AVG`/divisioni SQL sugli importi, nessuna aritmetica sugli importi nella UI.
- Data di business solo dal `Clock` (`APP_REFERENCE_DATE`, default 2026-10-01). In dominio e application niente `Date.now()`, `new Date()` o `Temporal.Now`.
- RBAC e controllo object-level lato server negli use case, su ogni endpoint e su ogni lettura dei Server Component.
- Mutazioni solo tramite route handler `/api/*` con contratto Zod; Server Actions vietate. Dentro `uow.write` nessun I/O esterno.
- **Dati reali INAPP**: su indicazione del cliente si usano nella demo (DEC-071). Le copie versionate stanno in `seed/inapp/`; gli originali nella radice restano esclusi da git. `DEMO_DATASET=inapp` (default) carica il portafoglio reale; `DEMO_DATASET=scenarios` carica le 12 procedure dell'oracle usate da test e DoD.
- **Logo e colori INAPP** obbligatori (DEC-081): logo bianco in `public/brand/`, palette di `docs/design/tokens.css`.
- Nessun dato demo nei servizi; nessun segreto nel repository.
- `seed/expected_results.json` è l'oracle: non si modifica per far passare un test, solo con una DEV registrata.
- Una storia è finita solo con test automatici per ogni criterio di accettazione.

## Lavoro autonomo
- Non fermarti per le ambiguità: applica la guida §2.3 (DEC → specifica → default configurabile `DA VALIDARE` + voce nel registro).
- Fermati e chiedi solo nei casi della guida §2.4.
- Un incremento alla volta (guida §11). Commit piccoli `feat(US-0xx): …`; tag `inc-I<n>` a fine incremento.
- Aggiorna `docs/04_avanzamento.md` a ogni storia completata e a fine sessione.

## Comandi
<!-- Da creare in I0; mantenerli allineati al README. -->
- Avvio: `docker compose up --build` (sviluppo senza Docker: `pnpm install && pnpm db:bootstrap && pnpm dev`)
- Quality gate: `bash scripts/check.sh` (ciclo veloce sull'host: `pnpm verify`)
- Test: `pnpm test` (unit + integration + api) · `pnpm test:e2e` · `pnpm test -- tests/unit/<file>`
- Reset demo: `docker compose run --rm init reset --yes`
- Backup / restore: `docker compose run --rm init backup` · restore solo a servizi fermi (vedi README)
- Run-checks a una data: `docker compose run --rm init run-checks --date 2026-10-01`
- Schema DB: `pnpm db:generate` (rivedere il SQL generato) · `pnpm db:migrate`
- OpenAPI: `pnpm openapi` (rigenera `docs/openapi.json`)

## Ambiente
- Windows; **Docker non installato** su questa macchina (DEC-100): sviluppo e collaudo in locale con Node 22 + pnpm 10; i file Docker vanno scritti ma collaudati quando Docker sarà disponibile. Gli script girano nei container: fine riga LF (`.gitattributes`).
- Node 24 LTS, pnpm 12, TypeScript 6.
- DB SQLite nel volume nominato `appdata` (`/data/inapp.db`): **mai** bind mount di cartelle Windows. In sviluppo locale il DB sta in `./.data/`, ignorato da git.
- Indirizzi locali:
  - web e API: http://localhost:3000;
  - OpenAPI: http://localhost:3000/api/docs;
  - UI e-mail demo (Mailpit): http://localhost:8025.
