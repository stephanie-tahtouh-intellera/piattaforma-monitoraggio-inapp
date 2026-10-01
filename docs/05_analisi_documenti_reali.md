# Analisi dei documenti reali INAPP — riscontri per specifica e guida

> **Stato:** analisi preliminare, **non vincolante** finché le proposte della §6 non vengono integrate in [02_guida_sviluppo_agente.md](02_guida_sviluppo_agente.md) e registrate in [03_registro_decisioni.md](03_registro_decisioni.md).
> **Fonti analizzate:** il workbook di programmazione `04_09_26_Elenco_Prodotti_Gare_Esperti - PN GDL.xlsx` e i sei atti della cartella `Documenti Gara/` (memoria, documento tecnico, determina di indizione, determina di aggiudicazione, contratto, addendum), tutti relativi a **una sola procedura reale** (affidamento diretto tramite ODA MePA di servizi ICT, ≈ 98 k€ netti / ≈ 120 k€ lordi).
> **Privacy:** il documento non riporta nomi di persone, firme, codici fiscali, partite IVA, indirizzi, CIG/CUP, numeri di registro o d'ordine reali. L'operatore economico è indicato come **"Operatore A"**; gli importi della procedura sono arrotondati. I totali del workbook sono aggregati e arrotondati.
> **Metodo:** workbook letto con `openpyxl` (formule e valori in cache); PDF analizzati con PyMuPDF (text layer, font, immagini, firme, allegati). Gli atti privi di text layer sono stati letti dal rendering delle pagine (non è disponibile un OCR locale).

## Indice
1. [Sintesi](#1-sintesi)
2. [Workbook di programmazione](#2-workbook-di-programmazione)
3. [Atti di gara](#3-atti-di-gara)
4. [Cronologia reale e tempi delle procedure](#4-cronologia-reale-e-tempi-delle-procedure)
5. [Confronto con specifica, analisi e guida](#5-confronto-con-specifica-analisi-e-guida)
6. [Proposte di modifica](#6-proposte-di-modifica)
7. [Domande ancora aperte per INAPP](#7-domande-ancora-aperte-per-inapp)
8. [Appendici](#8-appendici)

---

## 1. Sintesi

**Risultati principali**

1. **Il workbook è il vero "portafoglio" INAPP.** Il foglio `Gare_23-27` contiene **82 procedure** (righe 2–83, più una riga TOTALI), con **56 colonne utili**. Le altre categorie (incarichi a esperti, prodotti) e le versioni precedenti stanno in fogli separati, alcuni nascosti. Ogni riga corrisponde a un **incarico del Piano di attuazione del PN "Giovani, Donne e Lavoro"**: la chiave è (Operazione, Codice Incarico), non un codice di procedura.
2. **La regola "1/4/7/9 mesi" esiste ed è documentata nel workbook**, ma funziona diversamente da come la modella la guida:
   - la data della memoria si calcola **a ritroso**: `memoria = data prevista di inizio attività − N mesi` (funzione `EDATE`, mesi di calendario);
   - l'alert scatta **un mese prima** della scadenza della memoria, non a T-5;
   - N dipende **dalla procedura e dal criterio di aggiudicazione**: 1 mese = affidamento diretto (circolare interna del 2022); 4 mesi = negoziata/RdO al minor prezzo; 7 mesi = negoziata/RdO con offerta economicamente più vantaggiosa (OEPV, con commissione); 9 mesi = procedura aperta europea, attivata da una soglia di **215.000 € netti** scritta come parametro nell'intestazione.

   Ne segue che la corrispondenza `OPEN → OPEN-7M` della guida §9 è sbagliata (per INAPP l'aperta vale 9 mesi).
3. **I tempi reali sono da 2 a 3 volte più lunghi dei modelli dimostrativi.** Dalla colonna "Iter procedura affidamento" ho ricostruito le date di 65 procedure (quelle con almeno due atti datati); la mediana memoria → stipula è:

   | Procedura | Mediana reale | Modello della guida |
   |---|---|---|
   | Trattativa diretta | ≈ 108 gg (n = 15) | AD-1M: 30 gg |
   | ODA (caso reale) | 61 gg | AD-1M: 30 gg |
   | Negoziata RdO | ≈ 266 gg (n = 7) | NEG-4M: 120 gg |
   | Aperta UE | ≈ 327 gg (n = 15) | OPEN-7M: 210 gg |

   Inoltre la fase più lunga è indizione → aggiudicazione, mentre la guida attribuisce troppo peso a quella aggiudicazione → stipula.
4. **Nel processo reale manca una milestone della guida e ne compare un'altra.** Le tappe reali sono: memoria → **determina di indizione** → determina di aggiudicazione → stipula → **addendum** (piano delle attività e dei pagamenti). La determina di indizione, che per INAPP **assume già gli impegni di spesa per annualità**, non compare nella guida: `REVIEW_COMPLETED` è un concetto generico.
5. **Il piano SAL arriva con l'addendum, circa 36 giorni dopo la stipula.** È espresso in percentuali sull'importo **netto** (20/50/30), legate a deliverable con scadenza "entro il …"; l'ultima rata è "a saldo a conclusione del contratto". L'ordine MePA, cioè il contratto, **non contiene** piano SAL, decorrenza né termini di pagamento. Questo conferma US-062 ("piano estratto da addendum").
6. **Annualità.** INAPP ripartisce gli importi per **annualità di impegno/esigibilità** ("pari al 20 % … per attività svolta al 31.12"), non per data di pagamento. Il workbook ha solo colonne `Impegno AAAA`, senza date: la previsione di spesa reale è **annuale**, e questo conferma CR-02. La guida (BR-008, DEC-030) invece assegna l'anno in base alla data di pagamento: è una differenza concettuale da validare.
7. **Importi.** Il workbook lavora al **lordo IVA 22 %** (`netto = base/1,22`), e questo conferma DEC-032. Il programmato però include il **contributo ANAC** ("tassa gara", da 0 a 660 €), e in alcune righe gli **incentivi per funzioni tecniche** sono ripartiti 80 % PN / 20 % bilancio istituzionale. Gli atti riportano netto e lordo; l'addendum solo il netto; l'ordine MePA usa importi **senza separatore delle migliaia**.
8. **Formati dei PDF.** Su 6 PDF, **3 non hanno text layer pur non essendo scansioni** (le due determine e l'addendum): sono stati prodotti con "Stampa su PDF" e il testo è disegnato come tracciati vettoriali, senza un'immagine a piena pagina. Altri due, memoria e documento tecnico, hanno un text layer **incompleto**: nella memoria manca proprio l'importo lordo. L'ordine MePA ha testo completo, con etichette e valori in ordine non lineare, e contiene un **XML strutturato** (ordine in formato UBL/PEPPOL) con importi, data e identificativi: è la fonte migliore per l'estrazione.
9. **La specifica si è ispirata a questo caso.** P-001 della specifica (ODA MePA, programmato 120.000, contratto ≈ 119,5 k, riparto 20/80, SAL 20/50/30) ricalca la procedura reale: questo spiega la "stranezza" di CR-13 (un contratto già presente in fase di memoria).
10. **Il workbook ha molti problemi di qualità che l'import dovrà gestire.** Tra i più frequenti:
    - colonne in posizioni diverse tra fogli e intestazioni duplicate;
    - righe nascoste da un filtro (le righe 2–62 e 71–84 di `Gare_23-27` sono nascoste);
    - date dentro testo libero e anni a due cifre;
    - formule sovrascritte da testo e un errore `#VALUE!` in cache;
    - un anno 4990 nel foglio `Gare_28-29`;
    - CIG salvati come numero e un CIG condiviso da tre righe;
    - nessuna colonna "Struttura";
    - date discordanti tra colonne della stessa riga.

**Modifiche proposte a maggior impatto** (dettaglio nella §6):
- **P-01/P-02:** escludere dal futuro repository git il workbook e la cartella `Documenti Gara/` (oggi in radice: `git init` in I0 li includerebbe) e vietarne l'uso nei seed.
- **P-05…P-08:** modelli di procedura allineati alla convenzione INAPP: scelta del modello per procedura + criterio; memoria calcolata a ritroso dalla data di inizio attività; livello di alert a T-1 mese; milestone "Determina di indizione"; nuovi documenti attesi. Le modifiche sono progettate per non alterare l'oracle, con una verifica esplicita.
- **P-10…P-13:** previsione per annualità (granularità annuale, base competenza o cassa configurabile), linea di finanziamento PN e capitolo, contributo ANAC e incentivi come componenti di costo, impegni assunti alla determina di indizione.
- **P-15/P-16:** `procedures.xlsx` del seed che imita il layout reale (stesse intestazioni), più un file di fixture "sporco" e regole di import esplicite.
- **P-18:** documenti seed con layout e terminologia degli atti reali: segnatura di registro, struttura VISTI/CONSIDERATO/DETERMINA, ordine MePA con XML incorporato, addendum con piano SAL e una variante "stampa su PDF" senza text layer.

---

## 2. Workbook di programmazione

### 2.1 Struttura del file

Il nome del file indica il 04/09/2026, ma il file è stato modificato l'11/09/2026 e contiene eventi fino al **10/09/2026**: l'import **non deve dedurre la data di aggiornamento dal nome del file**. Le dimensioni dichiarate (`Gare_23-27`: A1:JB4968) sono gonfiate dalla formattazione: i dati occupano A1:BD84.

| Foglio | Visibile | Righe dati | Contenuto | Rilevanza MVP |
|---|---|---|---|---|
| `Gare_23-27` | sì | 82 (+ TOTALI) | Gare/affidamenti a società con inizio attività 2023–2027 | **Alta**: sorgente principale (US-010) |
| `Gare_28-29` | sì | 27 (+ TOTALI) | Gare pianificate 2028–2029: quasi tutte non avviate (1 con memoria e indizione), colonne spostate | Alta (stesso schema, layout diverso) |
| `Esperti_23-27` | sì | 81 | Incarichi a esperti persone fisiche: avviso "Collabora n", determina di incarico, piattaforma Civilia | Fuori perimetro (spec §2.2), ma da riconoscere e scartare con conteggio |
| `Esperti_28-29` | sì | 33 | Idem 2028–2029 (non avviati) | Fuori perimetro |
| `Prodotti_23_27` | sì | 649 | Prodotti (output) del PN: titolo, tipologia 1–5, data di rilascio, stato "Depositato/riprogrammato", fascicolo documentale | Bassa (possibile collegamento futuro a deliverable/SAL) |
| `Prodotti_28_29` | sì | 251 | Idem 2028–2029 | Bassa |
| `Gare_Esperti per Operazione` | sì | 12 operazioni × 2 blocchi | Riepilogo per Operazione × anno: programmato, "Totale da Piano (V.4)", delta, incentivi, conteggi per stato | Media: definisce KPI e controllo di copertura **per Operazione** |
| `Prodotti_23-26_OLD`, `Prodotti_23-26` | **nascosti** | 440 / 562 | Versioni precedenti dei prodotti; la seconda ha la colonna "gara/esperto collegato", poi eliminata | Da ignorare (configurabile) |
| `gare con possibili incentivi` | nascosto | 9 | Gare vicine alla soglia di 215.000 € | Da ignorare |
| `differenze annualità_Società`, `differenze Esperti 2025` | nascosti | ~12 | Confronto programmato / piano / consuntivi 2025 per Operazione | Da ignorare |

Ordini di grandezza (arrotondati):
- **Gare 2023–27:** programmato ≈ 27,7 M€, aggiudicato ≈ 20,8 M€, impegni per anno 2023 ≈ 1,2 M€ · 2024 ≈ 1,0 M€ · 2025 ≈ 6,7 M€ · 2026 ≈ 11,1 M€ · 2027 ≈ 5,3 M€;
- **Gare 2028–29:** ≈ 12,4 M€;
- **Esperti 2023–27:** programmato ≈ 3,9 M€, contrattualizzato ≈ 1,9 M€.

Stato delle gare 2023–27 (riepilogo del foglio per Operazione, coerente con la colonna `Status procedura`): **47 contrattualizzate, 4 aggiudicate, 14 indette, 5 in memoria, 10 non avviate, 2 eliminate**.

### 2.2 Colonne del foglio `Gare_23-27`

Legenda della colonna "Compilazione": n = celle valorizzate su 82 righe; f = celle con formula.

| Col. | Intestazione (sintesi) | Significato | Tipo e formato osservati | Compilazione | Mappatura sul modello |
|---|---|---|---|---|---|
| A | Operazione | Operazione del Piano di attuazione PN (1–12; 12 = Assistenza tecnica) | intero | 82 | `funding_line.operation` (nuovo) |
| B | Attività | Attività del Piano | intero oppure testo (`4-5`, `1-2`, `5-6`, `NP`) | 82 | `funding_line.activity` (testo) |
| C | Codice Incarico | Progressivo `Sn` **per Operazione** (S1 si ripete tra operazioni) | testo | 82 | chiave sorgente `(A, C)`, es. `OP04-S18` |
| D | Oggetto incarichi a Società | Oggetto sintetico di programmazione | testo | 82 | `Procedure.object`. Attenzione: **diverso** dall'oggetto degli atti |
| E | Data inizio attività per V1 Ob. Spesa | Inizio attività nella versione V1 del piano ("obiettivo di spesa") | data | 42 (nascosta) | `ProcedureVersion` V1 → `ACTIVITY_START` |
| F | quali (QA)/quanti (QT)/Altro (A) | Natura dell'attività di ricerca (qualitativa, quantitativa, altro) | testo (QA, QT, A, QA+QT, NP), con formato data | 76 | attributo `research_kind` (facoltativo) |
| G | Data prevista inizio Attività (V3) | Inizio nella versione V3 | data | 42 (nascosta) | `ProcedureVersion` V3 → `ACTIVITY_START` |
| H | Data inizio attività (V.4 attuazione) | Inizio nella versione corrente V4. **Per le procedure contrattualizzate coincide con la stipula** (mediana 0 gg; 41 casi su 43 entro ±31 gg) | data | 82 | forecast corrente di `ACTIVITY_START` (≈ `CONTRACT_SIGNED`) |
| I | Data fine attività (V.4) | Fine attività | data | 82 | `ACTIVITY_END`, fine contratto prevista |
| J, K, L, M | Data presentazione memoria/capitolato 9 / 1 / 4 / 7 mesi | Scadenza della memoria per ciascun modello: `EDATE(G, −N)`; J solo se netto > soglia AO1 | formula → data | f = 15 / 9 / 17 / 23 | scadenza calcolata di `MEMORY_SUBMISSION` (da **non** importare come dato: si ricalcola) |
| N | Data effettiva presentazione memoria | Data reale della memoria | data (36) + testo (2) | 38 | `MEMORY_SUBMISSION.actual_date` |
| O, P, Q, R | Alert (procedura 9 / 7 / 4 / 1 mesi) | `EDATE(memoria, −1)`: avviso **1 mese prima**. Dopo la memoria la formula viene **sovrascritta** con testo libero ("presentazione memoria del …") | formula → data, oppure testo | 15 / 21 / 16 / 7 | soglia di alert (configurazione); il testo è solo un'evidenza |
| S | CIG | Codice identificativo gara | testo da 10 caratteri; 3 celle salvate come **numero**; 1 CIG condiviso da 3 righe (accordo quadro) | 51 (49 distinti) | `identifiers.cig` (da trattare sempre come stringa) |
| T | Importo Programmato originariamente | Programmato **lordo IVA**, contributo ANAC compreso | numero; 12 formule (somme, azzeramenti tipo `=X−X` per le gare eliminate) | 82 | `programmed_amount` della baseline |
| U | Importo Base d'asta | Lordo, di norma `T − AE`; altre varianti: `AB+AC`, `(AA+AB)−AE`, valori fissi | formula (76) | 81 | `base_amount_gross` (derivato) |
| V | Importo Aggiudicato | Lordo aggiudicato | numero o formula | 53 | `Contract.gross` (se contrattualizzata) |
| W | Delta Base d'asta/Aggiudicato | "Economie", calcolate con definizioni diverse: `U−V`, `T−V`, `T−U`, `U−(AA+AB)` | formula | 51 | **da non importare**: si ricalcola |
| X | Proposta Riprogrammazione data inizio attività | Nuova data di inizio proposta | data | 24 | input di una **simulazione** `DRAFT` (non approvata) |
| Y…AD | Impegno 2023 … Impegno 2028 | Ripartizione annuale. Prima dell'indizione è una **previsione**, dopo è l'**impegno** registrato | numero (anche formule tipo `=a−b`) | 4…73 per colonna | `PaymentForecastLine` a granularità annuale e, se lo stato è ≥ indizione, `COMMITMENT` per anno |
| AE | importo della tassa | Contributo ANAC: 0 / 35 / 250 / 410 / 500 / 660 € | numero | 82 | componente di costo `ANAC_FEE` (nuovo) |
| AF | Procedure previste | Opzioni di procedura ammissibili ("Sotto soglia: affidamento diretto / RDO / negoziata"; "Sopra soglia: procedura aperta") | testo multilinea | 50 | `planned_procedure_options` |
| AG | Iter procedura affidamento | **Registro testuale** degli atti con le date (memoria, indizione, aggiudicazione, contratto, addendum, rideterminazioni, revoche…) | testo multilinea | 72 | date effettive delle milestone come **proposte** da validare, più riferimenti agli atti |
| AH | Status procedura | memoria / indizione / aggiudicazione / contratto / "contratto (modifica a contratto in essere)" / GARA ELIMINATA; maiuscole e minuscole miste | testo | 72 | `source_status`, usato per un controllo incrociato |
| AI | Procedure previste (**intestazione duplicata**) | Spiegazione della regola 1/4/7/9 mesi (fonti normative e interne) | testo | 40 (nascosta) | motivazione dei modelli (documentazione) |
| AJ | Procedura adottata | Procedura effettiva: "Trattativa Diretta" (20), "Procedura aperta in ambito europeo [con OEPV]" (17), "Procedura negoziata mediante RDO telematica" (8), "RDO – Telematica" (6), "Rdo telematica OEPV" (4), "Accordo Quadro" (7), "GARA ELIMINATA" (2) | testo | 64 | `procedure_type` + `award_criterion` (normalizzati) |
| AK | Note (intestazione con nominativi) | Note di lavoro | testo | 6 | **non importare** (dati personali nell'intestazione) |
| AL | Note post confronto struttura / moduli di modifica | Riferimenti a "Modulo di modifica n. x/AAAA" e note | testo | 13 | riferimento a una modifica del piano (versione) |
| AM, AN | Importo senza IVA, IVA | `U/1,22` e `U − AM`: **IVA al 22 % presunta per tutte le righe** | formula | 82 | derivati: il netto ufficiale va preso dagli atti |
| AO1 | `215000` (numero usato come intestazione) | Soglia in euro netti per il modello a 9 mesi | numero | — | configurazione `thresholds.eu_services_net` |
| AP…BD | Incentivi per funzioni tecniche per anno, ripartiti 80 % PN / 20 % IST | Quota incentivi per anno e fonte | numero e formule `*0,8` / `*0,2` | 1…37 | componente `TECH_INCENTIVES` con due fonti (facoltativo) |
| riga 84 | TOTALI | `SUM` per colonna | formula | — | **fine dati**: non importare |

Colonne nascoste: E, G, J, K, O, X, AI. Riquadri bloccati e filtri automatici sono presenti su tutti i fogli.

### 2.3 Differenze dei fogli `Gare_28-29`, `Esperti_*` e `Prodotti_*`

- **`Gare_28-29`** ha lo stesso schema ma con posizioni diverse:
  - nuova colonna S "Durata" (`(I−H)/30`), quindi CIG in T, programmato in U, base d'asta in V, aggiudicato in W;
  - "Economie" in X al posto di "Delta …";
  - colonne `Impegno 2028`/`Impegno 2029`;
  - intestazioni leggermente diverse ("Data inizio attività (V.4)" senza "attuazione").

  Una cella memoria contiene l'anno **4990**, frutto di una formula su un dato non valido. **L'import deve mappare per intestazione, non per lettera di colonna.**
- **`Esperti_*`** usa altre colonne:
  - "Data necessaria avvio procedura su Civilia" = `EDATE(inizio, −3)`, cioè 3 mesi di anticipo;
  - "Importo Contrattualizzato (costo INAPP)", `Impegno AAAA`, iter con avvisi "Collabora n" e determine di incarico;
  - stato: `incarico` (47), `eliminato` (2), vuoto (32).

  È un processo diverso (selezione di persone fisiche), fuori dal perimetro MVP.
- **`Prodotti_*`** contiene i prodotti attesi del PN. La tipologia è un codice 1–5:
  1. rapporti, studi e analisi;
  2. dataset e database;
  3. seminari e convegni;
  4. laboratori e networking;
  5. comunicazione, note tecniche e bollettini.

  Le altre colonne sono la data di rilascio, "Depositato/riprogrammato", l'indicatore "ISR03" (sì/no) e il numero di **fascicolo del sistema documentale**: un'evidenza utile per l'associazione dei documenti (US-021).

### 2.4 Tipologie di procedura, soglie e regola dei mesi

| Procedura adottata (workbook) | N righe | Netto min–mediana–max | Mesi (convenzione INAPP, col. AI) | Fonte citata nel workbook |
|---|---|---|---|---|
| Trattativa diretta (MePA) | 20 | ≈ 21 k – 72 k – 148 k | **1** | circolare interna sui tempi procedimentali (2022) |
| ODA – ordine diretto MePA (caso degli atti) | (1, procedura non indicata in AJ) | ≈ 98 k | **1** | idem |
| Negoziata / RdO telematica al minor prezzo | 14 | ≈ 63 k – 127 k – 215 k | **4** | All. I.3 D.Lgs. 36/2023 |
| RdO / negoziata con OEPV (commissione) | 4 | ≈ 169 k – 198 k – 215 k | **7** | All. I.3 D.Lgs. 36/2023 |
| Procedura aperta in ambito europeo | 17 | ≈ 194 k – 492 k – 1,5 M | **9** | All. I.3 D.Lgs. 36/2023 |
| Accordo quadro (incluse adesioni e contratti esecutivi) | 7 | ≈ 119 k – 328 k – 1,5 M | non indicata | — |

**Soglie osservate:**
- affidamento diretto **< 140.000 € netti** (art. 50 c. 1 lett. b, citato testualmente nella determina di aggiudicazione; una sola TD lo supera di poco, caso da segnalare);
- negoziata/RdO fino a ≈ 215.000 € netti;
- aperta oltre i 215.000 € netti (soglia parametrica in AO1; una sola riga sotto soglia).

Il valore 215.000 è fisso nel file e corrisponde a una soglia UE sub-centrale di bienni precedenti. Il documento parallelo [08_risposte_criticita.md](08_risposte_criticita.md) indica 216.000 € dal 2026. La soglia va quindi configurata **per periodo di validità** (`ConfigVersion`), non copiata dal workbook.

### 2.5 Date, importi, annualità e fonti di finanziamento

- **Date.** Nei fogli sono valori data veri, ma con formati incoerenti (`dd/mm/yy`, `d/m/yy`, `mm-dd-yy` in stile USA): bisogna leggere il **valore tipizzato**, non la stringa formattata. Nelle colonne N e O–R e nel testo di AG le date sono anche **testo** (`d/m/yy`, `dd/mm/yyyy`, "dell'11/12/2024", " 01/02/2024" con spazio iniziale), a volte con refusi ("Memoria sel 10/03/26"). In 3 righe gli atti dell'iter **non sono in ordine cronologico**.
- **Versioni della programmazione.** Le colonne E (V1), G (V3) e H/I (V4) sono **istantanee di versioni del piano**, approvate con determina (il "Piano di dettaglio per annualità", versione 4). Lo slittamento mediano V3 → V4 dell'inizio attività è di **≈ 92 giorni** (n = 42). È la conferma reale del concetto baseline/forecast (BR-001/BR-002), ma la baseline INAPP è **una versione del piano**, non uno stato della procedura.
- **Importi.** Lordi IVA 22 %. Il programmato (T) include il contributo ANAC; la base d'asta (U) di norma lo esclude. Le formule mostrano a volte il valore originario ("=325000−325000" per una gara eliminata): il testo della formula è esso stesso un'evidenza della baseline.
- **Annualità.** Solo importi annui (`Impegno AAAA`). La somma degli impegni coincide con il **programmato** (prima della gara) oppure con l'**aggiudicato più la tassa** (dopo): la stessa colonna ha due significati a seconda della fase.
- **Fonti di finanziamento.**
  - Tutte le gare sono sul **PN Giovani, Donne e Lavoro** (INAPP è Organismo intermedio): Operazione, Attività e capitolo di bilancio 1.03.02.10.003 "Incarichi a società di studi, ricerca e consulenza", come risulta dagli atti.
  - Gli incentivi sono ripartiti **80 % PN / 20 % IST** (bilancio istituzionale).
  - La memoria prevede tre caselle: *PNGDL / Istituzionale / Altro (Convenzione, DD…)*.
  - Il controllo di copertura reale è per **Operazione × anno** ("Totale da Piano V.4" contro la somma degli impegni, nel foglio di riepilogo).
- **Riprogrammazione reale.** Si manifesta in molti modi:
  - X "Proposta riprogrammazione data inizio" (24 righe su 82);
  - "Modulo di modifica n. x/AAAA" verso l'Autorità di gestione;
  - "rideterminazione/rimodulazione impegni" con determina, spesso **molte procedure lo stesso giorno a fine anno**;
  - "slittamento termine contratto con nota";
  - addendum su tempi e pagamenti.

### 2.6 Stati e fasi

Vocabolario reale (`Status procedura` e riepilogo): **Non avviata → Memoria (presentata) → Indizione/Indetta → Aggiudicazione/Aggiudicata → Contratto/Contrattualizzata**, con le varianti "contratto (modifica a contratto in essere)" e "GARA ELIMINATA". Nell'iter compaiono anche eventi che **riavviano il ciclo**:
- revoca per gara deserta o annullamento "**mantenendo gli impegni**", seguiti da una "nuova memoria" e una "nuova determina di indizione";
- revoca dell'indizione;
- risoluzione del contratto.

Attenzione semantica: lo stato "memoria" del workbook significa **memoria presentata** (corrisponde a `PRELIMINARY_REVIEW` della guida). Lo stato "non avviata" corrisponde a `MEMORY_EXPECTED`/`DRAFT`.

### 2.7 Mappatura sul modello della guida e sull'import `procedures.xlsx` (US-010)

| Elemento della guida | Fonte nel workbook | Regola di trasformazione proposta |
|---|---|---|
| `Procedure` (id, oggetto, tipologia, struttura) | A+C (chiave), D, AJ (oppure AF se AJ è vuota) | tipologia normalizzata con un dizionario di sinonimi (§8.2); **la struttura non c'è**: tabella di mappatura `Operazione/Attività → Struttura` oppure default `DA_ASSEGNARE` con elemento in coda di validazione |
| `ProcedureVersion` (baseline e successive) | E (V1), G (V3), H/I (V4), T | una versione per ciascuna colonna valorizzata, etichettata col codice della versione del piano; la corrente è V4 |
| `MilestoneForecast` | J/K/L/M (derivati), X | **non importare** J–M: si ricalcolano dal modello. X → simulazione `DRAFT` con sorgente `ACTIVITY_START`/`CONTRACT_SIGNED` |
| `ProcedureMilestone.actual_date` | N, AG | N → `MEMORY_SUBMISSION`; AG viene interpretata **solo come proposta** (`source=SEED_FILE`, cella AGn, estratto della riga), poi validata |
| `BudgetAllocation` | foglio di riepilogo (Totale da Piano per Operazione × anno) e `Impegno AAAA` | disponibilità a livello di Operazione × anno × fonte; allocazione per procedura = `Impegno AAAA` |
| `PaymentForecastLine` | `Impegno AAAA` | una riga per anno, `granularity=YEAR`, data convenzionale configurabile (es. 31/12 o 30/06), ancora `ACTIVITY_START` |
| `FinancialMovement` | `Impegno AAAA` (se stato ≥ indizione), W | `COMMITMENT` per anno; l'economia (W) è un possibile `RELEASE` da validare |
| `Contract` | S, V, H, I, AH = contratto | lordo = V; date di inizio e fine = H/I come previsione, da confermare con l'atto |
| `Anomaly` | controlli incrociati | stato sorgente (AH) diverso dallo stato calcolato; N diversa dalla data in AG; somma impegni diversa dal programmato o dall'aggiudicato più la tassa |
| Esclusioni | fogli `Esperti_*`, `Prodotti_*`, fogli nascosti, riga TOTALI, colonne AK/AL/AM/AN/W/J–R | scartati con un **conteggio nel report di import** |

### 2.8 Qualità del dato: casi che l'import deve gestire

| # | Caso osservato | Esempio (astratto) | Gestione proposta |
|---|---|---|---|
| Q1 | Righe nascoste da filtro | 75 righe su 82 nascoste in `Gare_23-27` | ignorare lo stato di filtro e visibilità delle righe |
| Q2 | Fogli nascosti con versioni vecchie | `*_OLD`, `Prodotti_23-26` | esclusi di default; elenco configurabile |
| Q3 | Colonne in posizioni diverse tra fogli | CIG in S oppure in T | mappatura per intestazione normalizzata (minuscole, senza spazi doppi e a capo) con sinonimi |
| Q4 | Intestazioni duplicate | due colonne "Procedure previste" | disambiguare per posizione (`Procedure previste#1`, `#2`) |
| Q5 | Numero usato come intestazione | `215000` in AO1 | riconoscerlo come parametro, non come campo |
| Q6 | Riga dei totali | `TOTALI` in colonna A | fine dei dati alla prima riga con `A` non numerica |
| Q7 | Formule senza valore in cache o con errore | `#VALUE!` in cache (EDATE su stringa vuota) | errore per cella (riga/colonna), riga importata con il campo `MISSING` |
| Q8 | Formule al posto di valori | `=232865+78000`, `=325000−325000` | usare il valore in cache e conservare il testo della formula come evidenza |
| Q9 | Formule sovrascritte da testo | colonne Alert con "presentazione memoria del …" | campo derivato: ignorare; il testo è solo un'evidenza |
| Q10 | Date come testo e anni a due cifre | " 01/02/2024", "dell'11/12/2024", "7/5/26" | parser con regex italiana; anno a 2 cifre → 20xx; spazi e apostrofi tollerati |
| Q11 | Date impossibili | anno 4990 | anomalia `DATE_IMPOSSIBLE` |
| Q12 | Formati di cella fuorvianti | formato data su testo (CIG, QA/QT) | ignorare `number_format` e usare il tipo del valore |
| Q13 | CIG numerico o condiviso | 3 CIG salvati come intero; 1 CIG su 3 righe | CIG sempre stringa con zeri iniziali preservati; CIG non univoco ammesso (accordo quadro e contratti esecutivi) |
| Q14 | Codici non univoci | "S1" ripetuto tra operazioni | chiave composta (Operazione, Codice Incarico) |
| Q15 | Testo dove ci si aspetta un numero o una data | Attività "4-5", "NP"; testo nominativo nella colonna data memoria | campo testo; valore non valido → `MISSING` + evidenza |
| Q16 | Fonti discordanti nella stessa riga | data memoria in N diversa da quella in AG (2 righe su 35) | elemento `CONFLICT` in coda di validazione, nessuna sovrascrittura |
| Q17 | Iter non cronologico | aggiudicazione scritta dopo il contratto | ordinare per data; se l'ordine logico è violato → `DATE_SEQUENCE_INCONSISTENT` |
| Q18 | Atti che valgono per più righe | una determina di indizione di accordo quadro su 4 righe | documento associabile a più procedure (estendere US-021) |
| Q19 | Definizioni incoerenti dei derivati | W calcolata in 4 modi diversi; U calcolata in 6 modi | non importare i derivati: si ricalcolano |
| Q20 | Nominativi nelle intestazioni e nelle note | colonna AK, foglio nascosto con riferimento nominativo | non importare; filtro dei dati personali (D-07) |
| Q21 | Data di aggiornamento ≠ nome del file | nome 04/09, contenuto fino al 10/09 | registrare la data del file (`modified`) e chiedere conferma all'utente |

---

## 3. Atti di gara

### 3.1 Quadro dei documenti

| Documento | Pag. | Produttore PDF | Text layer | Firma | Data dell'atto (fonte) |
|---|---|---|---|---|---|
| Memoria | 4 | Stampa su PDF (Microsoft) | **parziale**: frasi e importi mancanti | dicitura "sottoscritto con firma digitale" (firma non presente nel PDF) | **assente nel testo**: data ricavabile dalla determina di indizione (31/10/2025); il PDF è stato creato il 03/11 |
| Documento tecnico | 2 | Stampa su PDF | parziale (solo intestazione e titoli) | — | nessuna |
| Determina di indizione | 4 | Stampa su PDF | **nessuno** (glifi vettoriali) | dicitura | segnatura di registro in testa a ogni pagina |
| Determina di aggiudicazione | 5 | Stampa su PDF | **nessuno** | dicitura | segnatura di registro |
| Contratto (ordine MePA) | 5 | generatore di report della piattaforma MePA | **completo**, ma con ordine di lettura scomposto | **firma digitale PAdES valida** (data di firma nel dizionario della firma); **XML dell'ordine allegato** | data di creazione della fase; `IssueDate` nell'XML; data di firma |
| Addendum | 3 | Stampa su PDF | **nessuno** | timbri grafici di firma digitale con data e ora per ciascuna parte | date di firma (03/02/2026 INAPP, 05/02/2026 Operatore A) |

Nessun documento è una scansione raster: le uniche immagini sono loghi e fasce di intestazione. Quindi:
- un test "la pagina contiene un'immagine a tutta pagina" **non** individua i documenti da passare all'OCR;
- serve un criterio di **copertura del testo**: caratteri estratti per pagina rispetto all'area disegnata, oppure produttore "Stampa su PDF" → OCR obbligatorio;
- il rendering a 300 dpi dà un OCR molto pulito, perché il testo è vettoriale.

### 3.2 Memoria ("MEMORIA PER IL DIRETTORE GENERALE")

Struttura:
- intestazione INAPP;
- **Oggetto** con CUP;
- sezioni numerate:
  1. Quadro generale di riferimento;
  2. Aspetti operativi, con la motivazione (anche la scadenza del contratto precedente);
  3. Risorse necessarie (macro-attività elencate);
  4. Proposta operativa: verifica di convenzioni e accordi quadro Consip e presenza sul MePA, poi richiesta di attivare un **ODA** verso l'Operatore A; allegati: scheda Consip dell'operatore, scheda prodotto, documento tecnico;
  5. Stima dei costi previsti: netto, lordo, contributo ANAC, capitolo, costi della sicurezza = 0, data di conclusione dell'attività;
  6. Responsabile tecnico del procedimento;
  7. Fonti di finanziamento: capitolo, PN, Operazione/Attività, **ripartizione per annualità con percentuale, netto e lordo** (20 % al 31/12 del primo anno più il contributo ANAC; 80 % al 31/12 del secondo), tabella PNGDL/Istituzionale/Altro;
  8. Gestione privacy;
- firma del **Responsabile della Struttura** (non del RUP né dell'Ufficio Gare).

Campi estraibili: oggetto, CUP, tipo di procedura richiesta, operatore proposto (per l'ODA), netto/lordo, contributo ANAC, capitolo, Operazione/Attività, ripartizione per anno (% e importi), data di fine attività, responsabile. **Manca la data**: la memoria si data dal protocollo o dalla firma, oppure dall'atto successivo che la richiama ("memoria predisposta, in data …").

### 3.3 Documento tecnico

Scheda dell'**operatore economico**, non un capitolato INAPP: carta intestata dell'Operatore A, titolo, tabella **TITOLO / DESCRIZIONE** con le attività (presa in carico, reingegnerizzazione, servizi tecnici annuali, manutenzione per 12 mesi dal go-live, funzione di ricerca IA, pacchetto di 50 giornate di evoluzione, budget di richieste, project management). Non contiene date né importi. Per le gare, al suo posto c'è il **capitolato tecnico** redatto da INAPP (il workbook parla di "memoria/capitolato").

### 3.4 Determina di indizione

- Segnatura in testa a ogni pagina: `INAPP.REGISTRO DETERMINE.<n. a 7 cifre>.DIREZIONE GENERALE.<gg-mm-aaaa>.REGISTRAZIONE`. Pagina 1 di copertina ("DETERMINA DEL DIRETTORE GENERALE" e riquadro **Oggetto**); numerazione "n di N".
- Preambolo:
  - VISTI: norme istitutive, statuto, regolamenti, nomine degli organi, codice dei contratti, bilancio di previsione;
  - TENUTO CONTO del ruolo di Organismo intermedio del PN (azioni entro il 31/12/2026);
  - VISTA la determina di approvazione del piano per annualità;
  - **ESAMINATA la memoria** (data, struttura, procedura "ODA telematica");
  - nomina del **RUP** (nota con data e protocollo);
  - verifiche Consip e MePA;
  - art. 50 c. 1 lett. b;
  - importo netto e lordo e contributo ANAC;
  - richiesta e ricezione dei documenti dell'operatore (date e protocolli);
  - nota del RUP;
  - verifica dei requisiti tramite FVOE "successivamente all'acquisizione del CIG";
  - **prenotazioni di spesa** (numero, data, annualità, importo, capitolo, fondo PN e Operazione), una annuale e una pluriennale.
- Dispositivo DETERMINA:
  1. premesse;
  2. autorizza l'istruttoria dell'ODA (RUP già individuato);
  3. **assume gli impegni di spesa per annualità** (primo anno con il contributo ANAC; secondo anno come impegno pluriennale).
- Firma: Direttore Generale.

Il **CIG non c'è ancora**: viene acquisito dopo l'indizione.

### 3.5 Determina di aggiudicazione

Stesso formato. Il preambolo aggiunge:
- la determina di rimodulazione del Piano di attuazione, che **estende le attività al 31/12/2029** (III addendum alla Convenzione con l'Autorità di gestione);
- la soglia dell'affidamento diretto (< 140.000 € netti);
- l'assenza di interesse transfrontaliero;
- il riferimento alla determina di indizione (numero e data);
- la spesa netta e lorda, il contributo ANAC, i costi della sicurezza = 0;
- gli **impegni** (numeri e date = data dell'indizione) per annualità;
- la **bozza ODA n. …** sulla piattaforma (il numero è diverso da quello dell'ordine definitivo);
- il **CIG acquisito**;
- la **nota del RUP che propone l'aggiudicazione** e il possesso dei requisiti.

Dispositivo:
1. premesse;
2. autorizza l'affidamento **per la durata di 12 mesi** all'Operatore A per l'importo netto/lordo;
3. **garanzia definitiva** ex art. 53 c. 4, richiesta anche per l'affidamento diretto;
4. stipula tramite ODA sul MePA;
5. copertura con gli impegni già assunti.

Non esiste un atto separato di "efficacia": i requisiti sono verificati **prima** dell'aggiudicazione.

### 3.6 Contratto (ordine diretto MePA, "ordinativo esecuzione immediata")

- Layout a riquadri chiave–valore generato dalla piattaforma:
  - Informazioni sulla procedura di acquisto: numero, **CIG**, **CUP**, strumento MePA, iniziativa;
  - Informazioni sulla fase: numero, data di creazione, giorni per l'accettazione (4 lavorativi), annullabilità;
  - Dati dell'amministrazione e punto ordinante;
  - Fornitore contraente;
  - Consegna e fatturazione;
  - quota PNRR (0);
  - **Riepilogo economico**: codice articolo, descrizione, prezzo, quantità, aliquota IVA 22 %, imponibile; totali IVA esclusa, sconti, IVA, totale IVA inclusa;
  - Dettaglio articoli: CPV, **durata del contratto 12 mesi**, tempi di attivazione, assistenza…;
  - clausola di conclusione del contratto con l'invio dell'ordine firmato.
- Gli importi compaiono **senza separatore delle migliaia** ("€ 98200,00").
- **Allegato XML** (`XML_ORDINE_ODA_<n>.xml`): ordine UBL/PEPPOL "order only" con `IssueDate`, CIG (`OriginatorDocumentReference`), CUP e strumento (`AdditionalDocumentReference`), acquirente e fornitore, `TaxTotal/TaxAmount`, `AnticipatedMonetaryTotal` (`TaxExclusiveAmount`, `TaxInclusiveAmount`, `PayableAmount`), righe d'ordine con aliquota e CPV, proprietà dell'articolo (durata). È **deterministico e privo di ambiguità**: va preferito al testo.
- **Mancano**: decorrenza, data di fine, piano SAL, termini di pagamento, garanzia, penali.
- Date: `IssueDate` e firma il 30/12/2025, mentre gli atti successivi e il workbook indicano la stipula al **31/12/2025**. È un conflitto realistico di un giorno, da far emergere in validazione.
- Nel testo estratto etichette e valori non sono allineati: "Totale IVA" è seguito dal totale lordo. Serve un'estrazione **per coordinate** (parole con riquadro, abbinamento etichetta–valore sulla stessa riga o colonna), non sul flusso di testo.

### 3.7 Addendum

- Carta intestata INAPP; titolo "Addendum al contratto «oggetto»", riga **C.I.G. … – C.U.P. …**; **TRA** INAPP (rappresentato dal Direttore Generale) **e** l'Operatore A (legale rappresentante).
- **PREMESSO**:
  1. la data di stipula del contratto;
  2. un'e-mail del Responsabile della Struttura che **definisce con l'operatore il piano delle attività**;
  3. la nota del RUP che propone l'addendum. **La nota è datata con l'anno sbagliato** (anno precedente alla stipula): è un caso reale di data incoerente.
- **CONVENGONO**:
  - Art. 1 premesse;
  - Art. 2 piano delle attività:
    - a) entro il 31/12 del primo anno: costituzione del gruppo di lavoro e pianificazione;
    - b) entro il 31/05 del secondo anno: rilascio del nuovo portale con la funzione IA;
    - c) a seguire: manutenzione;
    - d) entro il 30/11: servizi tecnici;
  - Art. 3 **pagamenti 20 % / 50 % / 30 %** dell'importo complessivo, con importi **IVA esclusa**, "a seguito di" a) e b) e "a saldo a conclusione del contratto";
  - Art. 4 condizioni di esaurimento del budget della funzione IA (volumi o 12 mesi);
  - "nessun onere economico aggiuntivo".
- Tabella di firma INAPP / Prestatore con i timbri della firma digitale (date e ora).

Implicazioni:
- l'addendum è una **`ContractVersion` senza variazione d'importo**, con motivo "tempistiche, modalità di svolgimento e pagamento";
- è la **prima** fonte del piano SAL;
- la scadenza del primo SAL **coincide con la stipula**: un piano retroattivo;
- l'ultima rata non ha una data propria (fine contratto = stipula + 12 mesi);
- il termine di pagamento non è indicato: vale il default di legge di 30 giorni dalla fattura, coerente con la guida.

### 3.8 Implicazioni per l'estrazione (US-022)

**Ordine delle fonti:** XML incorporato (se presente) → text layer con layout per coordinate → OCR della pagina renderizzata. L'OCR si attiva quando la copertura del testo è insufficiente, o d'ufficio se il produttore è "Stampa su PDF". I metadati del PDF (data di creazione e modifica) indicano la **stampa**, non l'atto: non usarli come date dell'atto.

**Pattern di parsing** (espressioni indicative, da tarare sui documenti seed):

| Campo | Dove | Pattern / regola |
|---|---|---|
| Numero e data di registrazione della determina | segnatura su ogni pagina | `REGISTRO DETERMINE\.(\d{7})\.DIREZIONE GENERALE\.(\d{2}-\d{2}-\d{4})` |
| Atto richiamato | preambolo delle determine | `[Dd]etermina(?: di \w+)? n\.\s*(\d{1,5}) del (\d{1,2}(?:°)? \w+ \d{4}\|\d{1,2}/\d{1,2}/\d{2,4})` |
| Data della memoria | determina di indizione | `memoria predisposta,? in data (\d{1,2} \w+ \d{4})` |
| Date in lettere | ovunque | `(\d{1,2})(?:°)?\s+(gennaio\|febbraio\|marzo\|aprile\|maggio\|giugno\|luglio\|agosto\|settembre\|ottobre\|novembre\|dicembre)\s+(\d{4})` |
| Scadenze di deliverable | addendum art. 2 | `entro il (<data in lettere>)` legata alla lettera a)…d) |
| Importo con qualificatore | memoria, determine, addendum | `€\s?(\d{1,3}(?:\.\d{3})*,\d{2})` seguito entro 30 caratteri da `(oltre IVA\|IVA esclusa\|iva esclusa\|IVA inclusa\|Iva inclusa)` |
| Importo MePA | ordine | `€\s?(\d+,\d{2})` (senza migliaia), abbinato all'etichetta per coordinate |
| Importo XML | allegato | `TaxExclusiveAmount`, `TaxInclusiveAmount`, `TaxAmount` (punto decimale) |
| Percentuale + importo SAL | addendum art. 3 | `il (\d{1,3})% dell[’']importo complessivo,? (?:pari ad\|a saldo per l[’']importo di) € ([\d\.]+,\d{2}) IVA esclusa` |
| CIG | intestazioni, ordine | `C\.?I\.?G\.?\s*:?\s*([A-Z0-9]{10})` (reale) **e** `CIG-DEMO-P\d{3}` (seed) |
| CUP | oggetto della memoria, ordine, addendum | `C\.?U\.?P\.?\s*:?\s*([A-Z0-9]{15})` **e** `CUP-DEMO-P\d{3}` |
| Durata | determina di aggiudicazione, ordine | `per la durata di (\d+) mesi` · `Durata contratto:\s*(\d+) mesi` |
| Prenotazioni e impegni | determine | `(prenotazione\|impegno)(?: pluriennale)? di spesa n\.\s*(\d+) del (<data>)[^.]*?annualità (\d{4})[^.]*?€\s?([\d\.]+,\d{2})` |
| Capitolo | memoria, determine | `Cap(?:itolo)?\.?\s*(\d\.\d{2}\.\d{2}\.\d{2}\.\d{3})` |
| Fonte | memoria, determine | `Fondo PN GDL Codice Operazione (\d+)` · `Operazione a titolarità n\. (\d+),? Attività n\. (\d+)` |
| Contributo ANAC | memoria, determine | `€\s?([\d\.]+,\d{2}) in favore dell[’']ANAC` · `tassa (?:di )?gara pari a euro ([\d\.]+,\d{2})` |
| Garanzia | determina di aggiudicazione | `garanzia definitiva` (presenza → `requires_performance_guarantee=true`) |
| Data di firma | addendum (timbro), ordine (dizionario della firma) | `(\d{2}\.\d{2}\.\d{4}) (\d{2}:\d{2}:\d{2}) GMT` · `/M (D:\d{14}…)` |

**Trappole note:**
1. Il text layer parziale "passa" una soglia di caratteri ma perde proprio la frase dell'importo lordo.
2. Etichette e valori fuori ordine nell'ordine MePA.
3. Numero d'ordine diverso tra la bozza citata in determina e l'ordine finale.
4. Data di stipula dichiarata diversa di un giorno da quella dell'XML e della firma.
5. Anno errato in una premessa.
6. L'oggetto degli atti è diverso dall'oggetto del workbook: la similarità sull'oggetto è debole, il CIG è affidabile solo dopo l'indizione, il CUP identifica il progetto e può essere condiviso.

---

## 4. Cronologia reale e tempi delle procedure

### 4.1 La procedura degli atti (affidamento diretto tramite ODA MePA)

Il giorno 0 è la memoria (31/10/2025). La data di inizio attività in V4 nel workbook era il 01/09/2025: con il modello a 1 mese la memoria sarebbe scaduta il 01/08/2025, quindi è stata presentata **≈ 91 giorni dopo la scadenza teorica**. Il contratto di assistenza precedente era scaduto il 30/09/2025.

| Giorno | Data | Evento | Fonte |
|---|---|---|---|
| 0 | 31/10/2025 | **Memoria** della Struttura al Direttore Generale | determina di indizione, workbook |
| +3 | 03/11/2025 | **Prenotazioni** di spesa (primo anno e pluriennale); stampa PDF di memoria e documento tecnico | determina di indizione; metadati |
| +11 | 11/11/2025 | Nomina del **RUP** (nota) | determina di indizione |
| +13 / +15 | 13–15/11/2025 | Richiesta e ricezione dei documenti dell'operatore per la verifica dei requisiti | determina di indizione |
| +24 | 24/11/2025 | Nota del RUP | determina di indizione |
| **+25** | 25/11/2025 | **Determina di indizione** (registrata lo stesso giorno) e **impegni** per annualità | segnatura; determina di aggiudicazione |
| +33 | 03/12/2025 | Creazione della fase "Ordine" sul MePA | ordine |
| (tra +25 e +52) | — | Acquisizione del CIG e verifica tramite FVOE | determina di aggiudicazione |
| +49 | 19/12/2025 | Nota del RUP che **propone l'aggiudicazione** (lo stesso giorno: rimodulazione del Piano PN al 2029) | determina di aggiudicazione |
| **+52** | 22/12/2025 | **Determina di aggiudicazione** (12 mesi, garanzia definitiva) | segnatura |
| +60 | 30/12/2025 | Ordine firmato digitalmente (`IssueDate`, firma) | ordine, XML |
| **+61** | 31/12/2025 | **Stipula** "dichiarata" negli atti successivi e nel workbook; scadenza del deliverable a) | addendum, workbook |
| +66 | 05/01/2026 | Termine di accettazione dell'ordine (4 giorni lavorativi) | XML |
| +89 | 28/01/2026 | E-mail della Struttura con il piano delle attività concordato con l'operatore | addendum |
| +94 | 02/02/2026 | Nota del RUP che propone l'addendum (scritta con l'anno sbagliato) | addendum |
| **+95 / +97** | 03/02 e 05/02/2026 | **Addendum** firmato da INAPP e poi dall'Operatore A (stipula +36 giorni) | timbri di firma |
| +212 | 31/05/2026 | Deliverable b): rilascio del portale → SAL 50 % | addendum |
| +395 | 30/11/2026 | Deliverable d): servizi tecnici | addendum |
| +426 | 31/12/2026 | Fine attività (12 mesi) → saldo 30 % | memoria, determina |
| — | 04/09/2026 | Stato nel workbook: "contratto", con la nota "addendum (non modifica gli importi impegnati)" | workbook |

**Intervalli:**

| Tratto | Reale (questa procedura) | Modello AD-1M |
|---|---|---|
| memoria → indizione | 25 gg | `REVIEW_COMPLETED`: 7 |
| indizione → aggiudicazione | 27 gg | `AWARD`: 10 |
| aggiudicazione → stipula | 9 gg | `AWARD_EFFECTIVE` + `CONTRACT_SIGNED`: 5 + 8 |
| **memoria → stipula** | **61 gg** | **30** |
| stipula → piano SAL (addendum) | 36 gg | non modellato |

### 4.2 Tempi osservati nel portafoglio (colonna "Iter", 65 procedure con almeno due atti datati)

Mediane in giorni solari (minimo–massimo); "n" è il numero di righe con entrambe le date. Le date sono interpretate dal testo libero: valori indicativi.

| Procedura | memoria → indizione | indizione → aggiudicazione | aggiudicazione → stipula | **memoria → stipula** | Convenzione INAPP | Modello guida |
|---|---|---|---|---|---|---|
| Trattativa diretta | 25 (10–111), n = 19 | 48 (0–85), n = 17 | 19 (2–39), n = 15 | **108 (64–175)**, n = 15 | 1 mese | AD-1M = 30 |
| ODA (atti analizzati) | 25 | 27 | 9 | **61** | 1 mese | AD-1M = 30 |
| Negoziata / RdO | 73 (31–98), n = 8 | 184 (141–229), n = 8 | 24 (11–46), n = 7 | **266 (252–351)**, n = 7 | 4 mesi | NEG-4M = 120 |
| RdO con OEPV | 28 (6–35), n = 4 | 121 (101–175), n = 3 | 25 (21–28), n = 3 | **154 (148–231)**, n = 3 | 7 mesi | (OPEN-7M = 210) |
| Aperta UE | 52 (9–117), n = 16 | 218 (135–328), n = 16 | 46 (27–186), n = 15 | **327 (239–452)**, n = 15 | 9 mesi | OPEN-7M = 210 |
| Accordo quadro (indizione di AQ e contratti esecutivi) | 5, n = 4 | — | — | — | — | FA-9M = 270 |

**Lettura:**
1. Le convenzioni INAPP (1/4/7/9 mesi) sono **termini obiettivo**, sistematicamente superati, tranne che per le aperte, dove 9 mesi è vicino alla realtà.
2. Il peso delle fasi è diverso da quello dei modelli. La fase indizione → aggiudicazione vale il 45–65 % del totale; la guida assegna invece troppo alla coda aggiudicazione → stipula (NEG-4M: 50 gg contro 24 reali). Per le aperte, il tratto aggiudicazione → stipula di ≈ 46 gg è compatibile con le verifiche e il termine dilatorio.
3. Nelle trattative dirette e negli ODA l'"efficacia" non è una fase separata, perché i requisiti si verificano prima.
4. Riavvii (gara deserta, annullamento) e riprogrammazioni (X valorizzata in 24 righe su 82; slittamento mediano V3 → V4 di ≈ 3 mesi) sono **frequenti**: gli scenari della demo (+45/+52/+60 giorni) sono plausibili.

---

## 5. Confronto con specifica, analisi e guida

### 5.1 Cosa i documenti reali confermano

| Tema | Specifica / guida | Riscontro reale |
|---|---|---|
| Ruolo della memoria come avvio del processo | Glossario, §3.1 | Sì: memoria della Struttura al Direttore Generale; tutti gli atti successivi la richiamano |
| Owner della memoria = Struttura | US-033, §7 | Sì: firmata dal Responsabile della Struttura |
| Esistenza di modelli 1/4/7/9 mesi | A-08, US-030 | Sì, con fonti citate (circolare interna 2022; All. I.3 D.Lgs. 36/2023) |
| Riprogrammazione frequente; baseline distinta dalle versioni | BR-001/002, EP-05 | Sì: versioni V1/V3/V4, colonna "Proposta riprogrammazione", moduli di modifica |
| Importi lordi IVA 22 % | DEC-032 | Sì: workbook al lordo, netto = /1,22 |
| Annualità e piano 20/80, SAL 20/50/30 | §7.3, US-062 | Sì: è il caso reale da cui deriva P-001 |
| Il piano SAL può arrivare dall'addendum e va validato | US-062 | Sì: è l'unica fonte del piano |
| Addendum come versione collegata al contratto | US-060, `ContractVersion` | Sì, senza variazione d'importo |
| Garanzia definitiva come prerequisito della stipula | guida §9 | Sì, ma richiesta **anche** nell'affidamento diretto |
| Soglia dell'affidamento diretto 140 k€ netti | CR-31 | Sì, citata testualmente negli atti |
| Termine di pagamento di 30 giorni come default | §8.3 nota 2 | Non indicato negli atti: resta il default di legge |
| Movimenti prenotazione → impegno → … | §5.3 | Sì: prenotazioni (numero e data) e impegni annuali o pluriennali |
| Necessità di OCR di riserva | US-022 | Sì: 3 atti su 6 senza text layer e 2 con text layer parziale |

### 5.2 Cosa i documenti reali smentiscono o correggono

| Tema | Guida / specifica | Realtà | Proposta |
|---|---|---|---|
| Corrispondenza tipologie → modelli | `OPEN → OPEN-7M`, `NEGOTIATED → NEG-4M`, `FA → FA-9M` | Aperta = **9 mesi**; negoziata = 4 **o** 7 mesi secondo il **criterio**; accordo quadro da distinguere (adesione/contratto esecutivo oppure AQ proprio) | P-05 |
| Come si fissa la scadenza della memoria | data della memoria data in input; milestone in avanti | **A ritroso** dalla data di inizio attività: `EDATE(inizio, −N)` | P-08 |
| Soglia di alert della memoria | T-10 / T-5 / T-2 / T0 / T+1 (giorni) | Il workbook usa T-1 **mese** (`EDATE(memoria, −1)`) | P-08 (aggiungere T-1M) |
| Unità degli offset | giorni solari (DEC-010) | **mesi di calendario** (`EDATE`) per scadenze e alert | P-09 |
| Milestone dopo la memoria | `REVIEW_COMPLETED` (istruttoria) | **Determina di indizione** (a contrarre), che contiene anche gli impegni | P-06 |
| Tempi dei modelli | AD 30 / NEG 120 / OPEN 210 / FA 270 | mediane 61–108 / 266 / 327 | P-05bis (profilo "realistico") |
| `AWARD_EFFECTIVE` nell'affidamento diretto | fase di 5 giorni | Non esiste: verifiche prima dell'aggiudicazione | P-05 (`mandatory: false`) |
| Annualità della previsione | anno della **data di pagamento** (BR-008, DEC-030) | anno di **impegno/esigibilità** ("attività svolta al 31/12"); il workbook ha solo importi annui | P-10 (base configurabile) |
| Momento dell'impegno | implicitamente al contratto | Alla **determina di indizione**; rideterminato dopo l'aggiudicazione | P-13 |
| Livello della disponibilità di bilancio | per procedura (DEC-031) | Piano per **Operazione × anno**; per procedura ci sono solo allocazioni (impegni) | P-11 |
| Contenuto del contratto | US-060: decorrenza, durata, fine, netto/IVA/lordo | L'ODA MePA ha durata in mesi e importi, ma **non** decorrenza, fine o piano SAL | P-14 |
| Etichette delle tipologie | "Affidamento diretto", "Ordine MePA", "Procedura negoziata" | "Trattativa diretta", "ODA", "RdO / negoziata mediante RdO", "Procedura aperta in ambito europeo", "Accordo quadro" | P-03 |
| Un documento → una sola procedura | US-021 | Una determina di accordo quadro copre più righe; un CIG condiviso da 3 righe | P-14 |
| Importi del piano SAL | lordi | Nell'addendum **solo netti** | P-12 |

### 5.3 Cosa i documenti reali aggiungono (oggi assente)

- **Linea di finanziamento** (Programma → Operazione → Attività), **capitolo di spesa**, **fonte** PN/IST/Altro e **data di fine del finanziamento** (31/12/2026, estesa al 31/12/2029): dà un valore reale alla criticità `FUNDING_END_EXCEEDED`.
- **Componenti di costo** fuori contratto: contributo ANAC (importo fisso a tariffa) e incentivi per funzioni tecniche, divisi tra fonti.
- **Atti amministrativi** come oggetti (tipo, numero di registro, data di registrazione, firmatario per ruolo) e **segnatura di registro** come pattern di estrazione.
- **RUP** nominato con nota dopo la memoria. È lui a proporre aggiudicazione e addendum; la firma degli atti resta al Direttore Generale.
- **Strumento di acquisto** (MePA ODA/TD/RdO, fuori MePA, adesione Consip) e **criterio di aggiudicazione** (minor prezzo / OEPV).
- **Eventi di riavvio**: revoca o gara deserta con impegni mantenuti, poi nuova memoria; **risoluzione** del contratto; **slittamento del termine** contrattuale; **rideterminazione degli impegni** di fine anno.
- **Versioni del piano** (V1/V3/V4, modulo di modifica) come contesto della baseline.
- **Prodotti attesi** del PN (900 righe) con data di rilascio e stato "depositato/riprogrammato": possibile estensione del concetto di deliverable.
- **XML strutturato dell'ordine MePA** come fonte di estrazione deterministica.

### 5.4 Criticità dell'analisi (CR-xx) che trovano risposta

| CR | Esito | Evidenza e conseguenza |
|---|---|---|
| CR-01 Giorni solari o lavorativi | **Parziale** | INAPP usa **mesi di calendario** (`EDATE`) per la scadenza della memoria e per l'alert (T-1 mese); nessun uso di giorni lavorativi nel workbook. Il T-5 della specifica resta un requisito aggiuntivo. Il default "solari" (DEC-010) è coerente; aggiungere l'unità `MONTH` |
| CR-02 Previsione senza piano SAL | **Confermata** | Il workbook ha solo importi annui; le date arrivano solo con l'addendum dopo la stipula. Le righe datate del seed restano una necessità sintetica; per l'import reale servono righe annuali (P-10) |
| CR-03 Disponibilità per procedura o condivisa | **Risposta di massima** | Piano e copertura per Operazione × anno; per procedura ci sono allocazioni (impegni per annualità). DEC-031 resta valida come semplificazione MVP, ma va aggiunta l'Operazione (P-11) |
| CR-04 Modelli 1/4/7/9 non specificati | **In gran parte risolta** | Semantica (calcolo a ritroso dall'inizio attività), regola di scelta (procedura + criterio + soglia di 215 k€ netti), fonti e alert a 1 mese. Restano da definire le milestone intermedie e le durate interne (P-05…P-08) |
| CR-05 Input della riprogrammazione | **Parziale** | L'input reale è una **nuova data di inizio attività** (colonna X); le modifiche passano anche da modulo di modifica o determina di rimodulazione degli impegni |
| CR-07 Importo a rischio | Nessuna risposta diretta | Il riepilogo confronta il "Totale da Piano" con il programmato per Operazione: uno spunto per "non coperto" a livello di Operazione |
| CR-09 / CR-11 Stati e fasi | **Parziale** | Vocabolario reale: non avviata / memoria (presentata) / indizione / aggiudicazione / contratto / eliminata (P-04) |
| CR-13 P-001 con contratto in fase di memoria | **Spiegata** | P-001 è modellata sul caso reale nello stato finale (contratto ≈ 119,5 k). DEV-002 resta corretta |
| CR-15 Nascita della baseline | **Parziale** | La baseline INAPP è una **versione del piano** approvata con determina; DEC-024 resta valida per la procedura |
| CR-20 / CR-22 Ruoli e firme | **Parziale** | Firme: memoria → Responsabile di Struttura; determine, ordine MePA e addendum → Direttore Generale; proposte → RUP; piano delle attività → Struttura con l'operatore |
| CR-21 Netto o lordo | **Confermata** | Lordo IVA 22 % più contributo ANAC nel programmato (P-12) |
| CR-23 Destinatari degli alert | **Lacuna confermata** | Il workbook non ha una colonna Struttura: la struttura si deduce dalla memoria o da una mappatura dell'Operazione |
| CR-25 Entità mancanti | **Ampliata** | Mancano anche Operazione/linea di finanziamento, capitolo, atto amministrativo, componenti di costo, strumento e criterio (P-14) |
| CR-27 Documenti seed | **Risolvibile** | Esempi reali di layout per tutti i tipi principali (P-18) |
| CR-28 Arrotondamenti | **Indicazione** | Le percentuali SAL si applicano al **netto**; convertire SAL netti in lordi può creare scarti di 1 centesimo (es. P-004: 50 % → 97.540,99 netti × 1,22 = 119.000,01): l'ultimo SAL deve assorbirli (DEC-033) |
| CR-31 Tipologie e soglie | **Confermata** | 140 k€ netti per l'affidamento diretto e ≈ 215 k€ netti per le aperte. P-004 (≈ 195 k netti, "affidamento diretto") e P-002 (≈ 393 k netti, "negoziata") sono implausibili; P-009 (250 k netti, "ordine MePA") è sopra soglia |
| CR-32 Cronologia e spesa | **Confermata** | Tempi reali da 2 a 3 volte quelli dei modelli: i pagamenti 2026 di procedure ancora in memoria a settembre 2026 non sono realistici |
| D-09 Documenti demo reali | **Avviata** | Disponibili esempi reali (non anonimizzati: **da non usare** come seed) |

---

## 6. Proposte di modifica

Criteri seguiti:
1. **Non toccare `00_specifica_originale_v1_0.md`**, che è la conversione dell'originale: le correzioni vanno nella guida.
2. Ogni proposta indica l'impatto sull'oracle della guida §10. "Neutro" significa che non cambiano i valori attesi, previa verifica col calcolo; dove serve è indicata la DEV da registrare.
3. Nulla è ancora implementato (I0 è in `TODO`), quindi il costo delle modifiche è minimo adesso.

### 6.1 Tabella delle proposte

| ID | File · sezione | Testo attuale (sintesi) | Testo proposto (sintesi; dettagli in §8) | Motivazione | Impatto oracle |
|---|---|---|---|---|---|
| **P-01** | `CLAUDE.md` · "Regole non negoziabili" e "Ambiente" | Nessuna regola sui documenti reali; I0 prevede `git init` nella cartella | Aggiungere: «Il workbook in radice e la cartella `Documenti Gara/` sono **documenti reali del cliente**: non vanno mai copiati in `seed/`, nei test o nei fixture, non vanno citati con valori reali e vanno esclusi dal repository (`.gitignore`: `/Documenti Gara/`, `/*PN GDL*.xlsx`). Servono solo come riferimento di layout (vedi `docs/05`).» Aggiungere `docs/05_analisi_documenti_reali.md` all'elenco "Leggi prima" come contesto non vincolante | Rischio concreto di committare dati reali (persone, codici fiscali, CIG/CUP); principio A-03 | Nessuno |
| **P-02** | Guida §2.6 (Git e ambiente) e §2.5 (Divieti) | `.gitignore` deve includere `.env` | `.gitignore` include anche i due percorsi reali. Nuovo divieto: «Non usare dati, nomi, importi o identificativi dei documenti reali nei seed, nei test e nella documentazione; imitarne solo layout e terminologia» | Come P-01 | Nessuno |
| **P-03** | Guida §5.1 "Tipologie" | 6 codici con etichette generiche | Codici invariati; **etichette e sinonimi** allineati: `DIRECT_AWARD` "Affidamento diretto (fuori MePA)"; `DIRECT_AWARD_MEPA` "Affidamento diretto MePA – Trattativa diretta (TD)"; `MEPA_ORDER` "Ordine diretto MePA (ODA)"; `NEGOTIATED` "Procedura negoziata (RdO MePA)"; `OPEN` "Procedura aperta in ambito europeo"; `FRAMEWORK_AGREEMENT` "Accordo quadro / contratto esecutivo". Nuovi attributi: `award_criterion` (`LOWEST_PRICE` / `MEAT`) e `instrument` (`MEPA` / `OFF_MEPA` / `CONSIP_AQ`). Dizionario dei sinonimi in §8.2 | Terminologia reale dell'Ufficio Gare (credibilità della demo); necessario per l'import | Nessuno (codici invariati) |
| **P-04** | Guida §5.1 "Procedura" (etichette degli stati) | `PRELIMINARY_REVIEW` "Istruttoria", `TENDERING` "Gara"… | Etichette UI: `MEMORY_EXPECTED` "Memoria attesa (non avviata)"; `PRELIMINARY_REVIEW` "Memoria presentata – istruttoria"; `TENDERING` "Indetta – in gara"; `AWARDED` "Aggiudicata"; `CONTRACTING` "In stipula"; `EXECUTION` "Contratto in esecuzione"; `CANCELLED` "Annullata / eliminata". Tabella `source_status → status` per il controllo incrociato in import (memoria → `PRELIMINARY_REVIEW`; indizione → `TENDERING`; aggiudicazione → `AWARDED`/`CONTRACTING`; contratto → `EXECUTION`/`CLOSING`; GARA ELIMINATA → `CANCELLED`) | Vocabolario reale (CR-11); evitare l'equivoco "memoria" = memoria **presentata** | Nessuno (solo etichette) |
| **P-05** | Guida §9 "Corrispondenza tipologie → modelli" e DEC-020 | `DIRECT_*`/`MEPA_ORDER` → AD-1M; `NEGOTIATED` → NEG-4M; `OPEN` → OPEN-7M; `FA` → FA-9M | La scelta del modello dipende da **tipologia + criterio**: AD/TD/ODA → `AD-1M`; `NEGOTIATED`+`LOWEST_PRICE` → `NEG-4M`; `NEGOTIATED`+`MEAT` → `NEG-7M` (nuovo: stesse milestone di NEG-4M più `EVALUATION_COMPLETED` facoltativa, totale 210 gg); `OPEN` → `OPEN-9M` (nuovo: offset dell'attuale FA-9M, 270 gg); `FRAMEWORK_AGREEMENT` → `FA-9M` (AQ proprio) oppure `AD-1M` (adesione / contratto esecutivo, `instrument=CONSIP_AQ`). In AD-1M `AWARD_EFFECTIVE` diventa `mandatory: false` (offset 0). Regola di soglia configurabile: `thresholds.direct_award_net = 140000`, `thresholds.eu_services_net` versionata per data (215.000 nel workbook, 216.000 dal 2026 secondo il doc. 08) (DA VALIDARE) | Convenzione INAPP documentata nel workbook (col. AI); aperta = 9 mesi | **Neutro da verificare.** P-003 e P-008: date previste dichiarate esplicitamente; S-05 resta `date_changes = 3` (stessa catena a valle di `AWARD`). P-002/P-007/P-010/P-012 restano NEG-4M (minor prezzo). Ricalcolare l'oracle §10.3–10.5 dopo il cambio; se qualcosa cambia → DEV |
| **P-05bis** | Guida §9 (nuovo paragrafo "Profili di durata") | — | Due profili di offset: `demo` (default, quello attuale, che regge l'oracle) e `realistic` (illustrativo, da tabella §4.2: AD ≈ 90 gg; NEG minor prezzo ≈ 240; NEG OEPV ≈ 180; OPEN ≈ 330), selezionabili in configurazione solo fuori dal seed | Rendere visibile in demo il divario reale e preparare la validazione con INAPP (D-01) | Nessuno (profilo non attivo nel seed) |
| **P-06** | Guida §9 tabella milestone (etichette) | `REVIEW_COMPLETED` "Istruttoria completata"; `AWARD` "Aggiudicazione / determina di affidamento"; `AWARD_EFFECTIVE` "Efficacia (verifiche)"; `CONTRACT_SIGNED` "Stipula" | Codici invariati (per non toccare l'oracle), etichette reali: `REVIEW_COMPLETED` → «**Determina di indizione (a contrarre)** – istruttoria completata»; `INVITATION_SENT`/`CALL_PUBLISHED` → «Avvio TD/RdO o pubblicazione del bando»; `AWARD` → «**Determina di aggiudicazione**»; `AWARD_EFFECTIVE` → «Verifica dei requisiti (FVOE) / efficacia / termine dilatorio»; `CONTRACT_SIGNED` → «Stipula (contratto o ordine/documento di stipula MePA)». Nota: «in INAPP la determina di indizione assume gli impegni di spesa per annualità» | Nomenclatura reale; milestone "indizione" presente in tutti gli iter | Nessuno |
| **P-07** | Guida §9 "Documenti attesi" | `MEMORY_SUBMISSION` → MEMORIA, DOCUMENTO_TECNICO; `CONTRACT_SIGNED` → GARANZIA_DEFINITIVA (solo NEG/OPEN/FA), CONTRATTO | Aggiungere `REVIEW_COMPLETED` → `DETERMINA_INDIZIONE` (WITH, HIGH) e `AWARD` → `DETERMINA_AGGIUDICAZIONE` (WITH, HIGH). La garanzia (BEFORE, HIGH) vale per **tutte** le tipologie, salvo `performance_guarantee_exempt=true` sulla procedura. `DOCUMENTO_TECNICO` con sottotipi `CAPITOLATO` (gare) e `SCHEDA_OFFERTA` (ODA/TD). Elenco dei tipi documento: §8.4 | La garanzia è stata richiesta anche nell'affidamento diretto reale; le determine sono atti attesi | **Neutro verificato a mano**: nessuna procedura del seed ha `REVIEW_COMPLETED` come ultima completata; P-012 (ultima `AWARD`) ha già la determina di aggiudicazione; la garanzia BEFORE non è attiva per le procedure AD (P-001 è in memoria; le altre sono stipulate, chiuse o annullate). Su P-001 il flag `blocked` di `CONTRACT_SIGNED` diventerebbe vero, ma non entra nell'oracle. Ricontrollare con il calcolo |
| **P-08** | Guida §9 (formato YAML) e §8.3 (policy `MEMORY`) | Memoria = milestone radice con data in input; livelli T-10/T-5/T-2/T0/T+1 | (a) Nuovo campo del modello `duration_months` (1/4/7/9) e regola `memory_due = EDATE(activity_start, −duration_months)`, usata quando la procedura ha `activity_start` ma non la data della memoria (import reale); nel seed la data della memoria resta esplicita. (b) Policy `MEMORY`: nuovo livello **T-1M** (`EDATE(due, −1)`, LOW, solo in-app) prima di T-10 | È la regola reale del workbook (colonne J–R) | **Neutro**: DEC-011 emette solo il livello più alto (P-001 resta T-5, P-002 T+1); nessuna notifica aggiuntiva. Verificare i conteggi 17 in-app / 19 e-mail |
| **P-09** | Guida §8.1 e DEC-010 | Offset e durate in giorni solari | Unità ammesse per offset e soglie: `DAYS_CALENDAR` (default), `DAYS_BUSINESS`, **`MONTHS`** (semantica `EDATE`: stesso giorno del mese, fine mese se il giorno manca, poi spostamento al giorno lavorativo) | Il workbook ragiona in mesi | Nessuno |
| **P-10** | Guida DEC-030 e §6.1 `PaymentForecastLine` | `PaymentForecastLine(date, amount, year=derivato, anchor…)`; anno = anno della data di pagamento | Aggiungere `granularity: DATE \| YEAR`, `accrual_date` (esigibilità o scadenza della prestazione) accanto a `payment_date`, e la configurazione `finance.annuality_basis: PAYMENT_DATE \| ACCRUAL_DATE` (default `PAYMENT_DATE` per l'MVP, `DA VALIDARE`). L'import del workbook crea righe `YEAR` da `Impegno AAAA` con data convenzionale `finance.year_line_default_date` (es. `12-31`) | INAPP imputa per annualità di esigibilità ("attività svolta al 31/12"); il workbook è annuale | Nessuno con il default `PAYMENT_DATE` |
| **P-11** | Guida DEC-031 e §6.1 `BudgetAllocation` | `BudgetAllocation(procedure, year, source, amount)` | Aggiungere `FundingLine(programme, operation, activity, chapter, source, funding_end_date)` e `BudgetAllocation.funding_line_id`. Controllo **aggiuntivo** di copertura per Operazione × anno (WARNING `OPERATION_PLAN_EXCEEDED`, disattivato nel seed). Fonti demo: `ORDINARIO_DEMO` → "Istituzionale (demo)", `PROGETTO_UE_DEMO` → "PN demo – Operazione n" | Il piano reale è per Operazione (CR-03) | Nessuno se il controllo è disattivato nel seed |
| **P-12** | Guida DEC-032 e §8.6 | Importi lordi; `net + vat = gross` | Precisare: (a) il **programmato può includere** componenti fuori contratto: `ANAC_FEE` (contributo di gara) e `TECH_INCENTIVES` (con ripartizione per fonte); nuova entità `CostComponent(procedure, kind, year, source, amount)`; invariante: Σ righe forecast + pagato = programmato − Σ componenti (se modellate). (b) Gli importi SAL possono arrivare **netti**: lordo = `round(net × (1 + iva))` HALF_UP e l'ultimo SAL assorbe lo scarto. Nel seed i componenti valgono 0 | Realtà del workbook e dell'addendum; evita `AMOUNTS_NOT_RECONCILED` spurie sui dati reali | Nessuno (componenti a 0 nel seed) |
| **P-13** | Guida §5.3 "Movimenti finanziari" | Tipi di movimento senza attributi d'atto | Attributi facoltativi: `act_type`, `act_number_demo`, `act_date`, `chapter`, `funding_line_id`, `multi_year`. Precisare: «il `COMMITMENT` può nascere alla **determina di indizione**; dopo l'aggiudicazione una *rideterminazione* può ridurlo (`RELEASE` dell'economia, da validare)» | Atti reali (prenotazioni e impegni numerati con data) | Nessuno |
| **P-14** | Guida §6.1 (entità) | Elenco attuale | Aggiungere o estendere: `FundingLine` (P-11); `CostComponent` (P-12); `AdministrativeAct` (oppure metadati di `Document`: tipo atto, numero demo, data di registrazione, ruolo firmatario, atti richiamati); `Contract` + `instrument`, `mepa_order_ref_demo`, `cpv`, `duration_months`, `performance_guarantee_required`, `security_costs`; `ContractVersion.reason` ∈ {`SCHEDULE_CHANGE`, `PAYMENT_PLAN_CHANGE`, `END_DATE_CHANGE`, `SCOPE_CHANGE`, `TERMINATION`}; `Procedure.rup_user_id` (oppure ruolo@procedura); `Procedure.source_key` (Operazione-Codice incarico); `Procedure.activity_start/end`. Ammettere documenti **associati a più procedure** quando sono atti (es. determina di accordo quadro), non solo allegati | Lacune emerse dagli atti (CR-25) | Nessuno |
| **P-15** | Guida §10.1 (file `procedures.xlsx`) | «workbook baseline: una riga per procedura con importo, riparto annuo e data della memoria» | `seed/procedures.xlsx` **imita il layout reale**: foglio `Gare_23-27` con le **stesse intestazioni** del workbook INAPP (sottoinsieme di §8.3), una riga per P-001…P-012, chiave (Operazione demo, Codice Incarico `S01…S12`) più colonna `ID demo` (P-xxx); colonne `Impegno 2026/2027/2028` = fabbisogno annuo; `Iter procedura affidamento` con testo nello stile reale; `Status procedura` coerente; riga `TOTALI`; un foglio `Esperti_23-27` con 2 righe demo (da scartare) e un foglio nascosto `*_OLD` (da ignorare). **Solo valori, niente formule** (openpyxl non scrive i valori in cache delle formule) | Esercitare l'import sul formato vero già nel seed | Neutro se i valori sono gli stessi della §10.2 (verificare il riparto annuo) |
| **P-16** | Guida §11 I1 (US-010) — nuova sottosezione "Regole di import del workbook" | Non specificate | Regole Q1–Q21 della §2.8 di questo documento; mappatura in `config/import/workbook_mapping.yaml` (intestazione normalizzata → campo, sinonimi, fogli inclusi ed esclusi, fine dati, regex `^Impegno (\d{4})$`); report di import con conteggi per foglio (importate, scartate per categoria, errori per cella). Nuovo fixture `seed/fixtures/procedures_messy.xlsx` (solo test) con i casi Q3, Q4, Q7, Q10, Q11, Q13, Q15, Q16 | US-010: "errori riportano riga/campo"; robustezza sul file reale | Nessuno (fixture fuori dal seed) |
| **P-17** | Guida §8.7 (anomalie) | 8 codici | Aggiungere, **disattivati nel seed**: `PROCEDURE_TYPE_THRESHOLD_MISMATCH` (MEDIUM: tipologia incoerente con il netto e le soglie configurate); `SOURCE_STATUS_MISMATCH` (LOW: stato del workbook diverso dallo stato calcolato). `DATE_SEQUENCE_INCONSISTENT` si applica anche alle **date citate negli atti** (es. nota del RUP datata prima del contratto che richiama) | Casi reali (anno errato nell'addendum; trattativa diretta oltre i 140 k) | **Neutro solo se disattivati**: la regola di soglia attiva genererebbe anomalie su P-002, P-004 e P-009, oltre alle 3 attese in §10.4 |
| **P-18** | Guida §10.7 (documenti seed) e DEC-070 | 18 documenti con nomi `P-xxx_<tipo>_demo.pdf`; layout non specificato | Nuovo elenco e layout nello stile degli atti reali (§6.2). Organizzazione `seed/documents/P-xxx/<tipo>.pdf` (come la cartella reale) più 2 documenti in `seed/documents/da_associare/` senza ID nel nome, per esercitare l'associazione per CIG e oggetto (US-021) | Credibilità e test dell'estrazione su layout veri | Coda di validazione: proposte coerenti con i valori validati, **unico CONFLICT resta P-005**; anomalie invariate (vedi P-07). Aggiornare "18 documenti" → 22 nei conteggi |
| **P-19** | Guida §11 I6 (US-022) — nuova nota "Strategia di estrazione" | «estrazione testuale + OCR» | Ordine: XML incorporato → text layer con coordinate (`page.get_text("words")`) → OCR del rendering a 300 dpi. OCR **obbligatorio** se il produttore è una stampante PDF o se la copertura del testo è sotto soglia (non basarsi sulla presenza di immagini). Parser di date in lettere italiane e di importi con e senza migliaia. Pattern della §3.8. Le date dei metadati PDF non sono date dell'atto | 3 atti reali su 6 senza text layer; text layer parziale in memoria e documento tecnico | Nessuno |
| **P-20** | Guida §8.5 (riprogrammazione) | Sorgente = una milestone del modello | Ammettere come sorgente anche `ACTIVITY_START` (data di inizio attività) per le procedure importate dal workbook, propagata come vincolo su `CONTRACT_SIGNED`; la colonna "Proposta riprogrammazione" diventa una simulazione `DRAFT` con autore `import` (mai approvata automaticamente). Evento facoltativo P1 `restart_procedure` (gara deserta o revoca con impegni mantenuti → nuova versione, memoria riaperta) | Prassi reale (24 righe con proposta; riavvii nell'iter) | Nessuno (P1, non nel seed) |
| **P-21** | Guida §7.1/§7.3 (ruoli) | `PROCUREMENT_OFFICER` (Ufficio Gare, RUP); `EXECUTIVE` | Precisare: il **RUP** è nominato per procedura (nota dopo la memoria) e propone aggiudicazione e addendum; il **Direttore Generale** (`EXECUTIVE`) firma determine, ordine MePA e addendum; la **Struttura** firma la memoria e concorda il piano delle attività con l'operatore. Nella matrice: "Registrare contratto e addendum" resta a PROC, con nota "su atto firmato da EXECUTIVE" | Firme reali (CR-20/22) | Nessuno |
| **P-22** | Guida §10.2 P-001 / registro DEV-002 | P-001 senza contratto, riparto su 120.000 | Aggiungere: «P-001 riprende un caso reale (ODA MePA, riparto 20/80, SAL 20/50/30 da addendum): il "contratto 119.560" della specifica era lo stato **dopo** la stipula». Tipologia invariata (`DIRECT_AWARD_MEPA`), etichetta "ODA/TD MePA" | Tracciabilità di CR-13 | Nessuno |
| **P-23** | Guida §10.2 P-004 (e CR-31) | P-004 `DIRECT_AWARD` → AD-1M, 238.000 lordi (≈ 195 k netti) | Cambiare la tipologia di P-004 in `NEGOTIATED` (RdO al minor prezzo) → NEG-4M: le milestone, tutte completate, salgono da 5 a 7 (date effettive aggiuntive nel seed). P-002 (≈ 393 k netti, negoziata) e P-009 (250 k netti, ordine MePA) restano invariati, con l'implausibilità annotata in una DEV, perché cambiarli altererebbe `date_changes = 7` (S-02) | Credibilità davanti all'Ufficio Gare (CR-31 confermata dagli atti) | Neutro per P-004 (tutte le milestone completate); DEV per documentare P-002/P-009 |
| **P-24** | Guida DEC-002 / §8.5 criticità `FUNDING_END_EXCEEDED` | "se configurata" | Configurare `funding_end_date` per fonte con un esempio realistico: PN demo = 31/12/2029 (estensione analoga a quella reale), nessun effetto sulle date del seed | Il vincolo reale esiste (fine azioni del PN, poi estesa) | Nessuno (nessuna riga del seed oltre il 2029) |
| **P-25** | Analisi `01_analisi_criticita.md` (nuova §8 "Riscontri dai documenti reali") e §7 domande | — | Aggiungere la tabella della §5.4 di questo documento. Domande: 4 (modelli) → "in gran parte risolta: confermare durate interne e milestone"; 7 (lordi) → "confermata, con contributo ANAC"; 9 (date di pagamento) → "il workbook non ne ha: confermare la base di annualità". Nuove domande della §7 | Coerenza documentale | Nessuno |
| **P-26** | Registro `03_registro_decisioni.md` (dopo la validazione) | — | Nuove voci: `DEV-004` "Adeguamento ai documenti reali (P-05…P-08, P-18, P-23)" con l'esito della verifica dell'oracle; `DEC-1xx` per `annuality_basis`, unità `MONTHS`, componenti di costo, profilo `realistic` | Registro append-only | Documenta |
| **P-27** | `04_avanzamento.md` · "Blocchi aperti / Note di sessione" | "Blocchi aperti: nessuno" | Nota: «Disponibile `docs/05_analisi_documenti_reali.md`; integrazione nella guida pendente (P-01…P-27). Prima di I0: applicare almeno P-01/P-02 (`.gitignore`)» | Continuità tra agenti | Nessuno |

### 6.2 Proposta per i documenti seed (guida §10.7)

Principi:
- **layout e terminologia reali, dati inventati**;
- ogni documento riporta la dicitura "DEMO – documento sintetico" nel piè di pagina e usa la carta intestata "INAPP DEMO";
- nessun nome di persona: ruoli generici ("Il Direttore Generale – Dirigente Demo", "Il Responsabile della Struttura Demo");
- CIG e CUP nel formato `CIG-DEMO-Pxxx` e `CUP-DEMO-Pxxx`;
- numeri di registro e d'ordine con prefisso `DEMO`;
- PyMuPDF con metadati fissi (DEC-070).

**Modelli di layout:**

| Modello | Struttura da imitare |
|---|---|
| **M1 Memoria** | "MEMORIA PER IL DIRETTORE GENERALE"; Oggetto + CUP demo; sezioni 1–8 (Quadro generale, Aspetti operativi, Risorse necessarie con elenco puntato, Proposta operativa con verifica Consip/MePA e procedura richiesta, Stima dei costi con netto/lordo/contributo ANAC/costi della sicurezza/fine attività, Responsabile tecnico, Fonti di finanziamento con riparto per annualità in % + netto + lordo e tabella PN/Istituzionale/Altro, Gestione privacy); firma del Responsabile della Struttura. **Data**: nella segnatura di protocollo in testa (`INAPP-DEMO.PROTOCOLLO.0000nnn.<STRUTTURA>.gg-mm-aaaa`), assente nelle bozze |
| **M2 Documento tecnico** | (a) capitolato INAPP per le gare: oggetto, attività, deliverable, durata; (b) scheda offerta dell'operatore per ODA/TD: tabella TITOLO / DESCRIZIONE, carta intestata "Fornitore Demo …" |
| **M3 Determina** (indizione, aggiudicazione, revoca) | segnatura `INAPP-DEMO.REGISTRO DETERMINE.0000nnn.DIREZIONE GENERALE.gg-mm-aaaa.REGISTRAZIONE` su ogni pagina; copertina "DETERMINA DEL DIRETTORE GENERALE" + riquadro Oggetto; preambolo VISTI / TENUTO CONTO / CONSIDERATO / PRESO ATTO / ESAMINATA la memoria (data in lettere) / prenotazioni o impegni n. DEMO per annualità e capitolo; DETERMINA 1…n; "n di N"; firma del Direttore Generale |
| **M4 Ordine o documento di stipula MePA** | riquadri chiave–valore (procedura, fase, amministrazione, fornitore, consegna, riepilogo economico, dettaglio articolo con durata in mesi); importi **senza separatore delle migliaia**; **XML allegato** UBL semplificato (`IssueDate`, CIG, CUP, `TaxExclusiveAmount`, `TaxAmount`, `TaxInclusiveAmount`, durata) |
| **M5 Contratto INAPP** (negoziata o aperta) | articoli: oggetto, durata e decorrenza, importo netto/IVA/lordo, modalità di pagamento (SAL), garanzia definitiva, penali; CIG e CUP in intestazione |
| **M6 Addendum** | titolo "Addendum al contratto «…»" + riga C.I.G./C.U.P.; TRA … e …; PREMESSO 1–3; CONVENGONO Art. 1–4: Art. 2 piano delle attività a)…d) con "entro il <data in lettere>"; Art. 3 percentuali SAL con importi **IVA esclusa e IVA inclusa** (per evitare scarti di centesimi in estrazione); "nessun onere aggiuntivo"; tabella di firma con timbri "Firmato digitalmente gg.mm.aaaa hh:mm:ss" |
| **M7 Variante "stampa su PDF"** | stesso contenuto di M1 o M3 ma con testo convertito in tracciati, senza text layer e senza immagine a piena pagina: verifica che l'OCR scatti sulla copertura del testo |

**Elenco proposto** (22 documenti; in grassetto i nuovi o rinominati):

| # | Percorso | Proc. | Tipo | Modello | Caratteristica / scopo |
|---|---|---|---|---|---|
| 1 | `P-001/memoria_bozza.pdf` | P-001 | MEMORIA (bozza) | M1 | filigrana BOZZA, nessuna segnatura; riparto per annualità 20/80 su 120.000 |
| 2 | `P-002/scheda_fabbisogno.pdf` | P-002 | FABBISOGNO | M1 ridotto | invariato nella sostanza |
| 3 | **`P-002/modulo_modifica.pdf`** (era nota di riprogrammazione) | P-002 | MODULO_MODIFICA | M3 ridotto | proposta di nuova data di inizio attività (testo), importi per annualità prima e dopo |
| 4 | `P-003/memoria.pdf` | P-003 | MEMORIA | M1 | segnatura con data 10/09/2026; procedura aperta con OEPV |
| 5 | `P-003/capitolato_tecnico.pdf` | P-003 | DOCUMENTO_TECNICO (CAPITOLATO) | M2a | — |
| 6 | **`P-004/determina_indizione.pdf`** | P-004 | DETERMINA_INDIZIONE | M3 | impegni 2026/2027 coerenti con il `COMMITMENT` del seed |
| 7 | `P-004/contratto.pdf` | P-004 | CONTRATTO | M5 (o M4 se resta AD) | netto, IVA e lordo, decorrenza 20/05/2026, 12 mesi, CIG demo |
| 8 | **`P-004/addendum_piano_sal.pdf`** (era `piano_sal`) | P-004 | ADDENDUM (piano SAL) | M6 | 20/50/30 con date e importi netti e lordi (47.600 / 119.000 / 71.400) |
| 9 | `P-004/attestazione_regolare_esecuzione_sal1.pdf` (era verbale) | P-004 | VERBALE_SAL | M3 ridotto | — |
| 10 | `P-004/relazione_sal2.pdf` | P-004 | DELIVERABLE | carta intestata del fornitore | caricato dal fornitore |
| 11 | `P-005/determina_aggiudicazione.pdf` | P-005 | DETERMINA_AGGIUDICAZIONE | M3 | **310.500,00** nel "PRESO ATTO della spesa" (conflitto atteso); clausola di garanzia definitiva |
| 12 | **`P-006/documento_stipula_mepa.pdf`** | P-006 | CONTRATTO (ODA/TD) | M4 + XML | 32.500 + 7.150 = 39.650 |
| 13 | `P-006/certificato_regolare_esecuzione.pdf` | P-006 | CRE | M3 ridotto | — |
| 14 | `P-007/memoria_scansionata.pdf` | P-007 | MEMORIA | M1 **raster** | solo immagine (OCR, T-015) |
| 15 | **`P-008/determina_indizione.pdf`** | P-008 | DETERMINA_INDIZIONE | M3 | prenotazioni per annualità su due fonti demo |
| 16 | `P-008/bando.pdf` | P-008 | BANDO | estratto GUUE/portale | — |
| 17 | `P-009/ordine_mepa.pdf` | P-009 | CONTRATTO (ODA) | M4 + XML | 250.000 + 55.000 = 305.000; firmato il 01/07/2026 |
| 18 | `P-010/contratto.pdf` | P-010 | CONTRATTO | M5 | stipula 10/06/2026 (incoerenza voluta) |
| 19 | **`P-010/determina_aggiudicazione.pdf`** | P-010 | DETERMINA_AGGIUDICAZIONE | M3 | data di registrazione 20/06/2026: rende l'anomalia `DATE_SEQUENCE_INCONSISTENT` verificabile su documenti |
| 20 | **`P-011/determina_revoca.pdf`** (era nota di annullamento) | P-011 | DETERMINA_REVOCA | M3 | revoca con rilascio della prenotazione |
| 21 | `P-012/determina_aggiudicazione.pdf` | P-012 | DETERMINA_AGGIUDICAZIONE | M3 | — |
| 22 | **`da_associare/determina_indizione_cig_demo_p012.pdf`** | P-012 | DETERMINA_INDIZIONE | **M7** | nessun ID nel nome; associazione per CIG o oggetto; senza text layer (OCR) |

`seed/fixtures/` (solo test, in aggiunta a quanto previsto da §10.7):
- `addendum_anno_errato.pdf`: premessa con anno precedente alla stipula → anomalia o validazione;
- `memoria_text_layer_parziale.pdf`: importo lordo presente solo come tracciati → l'OCR deve recuperarlo;
- `ordine_mepa_ordine_scomposto.pdf`: etichette e valori fuori ordine nel flusso di testo;
- `procedures_messy.xlsx` (P-16).

---

## 7. Domande ancora aperte per INAPP

In ordine di impatto.

| # | Domanda | Default proposto | Rif. |
|---|---|---|---|
| 1 | La data di riferimento per i "N mesi" è l'**inizio attività** (stipula)? Le durate valgono dalla memoria alla stipula o dalla memoria all'aggiudicazione? | dalla memoria all'inizio attività, come nel workbook | P-08, CR-04 |
| 2 | Il T-5 della specifica si **aggiunge** all'alert "1 mese prima" del workbook o lo sostituisce? | si aggiunge (T-1M, T-10, T-5, T-2, T0, T+1) | P-08 |
| 3 | Le annualità della previsione vanno per **esigibilità/impegno** (prassi degli atti) o per **cassa**? Come si trattano i SAL maturati a fine anno e pagati l'anno dopo (residui)? | MVP per cassa (oracle), configurabile | P-10 |
| 4 | Il controllo di copertura va fatto per Operazione × anno (Piano V.x) o per procedura? Chi aggiorna il "Totale da Piano"? | per procedura + WARNING per Operazione | P-11 |
| 5 | Per le negoziate, il criterio (minor prezzo / OEPV) è noto già in programmazione? Per gli accordi quadro, quale modello si usa (adesione Consip o AQ proprio)? | campo `award_criterion` obbligatorio dall'indizione | P-05 |
| 6 | Quali sono le milestone intermedie ufficiali (nomina del RUP, CIG, avvio TD/RdO, termine offerte, commissione, FVOE, termine dilatorio) e quali sono bloccanti? | quelle della guida §9 con le etichette di P-06 | CR-04 |
| 7 | La garanzia definitiva è sempre richiesta anche negli affidamenti diretti, o con quali esoneri? | sempre, salvo esonero | P-07 |
| 8 | Gli impegni si assumono sempre alla determina di indizione? Quando e come si fa la "rideterminazione" (economie, fine anno)? | impegno all'indizione, `RELEASE` dell'economia da validare | P-13 |
| 9 | La struttura richiedente come si ricava dal workbook (non c'è una colonna)? Esiste una mappatura Operazione/Attività → Struttura? | tabella di mappatura + coda di validazione | CR-23 |
| 10 | La "Proposta riprogrammazione data inizio attività" va trattata come simulazione da approvare? Chi la approva (Direttore Generale, Autorità di gestione tramite modulo di modifica)? | simulazione `DRAFT`; approva `EXECUTIVE` | P-20, D-03 |
| 11 | Il piano SAL è sempre definito con un addendum dopo la stipula, o a volte nel contratto o nel capitolato? Le percentuali sono sempre sul netto? | entrambe le fonti; percentuali sul netto, conversione al lordo | P-12, US-062 |
| 12 | Gli incarichi a esperti e i prodotti del PN restano fuori dall'MVP? Va almeno mostrato il collegamento prodotto ↔ gara? | fuori; import con conteggio scarti | §2.3 |
| 13 | Quali sistemi sono sorgenti ufficiali per numeri e date degli atti (registro determine, protocollo, sistema documentale, MePA)? È disponibile l'XML degli ordini MePA? | atto firmato + XML MePA quando presente | D-02, P-19 |
| 14 | Si possono avere esempi **anonimizzati** degli atti di gara (aperta, RdO) e di un SAL e della sua liquidazione? | — | D-09 |

---

## 8. Appendici

### 8.1 Glossario dei termini reali

| Termine | Significato nel contesto INAPP | Corrispondenza nel modello |
|---|---|---|
| Memoria (per il Direttore Generale) | Richiesta motivata della Struttura di avviare l'acquisto, con stima dei costi e fonti | `MEMORY_SUBMISSION` + documento `MEMORIA` |
| Capitolato / documento tecnico | Specifica delle prestazioni (INAPP) o scheda dell'offerta (operatore, ODA/TD) | `DOCUMENTO_TECNICO` (sottotipi) |
| Determina di indizione (a contrarre) | Atto del Direttore Generale che avvia la procedura e assume gli impegni | `REVIEW_COMPLETED` (etichetta P-06) + `DETERMINA_INDIZIONE` |
| Determina di aggiudicazione | Atto che individua l'operatore e autorizza la stipula | `AWARD` + `DETERMINA_AGGIUDICAZIONE` |
| ODA / TD / RdO | Ordine diretto, trattativa diretta, richiesta di offerta sul MePA | `MEPA_ORDER` / `DIRECT_AWARD_MEPA` / `NEGOTIATED` |
| OEPV | Offerta economicamente più vantaggiosa (con commissione) | `award_criterion=MEAT` |
| FVOE | Fascicolo virtuale dell'operatore economico (verifica dei requisiti) | `AWARD_EFFECTIVE` |
| Prenotazione / impegno (pluriennale) di spesa | Vincoli contabili per annualità con numero e data | `RESERVATION` / `COMMITMENT` |
| Rideterminazione / rimodulazione impegni | Modifica degli impegni (importo o annualità) con determina | `RELEASE` / storno + nuovo `COMMITMENT` |
| Contributo ANAC ("tassa gara") | Contributo fisso dovuto dalla stazione appaltante | `CostComponent ANAC_FEE` |
| Incentivi per funzioni tecniche | Quota destinata al personale, divisa tra PN e bilancio istituzionale | `CostComponent TECH_INCENTIVES` |
| Piano di dettaglio per annualità V1/V3/V4 | Versioni approvate della programmazione del PN | versioni della baseline / `ProcedureVersion` |
| Modulo di modifica | Richiesta formale di modifica del piano | approvazione di una riprogrammazione a livello di piano |
| Addendum | Modifica contrattuale (tempi, pagamenti, fine) anche senza variazione d'importo | `ContractVersion` |
| Operazione / Attività (PN GDL) | Linea di finanziamento del programma | `FundingLine` |

### 8.2 Dizionario dei sinonimi per la normalizzazione delle tipologie (import)

| Testo nel workbook (minuscolo, contiene) | `procedure_type` | `award_criterion` | `instrument` |
|---|---|---|---|
| "trattativa diretta" | `DIRECT_AWARD_MEPA` | `LOWEST_PRICE` | `MEPA` |
| "oda", "ordine diretto" | `MEPA_ORDER` | — | `MEPA` |
| "affidamento diretto" (senza MePA) | `DIRECT_AWARD` | — | `OFF_MEPA` |
| "rdo" oppure "negoziata", **senza** "vantaggios" | `NEGOTIATED` | `LOWEST_PRICE` | `MEPA` |
| "rdo" oppure "negoziata", **con** "vantaggios" | `NEGOTIATED` | `MEAT` | `MEPA` |
| "aperta" oppure "ambito europeo" | `OPEN` | `MEAT` se contiene "vantaggios", altrimenti da validare | `OFF_MEPA` |
| "accordo quadro" | `FRAMEWORK_AGREEMENT` | da validare | `CONSIP_AQ` / `OFF_MEPA` |
| "gara eliminata" | (stato `CANCELLED`) | — | — |
| vuoto | da AF ("Procedure previste") se ha un'unica opzione, altrimenti `MISSING` → validazione | — | — |

### 8.3 Intestazioni da riprodurre in `seed/procedures.xlsx` (P-15)

Foglio `Gare_23-27`, intestazioni identiche a quelle reali, nell'ordine:

`Operazione` · `Attività` · `Codice Incarico` · `Oggetto incarichi a Società` · `quali(QA)/quanti(QT) Altro (A)` · `Data prevista inizio Attività (V3)` · `Data inizio attività (V.4 attuazione)` · `Data fine attività (V.4 attuazione)` · `Data effettiva presentazione memoria` · `CIG` · `Importo Programmato originariamente` · `Importo Base d'asta` · `Importo Aggiudicato` · `Proposta Riprogrammazione data inizio attività` · `Impegno 2026` · `Impegno 2027` · `Impegno 2028` · `importo della tassa ` (con lo spazio finale reale) · `Procedure previste` · `Iter procedura affidamento` · `Status procedura` · `Procedura adottata` · `Note post confronto struttura e eventuali moduli di modifica` · `ID demo` (aggiunta) · `Data scadenza memoria (demo)` (aggiunta: la data esplicita della §10.2, per non dipendere dal calcolo a ritroso).

Il riparto annuo nelle colonne `Impegno AAAA` coincide con il fabbisogno annuo della §10.3 (P-001: 2026 = 24.000; 2027 = 96.000; …). La colonna `importo della tassa` vale 0 per tutte le procedure del seed (P-12).

### 8.4 Tipi di documento proposti

`MEMORIA` · `FABBISOGNO` · `DOCUMENTO_TECNICO` (`CAPITOLATO` | `SCHEDA_OFFERTA`) · `NOMINA_RUP` · `DETERMINA_INDIZIONE` · `BANDO` | `LETTERA_INVITO` | `RDO` · `VERBALE_COMMISSIONE` · `DETERMINA_AGGIUDICAZIONE` · `GARANZIA_DEFINITIVA` · `CONTRATTO` (`CONTRATTO_PUBBLICO` | `ODA_MEPA` | `TD_MEPA` | `CONTRATTO_ESECUTIVO_AQ`) · `ADDENDUM` · `DETERMINA_RIMODULAZIONE_IMPEGNI` · `DETERMINA_REVOCA` · `MODULO_MODIFICA` · `NOTA` · `DELIVERABLE` · `VERBALE_SAL` · `FATTURA` · `CRE`.
