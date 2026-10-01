# Piattaforma INAPP – Monitoraggio Gare e Contratti (MVP dimostrativo)

Prototipo dimostrativo per INAPP: programmazione → memoria → alert → riprogrammazione → contratto → SAL → pagamento → impatto sulla previsione di spesa. Next.js fullstack + SQLite, core deterministico, IA disattivata.

> **Ambiente DEMO** – data di riferimento configurata (default 01/10/2026). Non è un servizio ufficiale INAPP.

## Avvio rapido (senza Docker)
Prerequisiti: Node ≥ 22.12, pnpm 10.

```bash
pnpm install
pnpm db:bootstrap   # migrazioni + seed se il DB è vuoto (DB in ./.data/inapp.db)
pnpm dev            # http://localhost:3000
pnpm worker         # in un secondo terminale: run_checks periodico + invio e-mail
```

Con Docker (non collaudato su questa macchina, DEC-100): `docker compose up --build`.

## Dataset
| `DEMO_DATASET` | Contenuto |
|---|---|
| `inapp` (default) | Portafoglio reale PN Giovani, Donne e Lavoro (foglio `Gare_23-27`, 82 procedure) e fascicolo reale associato per CIG a OP04-S18 |
| `scenarios` | 12 procedure P-001…P-012: oracle dei test e del demo script (guida §10) |

Cambio dataset: Amministrazione → Reset demo, oppure `pnpm cli reset --yes --dataset scenarios`.

## Utenti demo (password `Demo2026!`, configurabile con `DEMO_PASSWORD`)
| Utente | Ruolo |
|---|---|
| `dirigente` | Direttore Generale: approva/rifiuta riprogrammazioni, override |
| `gare` | Ufficio Gare (RUP): simulazioni, contratti, SAL |
| `amministrazione` | Amministrazione: fatture, liquidazioni, pagamenti |
| `struttura.si` | Struttura Sistemi informativi (vede solo la propria struttura) |
| `validatore` | Coda di validazione, audit |
| `fornitore.alfa` | Fornitore: solo il contratto assegnato (P-004 nel dataset scenarios) |
| `admin` | Configurazione, data di riferimento, reset, impersonazione |

## Comandi
| Comando | Effetto |
|---|---|
| `pnpm test` | Test unit, integration, API (Vitest; oracle su SQLite reale) |
| `pnpm verify` | Typecheck + guard + test |
| `pnpm cli run-checks --date 2026-10-15` | Ricalcolo a una data |
| `pnpm cli audit-verify` | Verifica della catena di hash dell'audit e dei trigger |
| `pnpm cli backup` | Backup `VACUUM INTO` |
| `pnpm db:reset` | Reset del dataset |

## Endpoint tecnici
`/health`, `/ready` (DB, seed, trigger), API REST sotto `/api/*` (errori nell'envelope della spec §10.2).

## Documentazione
Vedi `CLAUDE.md` e `docs/` (guida operativa v1.1, specifica, analisi, registro decisioni, design).

## Demo script (dataset `scenarios`, 10–15 minuti)
1. Accedi come `dirigente`: dashboard, data di riferimento, KPI (12 procedure, 4 in ritardo, 3 da riprogrammare, a rischio 612.000 €).
2. Portafoglio → filtro Rosso + 2027.
3. P-001: alert memoria T-5, destinatario Struttura, e-mail in outbox.
4. Accedi come `gare` → P-002 → *Avvia simulazione*: memoria al 16/11/2026 → 150.000 € spostati, eccedenza 2027 di 80.000 € (bloccante). Invia ad approvazione.
5. Accedi come `dirigente` → P-002 → Simulazioni: confronta con la bozza automatica (12/10, nessuno spostamento) e approva; nuova versione, baseline intatta, audit.
6. P-004 → Finanza: piano 20/50/30, pagato 47.600 €, residuo 190.400 €.
7. Come `amministrazione` su P-009: pagamento oltre il liquidato → rifiuto con importo massimo.
8. Assistente: «Quanto è stato pagato su P-004?» con fonti.
