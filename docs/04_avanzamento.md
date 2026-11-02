# Avanzamento sviluppo

> Memoria di lavoro dell'agente tra sessioni (guida §2.7). Aggiornare a ogni storia completata e a fine sessione.
> Stati: `TODO` · `IN_CORSO` · `FATTO` (test verdi + commit) · `PARZIALE` · `BLOCCATO`

## Stato corrente
- **Incremento corrente:** I8 Hardening. I0–I7 completati in locale.
- **Ultimo passo completato:** processo INAPP del Modulo 1 (DEC-107: modelli M1 per corsia, operatore invitato, prenotazioni/impegni, aggiudicazione e controfirma, scheda Iter, barra delle fasi), Modulo 2 nascosto nella demo (DEC-108), guida con percorso per fasi su BZ-001 e casi CD-01…CD-08.
- **Prossimo passo:** validazione con INAPP dei modelli del Modulo 1 (durate dei passi, varianti A/B, aliquota IVA 22% nell'aggiudicazione) e delle altre voci `DA VALIDARE`; suite di test su un database Postgres dedicato (DEC-117); Modulo 2 (esecuzione e rendicontazione) quando richiesto; dizionari modificabili (US-103).
- **Blocchi aperti:** nessun blocco. Docker non è più usato (DEC-117). Il worker (e-mail) non gira su Vercel: gli alert restano visibili nell'app. La suite di test non è stata rieseguita su Postgres.
- **Ultima modifica (2026-11-03, DEC-111, incremento 6):** assistente alla memoria opzionale e spento di default: schema di testo locale e deterministico proposto alla Struttura, attivabile da Amministrazione, nessun LLM reale (in attesa di D-07); DEC-111 completato nelle sue sei richieste. In precedenza (2026-11-03, DEC-111, incremento 5): KPI per gara e importi di gara: pagina «KPI gare» con base di gara, aggiudicato, ribasso e programmato per gara, totali e filtri per progetto e fase; In precedenza (2026-11-03, DEC-111, incremento 4): ogni gara è collegata a un progetto (Operazione/Attività): tabella `projects`, scelta nella bozza, filtro nel portafoglio, aggiunta di progetti in Amministrazione; In precedenza (2026-11-03, DEC-111, incremento 3): alert alla Struttura sulla memoria per tipo di procedura: policy `MEMORY_SHORT`, `MEMORY` e `MEMORY_LONG` scelte dal modello M1 in base alla durata, livelli visibili in Amministrazione › Modelli; In precedenza (2026-11-03, DEC-111, incremento 2): capitolato insieme alla memoria: due caricamenti nel modulo di consegna, elenco dei documenti presenti, consegna bloccata senza capitolato per le bozze con quadro economico; In precedenza (2026-11-02, DEC-117): demo pubblicata su Vercel (Postgres Neon, Vercel Blob); Docker rimosso; scritture asincrone delle rotte API attese; guida demo con avviso quando la pratica non è al passo mostrato; modulo del passo in corso che si azzera. In precedenza (2026-10-15, DEC-111, incremento 1): quadro economico della bozza (base di gara, IVA, tassa gara, DEC e incentivi) calcolato prima della memoria; prossimo passo: capitolato insieme alla memoria (incremento 2). In precedenza (2026-10-12, DEC-110): approvazione, rifiuto e override delle riprogrammazioni passano dal Direttore Generale all'Ufficio Gare (CD-05 e CD-06 proposte dall'Amministrazione); in precedenza (2026-10-06, DEC-109): ruolo Validatore soppresso, coda di validazione tolta, correzione della classificazione dei documenti a Ufficio Gare e admin, passi in demo all'admin; scheda procedura con sole schede Iter, Documenti e Audit.
- **Quality gate:** `pnpm verify` (typecheck + guard + 80 test) e `pnpm test:e2e` (19 test Playwright + axe: demo script sul dataset di collaudo, guide e percorso per fasi completo sul dataset reale) verdi.

## Note di sessione
- 2026-10-01 — Integrati 05/06/07/08 nella guida (v1.1). Oracle ricontrollato: invariato.
- 2026-10-01/02 — Su indicazione del cliente: logo e dati reali INAPP (DEV-007). Implementati I0–I5; import del workbook reale (82 procedure) e fascicolo reale associato per CIG a OP04-S18. Comandi: `pnpm db:bootstrap`, `pnpm dev`, `pnpm worker`, `pnpm test`, `pnpm cli reset --yes --dataset scenarios`.
- 2026-10-02 — Guida demo per i 7 attori (pagina `/guida`, pannello «Guida demo», aiuto di pagina) e casi dimostrativi inventati (DEC-105/106). Corretti termine SAL fisso a 15 giorni, rigetto SAL del RUP, storno pagamenti in UI, codici dell'assistente.
- 2026-10-02 — Su indicazione del cliente la demo segue lo schema di processo INAPP (`docs/design/schema-processo-inapp.webp`): Modulo 1 implementato (DEC-107), Modulo 2 nascosto (DEC-108); casi dimostrativi riscritti per fase.
- 2026-10-23…11-02 — Porting a Postgres e pubblicazione su Vercel (DEC-112…DEC-117): database `pg`, trigger PL/pgSQL, storage Blob, `await` mancanti nelle rotte, `APP_ALLOWED_ORIGINS` e `COOKIE_SECURE`, dataset `inapp` nel bundle, avviso di disallineamento nella guida demo, Docker rimosso. Da fare: database di test dedicato per la suite.
- Problema noto dell'ambiente: gli heredoc annidati nella shell dello strumento falliscono con testo contenente apostrofi; usare file Python o lo strumento di scrittura.

## Incrementi
| Inc. | Stato | Note |
|---|---|---|
| I0 Fondazioni | FATTO | auth a sessione, CSRF, RBAC object-level, audit hash chain, /health /ready, CLI, worker |
| I1 Portafoglio e cronoprogramma | FATTO | modelli YAML, calendario, seed idempotente, import workbook reale, versioni V3/V4, ricerca full-text |
| I2 Alert e anomalie | FATTO | policy T-1M…T+1, notifiche 17/19 sull'oracle, anomalie, centro alert |
| I3 Riprogrammazione | FATTO | simulazione, alternative, 4 occhi, override, STALE, wizard 5 passi |
| I4 Contratti e SAL | FATTO | transizioni SAL, fatture, liquidazioni, pagamenti parziali, storni, annullamento/rilascio |
| I5 Dashboard, validazione, audit | FATTO | KPI, export CSV/XLSX/PDF auditati, coda di validazione, audit |
| I6 Documenti | FATTO | OCR locale (tesseract.js, ita versionato), upload/ZIP protetti, estrazione campi → validazione, 22 PDF sintetici con hash stabili |
| I7 Assistente e amministrazione | FATTO (US-103 parziale) | assistente, bozza e consegna memoria, soglie e festività, consultazione modelli, utenti/ruoli/ambiti, reset, impersonazione |
| I8 Hardening e consegna | PARZIALE | guida demo per attore e casi dimostrativi (DEC-105/106); E2E (18 test + axe), prestazioni 1.000 procedure (p95 portafoglio 2,2 ms; simulazione 0,9 ms); manca il collaudo Docker/Mailpit |

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
