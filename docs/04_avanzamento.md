# Avanzamento sviluppo

> Memoria di lavoro dell'agente tra sessioni (guida §2.7). Aggiornare a ogni storia completata e a fine sessione.
> Stati: `TODO` · `IN_CORSO` · `FATTO` (test verdi + commit) · `BLOCCATO` (motivo nelle note)

## Stato corrente
- **Incremento corrente:** I0 — Fondazioni
- **Ultimo passo completato:** documentazione di avvio, guida v1.1 (con 05 documenti reali, 06 Next.js + SQLite, 07 design, 08 risposte alle criticità)
- **Prossimo passo:** I0 → `git init` (controllare con `git status` che `Documenti Gara/` e il workbook **non** siano in stage), scheletro Next.js + SQLite, docker-compose, `expected_results.json` dalla guida §10
- **Blocchi aperti:** nessuno. Restano da validare con INAPP le voci `DA VALIDARE` e la domanda §8 di 08.
- **Quality gate:** non ancora disponibile

## Note di sessione
<!-- AAAA-MM-GG — cosa è stato fatto, cosa resta, comandi o problemi scoperti -->
- 2026-10-01 — Integrati 05/06/07/08 nella guida (v1.1), in `CLAUDE.md` e nel registro (DEV-004…006). Oracle ricontrollato: invariato. `.gitignore` creato con l'esclusione dei documenti reali.

## Incrementi
| Inc. | Stato | Tag | Note |
|---|---|---|---|
| I0 Fondazioni | TODO | | |
| I1 Portafoglio e cronoprogramma | TODO | | |
| I2 Alert e anomalie | TODO | | |
| I3 Riprogrammazione | TODO | | |
| I4 Contratti e SAL | TODO | | |
| I5 Dashboard, validazione, audit | TODO | | |
| I6 Documenti | TODO | | |
| I7 Assistente e amministrazione | TODO | | |
| I8 Hardening e consegna | TODO | | |

## Storie
| Storia | Titolo breve | Priorità | Inc. | Stato | Test |
|---|---|---|---|---|---|
| US-001 | Avvio locale riproducibile | MUST | I0 | TODO | |
| US-002 | Accesso demo e cambio ruolo | MUST | I0 | TODO | |
| US-003 | RBAC e audit | MUST | I0 | TODO | |
| US-010 | Caricamento portafoglio | MUST | I1 | TODO | |
| US-011 | Elenco con ricerca e filtri | MUST | I1 | TODO | |
| US-012 | Baseline / previsione / effettivo | MUST | I1 | TODO | |
| US-013 | Bozza e versione procedura | SHOULD* | I1 | TODO | |
| US-020 | Acquisizione cartella/ZIP | MUST | I6 | TODO | |
| US-021 | Associazione automatica documenti | MUST | I6 | TODO | |
| US-022 | Estrazione campi + OCR | MUST | I6 | TODO | |
| US-023 | Validazione, correzione, conflitti | MUST | I6 | TODO | |
| US-030 | Cronoprogramma da modello | MUST | I1 | TODO | |
| US-031 | Milestone previste/effettive | MUST | I1 | TODO | |
| US-032 | Fase e health | MUST | I1/I2 | TODO | |
| US-033 | Passaggio di responsabilità | MUST | I1 | TODO | |
| US-040 | Reminder T-5 memoria | MUST | I2 | TODO | |
| US-041 | Escalation progressiva | MUST | I2 | TODO | |
| US-042 | Centro alert | MUST | I2 | TODO | |
| US-043 | Presa in carico e risoluzione | MUST | I2 | TODO | |
| US-050 | Apertura riprogrammazione | MUST | I3 | TODO | |
| US-051 | Simulazione nuove date | MUST | I3 | TODO | |
| US-052 | Ricalcolo SAL/pagamenti/annualità | MUST | I3 | TODO | |
| US-053 | Criticità finanziarie e temporali | MUST | I3 | TODO | |
| US-054 | Confronto e approvazione | MUST | I3 | TODO | |
| US-060 | Contratto | MUST | I4 | TODO | |
| US-061 | Disponibilità per annualità | MUST | I3/I4 | TODO | |
| US-062 | Piano SAL e pagamenti | MUST | I4 | TODO | |
| US-063 | Avanzamento SAL | MUST | I4 | TODO | |
| US-064 | Liquidazioni e pagamenti parziali | MUST | I4 | TODO | |
| US-065 | Riconciliazione e previsione | MUST | I4 | TODO | |
| US-070 | Dashboard direzionale | MUST | I5 | TODO | |
| US-071 | Dashboard operativa | MUST | I5 | TODO | |
| US-072 | Scheda procedura | MUST | I1/I5 | TODO | |
| US-073 | Export | SHOULD | I5 | TODO | |
| US-080 | Coda di validazione | MUST | I5 | TODO | |
| US-081 | Provenienza e fonte | MUST | I5/I6 | TODO | |
| US-082 | Audit e versioni | MUST | I5 | TODO | |
| US-083 | Anomalie | MUST | I2 | TODO | |
| US-090 | Assistente: singola procedura | SHOULD* | I7 | TODO | |
| US-091 | Assistente: portafoglio | SHOULD* | I7 | TODO | |
| US-092 | Assistente sicuro e resiliente | MUST | I7 | TODO | |
| US-100 | Modelli di procedura | MUST | I1/I7 | TODO | |
| US-101 | Calendari, soglie, escalation | MUST | I1/I7 | TODO | |
| US-102 | Utenti, ruoli, ambiti | SHOULD | I7 | TODO | |
| US-103 | Dizionari e gerarchia fonti | SHOULD | I7 | TODO | |
| US-110 | Core senza AI | MUST | I0/I7 | TODO | |
| US-111 | Health check, log, metriche | MUST | I0/I7 | TODO | |
| US-112 | Reset, backup, protezione upload | MUST | I6/I7 | TODO | |

\* SHOULD nella specifica ma necessarie per il DoD (CR-18): trattarle come MUST.

## Test di collaudo
| Test | Inc. | Stato |
|---|---|---|
| T-001 Avvio e seed | I1 | TODO |
| T-002 Reimport | I1 | TODO |
| T-003 Filtri | I1 | TODO |
| T-004 Reminder T-5 | I2 | TODO |
| T-005 Memoria scaduta | I2 | TODO |
| T-006 Simulazione date | I3 | TODO |
| T-007 Finanza P-002 | I3 | TODO |
| T-008 Finanza P-008 | I3 | TODO |
| T-009 Approva piano | I3 | TODO |
| T-010 Rifiuta piano | I3 | TODO |
| T-011 Contratto P-004 | I4 | TODO |
| T-012 Pagamento parziale | I4 | TODO |
| T-013 SAL P-010 | I2/I4 | TODO |
| T-014 Doc P-007 | I2 | TODO |
| T-015 OCR | I6 | TODO |
| T-016 Conflitto data | I6 | TODO |
| T-017 Permessi | I0/I1 | TODO |
| T-018 Audit | I5 | TODO |
| T-019 Assistente P-004 | I7 | TODO |
| T-020 Assistente portafoglio | I7 | TODO |
| T-021 AI off | I7 | TODO |
| T-022 Reset demo | I7 | TODO |
| T-023 Export | I5 | TODO |
| T-024 Vincolo pagamento | I4 | TODO |
| T-025 KPI | I5 | TODO |
