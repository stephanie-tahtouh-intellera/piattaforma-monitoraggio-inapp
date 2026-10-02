# Avanzamento sviluppo

> Memoria di lavoro dell'agente tra sessioni (guida §2.7). Aggiornare a ogni storia completata e a fine sessione.
> Stati: `TODO` · `IN_CORSO` · `FATTO` (test verdi + commit) · `PARZIALE` · `BLOCCATO`

## Stato corrente
- **Incremento corrente:** I8 Hardening. I0–I7 completati in locale.
- **Ultimo passo completato:** app Next.js completa del vertical slice (dashboard, portafoglio, scheda a 7 tab, wizard di riprogrammazione, centro alert, validazione, assistente, audit, amministrazione), 49 route, export, worker; 61 test verdi; `next build` verde.
- **Prossimo passo:** collaudo con Docker e Mailpit quando disponibili (DEC-100); dizionari modificabili (US-103, oggi etichette nel codice); validazione con INAPP delle voci `DA VALIDARE`.
- **Blocchi aperti:** Docker non installato (DEC-100): `Dockerfile` e `docker-compose.yml` scritti ma non collaudati. Mailpit non presente in locale: le e-mail restano in outbox (visibili in Amministrazione).
- **Quality gate:** `pnpm verify` (typecheck + guard + 72 test) e `pnpm test:e2e` (8 test Playwright + axe) verdi.

## Note di sessione
- 2026-10-01 — Integrati 05/06/07/08 nella guida (v1.1). Oracle ricontrollato: invariato.
- 2026-10-01/02 — Su indicazione del cliente: logo e dati reali INAPP (DEV-007). Implementati I0–I5; import del workbook reale (82 procedure) e fascicolo reale associato per CIG a OP04-S18. Comandi: `pnpm db:bootstrap`, `pnpm dev`, `pnpm worker`, `pnpm test`, `pnpm cli reset --yes --dataset scenarios`.
- Problema noto dell'ambiente: gli heredoc annidati nella shell dello strumento falliscono con testo contenente apostrofi; usare file Python o lo strumento di scrittura.

## Incrementi
| Inc. | Stato | Note |
|---|---|---|
| I0 Fondazioni | FATTO | auth a sessione, CSRF, RBAC object-level, audit hash chain, /health /ready, CLI, worker. Docker non collaudato |
| I1 Portafoglio e cronoprogramma | FATTO | modelli YAML, calendario, seed idempotente, import workbook reale, versioni V3/V4, FTS5 |
| I2 Alert e anomalie | FATTO | policy T-1M…T+1, notifiche 17/19 sull'oracle, anomalie, centro alert |
| I3 Riprogrammazione | FATTO | simulazione, alternative, 4 occhi, override, STALE, wizard 5 passi |
| I4 Contratti e SAL | FATTO | transizioni SAL, fatture, liquidazioni, pagamenti parziali, storni, annullamento/rilascio |
| I5 Dashboard, validazione, audit | FATTO | KPI, export CSV/XLSX/PDF auditati, coda di validazione, audit |
| I6 Documenti | FATTO | OCR locale (tesseract.js, ita versionato), upload/ZIP protetti, estrazione campi → validazione, 22 PDF sintetici con hash stabili |
| I7 Assistente e amministrazione | FATTO (US-103 parziale) | assistente, bozza e consegna memoria, soglie e festività, consultazione modelli, utenti/ruoli/ambiti, reset, impersonazione |
| I8 Hardening e consegna | PARZIALE | E2E (8 test + axe), prestazioni 1.000 procedure (p95 portafoglio 2,2 ms; simulazione 0,9 ms); manca il collaudo Docker/Mailpit |

## Test di collaudo
| Test | Stato | Dove |
|---|---|---|
| T-001 Avvio e seed | FATTO (locale) | tests/integration/oracle-db |
| T-002 Reimport | FATTO | oracle-db |
| T-003 Filtri | FATTO | tests/api/commands |
| T-004 Reminder T-5 | FATTO | oracle-db |
| T-005 Memoria scaduta | FATTO | oracle-db |
| T-006 / T-007 Simulazione P-002 | FATTO | oracle-engine, commands |
| T-008 Finanza P-008 | FATTO | oracle-engine, commands |
| T-009 Approva | FATTO | commands |
| T-010 Rifiuta | FATTO | commands |
| T-011 Contratto P-004 | FATTO | commands |
| T-012 Pagamento parziale | FATTO | commands |
| T-013 SAL P-010 | FATTO | oracle-db |
| T-014 Doc P-007 | FATTO | oracle-db |
| T-015 OCR | FATTO | tests/integration/documents |
| T-016 Data impossibile | FATTO | documents (DATE_IMPOSSIBLE) |
| T-017 Permessi | FATTO | commands |
| T-018 Audit correzione | FATTO | commands |
| T-019 Assistente P-004 | FATTO | assistant-exports |
| T-020 Assistente portafoglio | FATTO | assistant-exports |
| T-021 AI off | FATTO | assistant-exports (nessun provider) |
| T-022 Reset demo | FATTO | tests/integration/perf-reset |
| T-023 Export | FATTO | assistant-exports |
| T-024 Vincolo pagamento | FATTO | commands |
| T-025 KPI | FATTO | oracle-engine, commands |
