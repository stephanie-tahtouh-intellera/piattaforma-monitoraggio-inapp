# Piattaforma INAPP – Monitoraggio Gare e Contratti (MVP dimostrativo)

Prototipo dimostrativo per INAPP: programmazione → memoria → alert → riprogrammazione → contratto → SAL → pagamento → impatto sulla previsione di spesa. Next.js fullstack + Postgres (Vercel Postgres/Neon), core deterministico, IA disattivata.

> **Ambiente DEMO** – data di riferimento configurata (default 01/10/2026). Non è un servizio ufficiale INAPP.

## Avvio rapido
Prerequisiti: Node ≥ 22.12, pnpm 10 e un database Postgres raggiungibile.

```bash
pnpm install
pnpm db:bootstrap   # migrazioni + seed se il DB è vuoto
pnpm dev            # http://localhost:3000
pnpm worker         # in un secondo terminale: run_checks periodico + invio e-mail
```

Crea `.env` a partire da `.env.example` e configura `POSTGRES_URL` prima del bootstrap. In locale, senza `BLOB_READ_WRITE_TOKEN`, i documenti caricati sono salvati in `.data/storage`. Il worker invia e-mail solo se è configurato un server SMTP (Mailpit in locale); in sua assenza gli alert restano consultabili nell'app.

## Dataset
| `DEMO_DATASET` | Contenuto |
|---|---|
| `inapp` (default) | Portafoglio reale PN Giovani, Donne e Lavoro (foglio `Gare_23-27`, 82 procedure), fascicolo reale associato per CIG a OP04-S18 e 9 casi dimostrativi inventati (BZ-001, CD-01…CD-08) fermi a passi diversi del Modulo 1 |
| `scenarios` | 12 procedure P-001…P-012: oracle dei test e del demo script (guida §10) |

Cambio dataset: Amministrazione → Reset demo, oppure `pnpm cli reset --yes --dataset scenarios`. Su Vercel usare `DEMO_DATASET=scenarios`; il dataset `inapp` contiene dati e documenti reali forniti per lo sviluppo e non va esposto nella demo pubblica.

## Utenti demo (password `Demo2026!`, configurabile con `DEMO_PASSWORD`)
| Utente | Ruolo |
|---|---|
| `dirigente` | Direttore Generale: visione d'insieme, firma le determine (non decide le riprogrammazioni, DEC-110) |
| `gare` | Ufficio Gare (RUP): simulazioni, contratti, SAL |
| `amministrazione` | Amministrazione: fatture, liquidazioni, pagamenti |
| `struttura.si` | Struttura Sistemi informativi (vede solo la propria struttura) |
| `fornitore.alfa` | Fornitore: pratiche in cui è operatore o contraente (CD-04, CD-07; P-004 nel dataset scenarios) |
| `admin` | Configurazione, data di riferimento, reset, impersonazione; registra i passi in demo per conto dell'owner |

## Comandi
| Comando | Effetto |
|---|---|
| `pnpm test` | Test unit, integration, API (Vitest; **svuota tutte le tabelle del Postgres indicato da `POSTGRES_URL`**) |
| `pnpm verify` | Typecheck + guard + test; ha lo stesso effetto distruttivo di `pnpm test` sul database configurato |
| `pnpm test:e2e` | E2E Playwright; prima dei test svuota il Postgres indicato da `POSTGRES_URL` |
| `pnpm cli run-checks --date 2026-10-15` | Ricalcolo a una data |
| `pnpm cli audit-verify` | Verifica della catena di hash dell'audit e dei trigger |
| `pnpm db:reset` | Reset del dataset |

**Attenzione:** non eseguire `pnpm test`, `pnpm verify` o `pnpm test:e2e` se `POSTGRES_URL` punta al database della demo o a un database con dati da conservare: i test lo svuotano. Il database di test deve essere isolato e sacrificabile. Il requisito di usare un solo database fra locale, test e Vercel è in conflitto con questo comportamento e resta da risolvere (DEC-115, DEC-117).

## Endpoint tecnici
`/health`, `/ready` (DB, seed, trigger), API REST sotto `/api/*` (errori nell'envelope della spec §10.2).

## Richieste INAPP
1. Quadro economico della bozza prima della memoria: importo contrattuale IVA inclusa e tassa di gara concorrono all'importo a disposizione della Struttura. DEC e incentivi non sono più calcolati nelle nuove bozze.
2. Collegamento obbligatorio della gara a un progetto quando il catalogo progetti è disponibile.
3. Consegna del capitolato insieme alla memoria; il vincolo attuale si applica alle bozze con quadro economico.
4. Assistente per la redazione della memoria: al momento propone solo uno schema deterministico, è disattivato di default e non usa un LLM.
5. Alert per la consegna della memoria configurati in base al modello/tipo di procedura.
6. KPI e importi di gara (base d'asta, aggiudicato, ribasso, spesa su gara competitiva, giorni indizione → aggiudicazione) integrati nella dashboard, filtrabili per tipo di gara e struttura (DEC-120).
7. Revisione degli indicatori della dashboard iniziale: **da definire con INAPP**. La dashboard attuale mostra già indicatori fisici e finanziari, ma l'elenco richiesto dal cliente non è ancora stato validato.

Dettagli, assunzioni e test delle richieste sono registrati in [DEC-111](docs/03_registro_decisioni.md) e [DEC-118](docs/03_registro_decisioni.md); avanzamento e questioni aperte in [04_avanzamento.md](docs/04_avanzamento.md).

## Documentazione
Vedi `CLAUDE.md` e `docs/` (guida operativa v1.2, specifica, analisi, registro decisioni, design).

## Guida demo (dataset `inapp`)
La demo segue lo schema di processo INAPP (`docs/design/schema-processo-inapp.webp`), **Modulo 1**: dalla programmazione alla stipula, su quattro corsie (Struttura richiedente, Ufficio Gare, Amministrazione / Contabilità, Fornitore). Il Modulo 2 (esecuzione e rendicontazione) è nascosto (Amministrazione → Moduli visibili).
- **Percorso per fasi** (pagina `/guida`, 17 passi): porta la bozza BZ-001 dal piano alla controfirma del contratto; quando il passo tocca a un'altra corsia il pannello propone «Accedi come … e continua».
- **Percorsi per attore**: le attività di ciascun ruolo sui casi CD-01…CD-08, fermi a passi diversi del Modulo 1.
- **Scheda Iter** di ogni procedura: vista a corsie con il passo in corso, a chi tocca e il modulo per registrarlo.
- «Aiuto pagina»: sezioni della pagina corrente e azioni consentite al ruolo attivo. Avvio al login: `/login?utente=gare&guida=1`.
- Fra una presentazione e l'altra: Amministrazione → Reset demo.

## Demo script (dataset `scenarios`, 10–15 minuti)
1. Accedi come `dirigente`: dashboard, data di riferimento, KPI (12 procedure, 4 in ritardo, 3 da riprogrammare, a rischio 612.000 €).
2. Portafoglio → filtro Rosso + 2027.
3. P-001: alert memoria T-5, destinatario Struttura, e-mail in outbox.
4. Accedi come `gare` → P-002 → *Avvia simulazione*: memoria al 16/11/2026 → 150.000 € spostati, eccedenza 2027 di 80.000 € (bloccante). Invia ad approvazione.
5. Accedi come `gare` → P-002 → Simulazioni: confronta con la bozza automatica (12/10, nessuno spostamento) e approva; nuova versione, baseline intatta, audit (DEC-110).
6. P-004 → Finanza: piano 20/50/30, pagato 47.600 €, residuo 190.400 €.
7. Come `amministrazione` su P-009: pagamento oltre il liquidato → rifiuto con importo massimo.
8. Assistente: «Quanto è stato pagato su P-004?» con fonti.
