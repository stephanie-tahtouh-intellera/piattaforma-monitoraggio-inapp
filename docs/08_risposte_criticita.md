# Risposte alle criticità e alle domande aperte — verifica su norme e fonti

**Documenti di riferimento:** [01_analisi_criticita.md](01_analisi_criticita.md) (CR-01…CR-36, domande §7), [02_guida_sviluppo_agente.md](02_guida_sviluppo_agente.md) (DEC-xxx, modelli §9), [00_specifica_originale_v1_0.md](00_specifica_originale_v1_0.md).
**Data di redazione:** 01/10/2026. **Stato:** proposta, da validare con INAPP.
**Scopo:** rispondere in autonomia, quando possibile, a ogni criticità e domanda aperta, distinguendo ciò che stabiliscono le norme o le fonti INAPP da ciò che è un'inferenza; indicare quali default della guida confermare o cambiare.

> **Avvertenza.** Questo documento non è un parere legale. Gli articoli citati sono stati verificati sui testi consolidati disponibili online (Normattiva, EUR-Lex, testi coordinati del Codice). Dove la numerazione di un comma non è stata verificata direttamente, è indicato "(comma da verificare)". Le affermazioni marcate **[Inferenza]** sono deduzioni nostre, non contenute nella fonte.

**Legenda della confidenza**
- **Confermata** = stabilita da una norma o da una fonte INAPP consultata (atti, workbook, documenti pubblici).
- **Probabile** = coerente con norme e prassi, ma non stabilita esplicitamente; il default regge salvo diversa indicazione di INAPP.
- **Solo INAPP** = scelta organizzativa o di prodotto che nessuna fonte pubblica può risolvere.

**Riservatezza.** Workbook e atti di gara sono stati usati solo come evidenza. Non sono riportati nomi di persone, operatori economici, CIG/CUP, numeri di atto o importi identificativi. Le statistiche del workbook sono aggregate.

---

## 1. Sintesi

| Ambito | Totale | Confermata | Probabile | Solo INAPP |
|---|---|---|---|---|
| Criticità CR-01…CR-36 | 36 | **8** (CR-04, 08, 13, 17, 21, 29, 31, 32) | **24** | **4** (CR-01, 07, 14, 24) |
| Domande §7 (1–12) | 12 | **3** (D4 in parte, D7, D8) | **4** (D2, D5, D6, D9) | **5** (D1, D3, D10, D11, D12) |

**Le correzioni più importanti:**

1. **Soglie (CR-31): l'analisi va precisata, non rovesciata.** La soglia dell'affidamento diretto di servizi e forniture è **140.000 € IVA esclusa** (art. 50, c. 1, lett. b; calcolo al netto dell'IVA per l'art. 14, c. 4). Dal **1° gennaio 2026** le soglie UE sono **5.404.000 €** per i lavori, **140.000 €** per le autorità governative centrali e **216.000 €** per quelle sub-centrali (regolamenti delegati (UE) 2025/2150-2152); nel 2024-2025 erano 5.538.000 / 143.000 / 221.000 €. **INAPP non compare nell'Allegato I della direttiva 2014/24/UE**, quindi si applica la soglia **sub-centrale di 216.000 €**. Ne segue che:
   - **P-004** (195.081,97 € netti) non può essere un affidamento diretto;
   - **P-009** (250.000 € netti) è sopra soglia UE: non può essere un ordine MePA, ma è plausibile come ordinativo su convenzione o accordo quadro Consip;
   - **P-002** (393.442,62 € netti) è sopra soglia UE e una "negoziata" è giustificabile solo nei casi dell'art. 76.

   Il workbook INAPP usa ancora **215.000 €**, il valore 2022-2023: va parametrizzato per data.
2. **Modelli 1/4/7/9 mesi (CR-04): la corrispondenza della guida è sbagliata.** Il workbook INAPP la dichiara in chiaro:
   - **1 mese** = affidamento diretto (circolare interna INAPP sui tempi procedimentali del 26/04/2022);
   - **4 mesi** = negoziata o RDO al minor prezzo;
   - **7 mesi** = negoziata o RDO con offerta economicamente più vantaggiosa (OEPV) e commissione;
   - **9 mesi** = procedura aperta europea (richiamo all'Allegato I.3).

   La guida invece associa la procedura aperta a 7 mesi e l'accordo quadro a 9. Il workbook ricava la data della memoria come "data di inizio attività − N mesi" e fissa un **alert 1 mese prima della memoria**.
3. **"Efficacia dell'aggiudicazione" (milestone `AWARD_EFFECTIVE`): il concetto è superato dal D.lgs. 36/2023.** I requisiti si verificano **prima** dell'aggiudicazione, che è **immediatamente efficace** (art. 17, c. 5). Tra aggiudicazione e stipula valgono invece:
   - il **termine dilatorio (stand still) di 32 giorni**, solo sopra soglia (art. 18, c. 3, come modificato dal D.lgs. 209/2024; non si applica sotto soglia né agli appalti basati su accordo quadro);
   - la stipula **entro 60 giorni** (art. 18, c. 2).

   I minimi dei modelli OPEN e FA (15 giorni tra aggiudicazione e stipula, 15 giorni per le offerte) **violano** l'art. 18, c. 3 e l'art. 71, c. 2 (minimo 30 giorni per le offerte nella procedura aperta).
4. **Durate reali INAPP molto più lunghe dei modelli.** Mediane dal workbook, dalla memoria alla stipula:
   - affidamento diretto/trattativa diretta: **113 giorni** (n=15);
   - negoziata/RDO: **261 giorni** (n=12);
   - procedura aperta: **327 giorni** (n=15).

   È un'evidenza utile per la demo: i modelli riflettono i target INAPP, la piattaforma deve far emergere lo scostamento.
5. **Contabilità (D-06, CR-03, CR-07).** INAPP applica il **DPR 97/2003** integrato dai principi del **D.lgs. 91/2011** e del **DPR 132/2013** (regolamento di amministrazione, contabilità e finanza di INAPP, art. 1). Le fasi della spesa sono impegno, liquidazione, ordinazione e pagamento, con la **prenotazione d'impegno** sulle procedure in corso (DPR 97/2003 artt. 30-33; regolamento INAPP artt. 21-26). Il **Direttore Generale è l'unico centro di spesa** (regolamento INAPP art. 3). Gli atti reali mostrano prenotazioni e impegni **per annualità, su capitolo e fonte** (fondo PN "Giovani, Donne e Lavoro", codice operazione). La "competenza finanziaria potenziata" non risulta formalmente estesa a INAPP: va chiesto alla Direzione Servizi finanziari.

**Default da cambiare (dettaglio in §9):**
- DEC-020 e §9: corrispondenza tipologie → modelli, minimi di legge, etichette di `AWARD_EFFECTIVE` e `REVIEW_COMPLETED`, garanzia definitiva in tutti i modelli;
- dataset §10.2: tipologie di P-004, P-009 e P-002;
- nuove configurazioni versionate: soglie UE e soglia dell'affidamento diretto, data di fine ammissibilità PN (31/12/2029), termini di pagamento e di verifica;
- DEC-010: livello T-30 opzionale;
- DEC-032: split payment e aliquota IVA per contratto;
- DEC-042: l'approvatore è il Direttore Generale.

Tutte le modifiche proposte sono state scelte per **non alterare i valori dell'oracle** (§10 della guida). Lo abbiamo verificato con un'analisi manuale [Inferenza], che va confermata eseguendo i test.

---

## 2. Tabella riassuntiva

| ID | Tema | Risposta in breve | Confidenza | Default guida |
|---|---|---|---|---|
| CR-01 | T-5 solari o lavorativi | Nessuna norma; il workbook INAPP ragiona in mesi solari, con alert 1 mese prima | Solo INAPP | Confermare + T-30 opzionale |
| CR-02 | Previsione senza piano SAL | INAPP pianifica per annualità (memoria con percentuale per anno, impegni annui); righe datate accettabili | Probabile | Confermare |
| CR-03 | Disponibilità per procedura o condivisa | Vincolo reale per capitolo × fonte (operazione PN) × esercizio; prenotazione per procedura | Probabile | Confermare + vista aggregata |
| CR-04 | Modelli di procedura | Corrispondenza 1/4/7/9 confermata dal workbook; la guida la applica male | Confermata | **Cambiare** |
| CR-05 | Input e alternative della riprogrammazione | Euristiche ragionevoli; nessuna norma | Probabile | Confermare |
| CR-06 | Regole di health | Scelta di prodotto coerente | Probabile | Confermare |
| CR-07 | Importo a rischio | Definizione direzionale; possibile terza voce "target di spesa PN" | Solo INAPP | Confermare |
| CR-08 | Oracle prima del codice | Coerente con la specifica, App. E | Confermata | Confermare |
| CR-09 | Stati milestone | Scelta tecnica | Probabile | Confermare |
| CR-10 | Stati SAL | Scelta tecnica; aggiungere la corrispondenza con le fasi contabili | Probabile | Confermare + nota |
| CR-11 | Fase e stato | Etichette INAPP reali: Memoria / Indizione / Aggiudicazione / Contratto | Probabile | Confermare + etichette |
| CR-12 | Conteggi del seed | Scelta di dataset | Probabile | Confermare |
| CR-13 | P-001 con contratto prima della memoria | Impossibile: la stipula segue l'aggiudicazione (art. 18), come mostrano gli atti reali | Confermata | Confermare DEV-002 |
| CR-14 | T0 o T+1 | Nessuna norma; dipende dalla circolare INAPP | Solo INAPP | Confermare |
| CR-15 | Nascita della baseline | Nella prassi la baseline è la versione del Piano di attuazione | Probabile | Confermare + nota |
| CR-16 | Due assi del dato | Scelta tecnica | Probabile | Confermare |
| CR-17 | Ritardi e previsione | Cambiare i tempi richiede un atto (addendum art. 120; rimodulazione impegni) | Confermata | Confermare |
| CR-18 | SHOULD usate nel DoD | Scelta di piano | Probabile | Confermare |
| CR-19 | Dipendenze fra incrementi | Scelta di piano | Probabile | Confermare |
| CR-20 | Ruoli | RUP (art. 15), direttore dell'esecuzione (art. 114), DG unico centro di spesa | Probabile | Confermare + etichette |
| CR-21 | Netto/lordo | Programmato lordo IVA: workbook (netto = lordo / 1,22) e determine | Confermata | Confermare + split payment |
| CR-22 | Matrice dei permessi | Quattro occhi coerente con la separazione delle funzioni | Probabile | Confermare |
| CR-23 | Destinatari degli alert | Ruolo@ambito; aggiungere RUP e Responsabile della Struttura | Probabile | Confermare + RUP |
| CR-24 | Escalation | Nessuna norma | Solo INAPP | Confermare |
| CR-25 | Entità mancanti | Scelta tecnica; aggiungere capitolo, fonte e prenotazione | Probabile | Confermare + campi |
| CR-26 | API incompleta | Scelta tecnica | Probabile | Confermare |
| CR-27 | Documenti seed | Aggiungere i tipi reali (determina di indizione, addendum) | Probabile | Confermare + tipi |
| CR-28 | Arrotondamenti | Nessuna norma specifica; ROUND_HALF_UP standard | Probabile | Confermare |
| CR-29 | Accessibilità | L. 4/2004 + Linee guida AgID → EN 301 549 → WCAG 2.1 AA | Confermata | Confermare + dichiarazione |
| CR-30 | Orologio | Scelta tecnica | Probabile | Confermare |
| CR-31 | Tipologie e soglie | 140.000 € netti corretti; soglia UE INAPP 216.000 € (2026-27); P-002, P-004, P-009 non plausibili | Confermata | **Cambiare** dataset |
| CR-32 | Cronologia e spesa | Implausibilità confermata dai dati reali INAPP | Confermata | Confermare compromesso (DEV) |
| CR-33 | Ampiezza | Rischio di progetto | Probabile | Confermare |
| CR-34 | Specifica non validata | Rischio di progetto | Probabile | Confermare |
| CR-35 | Ambiente | Scelta tecnica | Probabile | Confermare |
| CR-36 | Stack | Scelta tecnica | Probabile | Confermare |
| D1 | T-5 | v. CR-01 | Solo INAPP | — |
| D2 | Disponibilità | v. CR-03 | Probabile | — |
| D3 | Importo a rischio | v. CR-07 | Solo INAPP | — |
| D4 | Fasi e durate | Corrispondenza dal workbook; durate ufficiali nella circolare INAPP (da acquisire) | Confermata (in parte) | **Cambiare** |
| D5 | Chi propone, approva, forza | DG con determina; RUP o Struttura propongono; deleghe possibili | Probabile | Cambiare l'etichetta |
| D6 | Overflow bloccante | Il bilancio è limite agli impegni (DPR 97/2003, art. 10, c. 5); serve una variazione | Probabile | Confermare |
| D7 | Lordi IVA | v. CR-21 | Confermata | — |
| D8 | Tipologie | v. CR-31 | Confermata | **Cambiare** |
| D9 | Date di pagamento | Prassi per annualità e SAL da addendum | Probabile | Confermare |
| D10 | Alert al Direttore | Nessuna norma | Solo INAPP | — |
| D11 | Accesso del fornitore | Fatture via SDI; deliverable via PEC; decisione organizzativa | Solo INAPP | — |
| D12 | OCR/LLM | Vincoli normativi chiari; la scelta del fornitore spetta a INAPP | Solo INAPP | Confermare |

---

## 3. Evidenze utilizzate

### 3.1 Fonti INAPP

| Rif. | Fonte | Cosa dimostra |
|---|---|---|
| **I-1** | Regolamento di amministrazione, contabilità e finanza (RAFC), [PDF](https://www.inapp.gov.it/wp-content/uploads/AT/01_Disposizioni_generali/Atti_generali/22_21_20_19_18/20200403_INAPP_Regolamento_Amministrazione_Contabilita_%20e_Finanza.pdf) | Art. 1: sistema contabile secondo DPR 97/2003, integrato da D.lgs. 91/2011 e DPR 132/2013. Art. 2-3: DG "unico Centro di spesa"; centri di responsabilità con possibile delega a impegnare. Artt. 21-26: impegno (con "data di scadenza"), prenotazione che decade a fine esercizio, liquidazione, ordinazione (mandato/OPI), pagamento. Art. 16: variazioni di bilancio. *Nota: una ricerca segnala una modifica del 31/03/2026 (art. 32-bis); il PDF consultato è la versione 2020, da verificare.* |
| **I-2** | Programma triennale degli acquisti 2026-2028 (determina DG del 29/04/2026), [pagina](https://www.inapp.gov.it/amministrazione-trasparente/bandi-di-gara-e-contratti/atti-delle-amministrazioni-aggiudicatrici-e-degli-enti-aggiudicatori-distintamente-ogni-procedura/atti-relativi-alla-programmazione-di-lavori-opere-servizi-e-forniture/) | Soglia di programmazione 140.000 € IVA esclusa (art. 37); Ufficio Programmazione acquisti presso la Direzione amministrativa; ricorso frequente a convenzioni e accordi quadro **Consip** |
| **I-3** | Articolazione degli uffici, [pagina](https://www.inapp.gov.it/amministrazione-trasparente/amministrazione-trasparente/organizzazione/articolazione-degli-uffici/direzione-generale-uffici-dirigenziali-e-servizi/) | Direzione generale; **Direzione Acquisti e Patrimonio** (≈ Ufficio Gare); **Direzione Servizi finanziari** (≈ Amministrazione); Servizio Coordinamento Programmi d'investimento pubblico; Strutture di ricerca (≈ strutture richiedenti) |
| **I-4** | Workbook `04_09_26_Elenco_Prodotti_Gare_Esperti - PN GDL.xlsx` (locale) | Corrispondenza 1/4/7/9 mesi e regola della memoria (`EDATE(inizio, −N)`), alert 1 mese prima, soglia 215.000 € netti, importi lordi (netto = lordo / 1,22), impegni per annualità, stati reali (Memoria/Indizione/Aggiudicazione/Contratto), versioni del Piano (V1/V3/V4), confronto per codice operazione × anno |
| **I-5** | Atti di un affidamento diretto MePA reale 2025-26 (`Documenti Gara/`, locale) | Sequenza memoria → determina di indizione → aggiudicazione → stipula → addendum; prenotazioni e impegni per annualità su capitolo e fondo PN; garanzia definitiva chiesta anche sotto soglia (art. 53, c. 4); piano 20/50/30 definito **con addendum dopo la stipula**; memoria rivolta al DG con ripartizione per annualità; INAPP Organismo intermedio PN GDL 2021-2027, periodo delle attività esteso al 31/12/2029 |

### 3.2 Durate reali dal workbook (dati aggregati, giorni solari)

Le date sono estratte dalla colonna "Iter procedura" del foglio Gare 2023-27. Sono escluse le righe senza date e gli intervalli negativi.

| Tipologia adottata | Memoria → indizione | Indizione → aggiudicazione | Aggiudicazione → stipula | **Memoria → stipula** |
|---|---|---|---|---|
| Affidamento diretto / trattativa diretta | mediana 27 (n=19) | 48,5 (n=16) | 19 (n=14) | **113** (n=15; min 64, max 175) |
| Negoziata / RDO | 34 (n=22) | 179 (n=11) | 24,5 (n=10) | **261** (n=12) |
| Procedura aperta europea | 51,5 (n=16) | 218 (n=16) | 46 (n=15) | **327** (n=15; min 239, max 452) |
| Accordo quadro (contratto esecutivo) | circa 32 tra memoria e determina d'impegno del contratto esecutivo (n=1) | — | — | — |

Caso reale I-5 (affidamento diretto MePA): memoria → indizione 25 gg → aggiudicazione 27 gg → stipula 9 gg, **61 giorni in tutto**.

---

## 4. Verifica di CR-31 (soglie e tipologie)

**Norme:**
- art. 50, c. 1 D.lgs. 36/2023: affidamento diretto di servizi e forniture **< 140.000 €** (lett. b); negoziata senza bando con almeno 5 operatori tra 140.000 € e la soglia UE (lett. e);
- art. 14, c. 1 e 3: soglie UE aggiornate dai regolamenti della Commissione, di applicazione diretta;
- art. 14, c. 4: valore stimato **al netto dell'IVA**, comprese opzioni e rinnovi;
- regolamenti delegati (UE) 2025/2150-2152: dal 01/01/2026 sub-centrali **216.000 €**, centrali 140.000 €;
- Allegato I della direttiva 2014/24/UE: per l'Italia elenca solo Presidenza del Consiglio, Ministeri e Consip, quindi INAPP è sub-centrale;
- L. 296/2006, art. 1, c. 450: obbligo del MePA da 5.000 € fino alla soglia UE.

| Proc. | Tipologia nel seed | Lordo | Netto (lordo/1,22) | Esito | Correzione proposta |
|---|---|---|---|---|---|
| P-001 | Aff. diretto MePA | 120.000 | 98.360,66 | ✓ art. 50, c. 1, lett. b | — |
| P-002 | Negoziata | 480.000 | 393.442,62 | ✗ sopra 216.000: procedura ordinaria (artt. 71-73); la negoziata senza bando solo nei casi dell'art. 76 | Opzione A (realistica): `OPEN` → `date_changes` diventa 8, gli importi della simulazione non cambiano perché le righe sono ancorate alla memoria. Opzione B (MVP): resta `NEGOTIATED` con **DEV-003** "plausibilità" |
| P-003 | Aperta | 720.000 | 590.163,93 | ✓ | — |
| P-004 | Aff. diretto | 238.000 | 195.081,97 | ✗ sopra 140.000 | `NEGOTIATED` (art. 50, c. 1, lett. e) → NEG-4M. Impatto sull'oracle nullo [Inferenza]: milestone tutte completate, documenti BEFORE non valutati su milestone completate |
| P-005 | Accordo quadro | 310.000 | 254.098,36 | ✓ plausibile (AQ indetto con procedura aperta, oppure contratto esecutivo su AQ Consip) | precisare la modalità (v. §5) |
| P-006 | Aff. diretto | 39.650 | 32.500,00 | ✓ | — |
| P-007 | Negoziata | 146.400 | 120.000,00 | ✓ (sotto 140.000 la negoziata è ammessa; il workbook mostra RDO anche sotto soglia) [Inferenza sulla prassi] | — |
| P-008 | Aperta | 890.000 | 729.508,20 | ✓ | — |
| P-009 | Ordine MePA | 305.000 | 250.000,00 | ✗ sopra 140.000 (non diretto) e sopra 216.000 (fuori dal MePA) | nuova tipologia `CENTRAL_PURCHASING_ORDER` ("Ordinativo su convenzione/AQ Consip") → modello AD-1M. Impatto sull'oracle nullo [Inferenza] |
| P-010 | Negoziata | 210.000 | 172.131,15 | ✓ art. 50, c. 1, lett. e | — |
| P-011 | Aff. diretto | 75.000 | 61.475,41 | ✓ | — |
| P-012 | Negoziata | 180.000 | 147.540,98 | ✓ (sopra 140.000 serve la negoziata) | — |

**Correzione al testo di CR-31.** "Supera la soglia dell'affidamento diretto per servizi e forniture (140.000 €, art. 50 D.lgs. 36/2023)" è **corretto**, con la precisazione che la soglia si applica al **valore netto IVA** (art. 14, c. 4). "Probabilmente sopra le soglie applicabili" va sostituito con: **"sopra la soglia UE sub-centrale (216.000 € dal 01/01/2026; 221.000 € nel 2024-2025), applicabile a INAPP perché non elencato nell'Allegato I della direttiva 2014/24/UE"**. Il valore 215.000 € del workbook INAPP è quello originario dell'art. 14, c. 1, lett. c (2022-2023) e va aggiornato.

---

## 5. Verifica dei modelli di procedura (guida §9)

### 5.1 Vincoli di legge pertinenti
- **Termini massimi** (Allegato I.3, art. 17, c. 3), calcolati dalla pubblicazione del bando o dall'invio degli inviti fino all'aggiudicazione:
  - con OEPV: aperta 9 mesi, ristretta 10, competitiva con negoziazione 7, negoziata senza bando 4;
  - con minor prezzo: 5 / 6 / 4 / 3 mesi;
  - proroga fino a 1 mese in caso di anomalia; il RUP può prorogare fino a 3 mesi.
  
  Sono **massimi**, non durate tipiche. Per l'affidamento diretto il Codice non fissa un termine.
- **Termini minimi per le offerte:** procedura aperta **30 giorni** dalla trasmissione del bando (art. 71, c. 2), riducibili a **15** solo per urgenza motivata (art. 71, c. 3). Sotto soglia non c'è un minimo assoluto, ma il termine deve essere "adeguato alla complessità" (art. 92).
- **Aggiudicazione immediatamente efficace** (art. 17, c. 5): le verifiche dei requisiti precedono l'aggiudicazione.
- **Stipula:** entro **60 giorni** dall'aggiudicazione efficace (art. 18, c. 2). Termine dilatorio di **32 giorni** dall'ultima comunicazione (art. 18, c. 3, testo dopo il D.lgs. 209/2024). Il termine dilatorio **non si applica** sotto soglia, con un'unica offerta non impugnata o agli appalti basati su accordo quadro (art. 18, c. 3, lett. a-d).
- **Garanzia definitiva:** sopra soglia è condizione per la sottoscrizione (10%, art. 117, c. 1). Sotto soglia è il 5%, ma la stazione appaltante può non richiederla motivando (art. 53, c. 4). INAPP l'ha chiesta nel caso reale I-5.

### 5.2 Compatibilità dei modelli attuali

| Modello | Totale | Verifica di legge | Esito |
|---|---|---|---|
| AD-1M | 30 gg | nessun termine minimo; stipula ≤ 60 gg ✓; niente stand still ✓ | **Compatibile.** Allineato al target INAPP di 1 mese, ma ottimistico rispetto alla mediana reale di 113 gg |
| NEG-4M | 120 gg | sotto soglia: offerte 20/10 adeguate ✓; inviti → aggiudicazione 45 gg ≤ 3-4 mesi ✓; aggiudicazione → stipula 50 gg ≤ 60 ✓ | **Compatibile** (minor prezzo). Se usato per P-002, che è sopra soglia, il minimo 7+3 gg viola lo stand still di 32 gg |
| OPEN-7M | 210 gg | offerte: default 35 ✓, **minimo 15 ✗** (30, art. 71, c. 2); aggiudicazione → stipula: default 70 ✓, **minimo 10+5 = 15 ✗** (32, art. 18, c. 3); bando → aggiudicazione 100 gg ≤ 9 mesi ✓ | **Default compatibili, minimi no.** E il nome è sbagliato rispetto al workbook: aperta = 9 mesi |
| FA-9M | 270 gg | AQ indetto da INAPP sopra soglia: stessi difetti dei minimi di OPEN (offerte 15, stand still 15). Per un contratto esecutivo su AQ Consip il modello è sovradimensionato (nessuno stand still, art. 18, c. 3, lett. b) | **Minimi non compatibili; modalità ambigua** |

### 5.3 Durate proposte (sempre `illustrative: true`, giorni solari, default/minimo)

Il principio è che i modelli rispecchiano la **regola di pianificazione INAPP** (workbook e circolare). I tempi reali osservati sono ciò che la piattaforma deve far emergere come ritardo. I minimi rispettano i vincoli di legge. Gli insiemi di milestone restano invariati, così `date_changes` dell'oracle non cambia.

| # | Milestone (nuova etichetta) | AD-1M | NEG-4M (minor prezzo) | **NEG-7M** (OEPV, nuovo) | **OPEN-9M** (ex OPEN-7M) | FA-9M (AQ indetto da INAPP) |
|---|---|---|---|---|---|---|
| 1 | `MEMORY_SUBMISSION` Consegna memoria | 0 | 0 | 0 | 0 | 0 |
| 2 | `REVIEW_COMPLETED` → **Determina a contrarre / di indizione** (art. 17, c. 1) | 7/3 | 15/10 | 30/10 | 45/15 | 45/15 |
| 3 | `INVITATION_SENT` / `CALL_PUBLISHED` | — | 10/5 | 10/3 | 15/5 | 15/5 |
| 4 | `OFFERS_DEADLINE` | — | 20/10 | 25/10 | **35/30** (art. 71, c. 2) | **35/30** |
| 5 | `EVALUATION_COMPLETED` | — | — | — | 90/20 | 90/20 |
| 6 | `AWARD` Aggiudicazione (requisiti già verificati, art. 17, c. 5) | 10/3 | 25/10 | 90/30 | 30/5 | 30/5 |
| 7 | `AWARD_EFFECTIVE` → **Adempimenti pre-stipula / termine dilatorio** | 5/2 | 20/7 | 25/0 | **35/32** (art. 18, c. 3) | **35/32** |
| 8 | `CONTRACT_SIGNED` Stipula (≤ 60 gg dall'aggiudicazione, art. 18, c. 2) | 8/2 | 30/3 | 30/0 | 20/0 | 20/0 |
| | **Totale** | **30** | **120** | **210** | **270** | **270** |
| | Verifica Allegato I.3 (dal bando/inviti all'aggiudicazione) | n.a. | 45 ≤ 90 ✓ | 115 ≤ 120 ✓ | 155 ≤ 270 ✓ | 155 ≤ 270 ✓ |

- **AD-1M e NEG-4M:** valori invariati. La corrispondenza con la regola INAPP (1 e 4 mesi) è già corretta.
- **FA-ADH-2M** (opzionale, contratto esecutivo o ordinativo su AQ o convenzione Consip): `REVIEW_COMPLETED` 30/10 → `AWARD` (ordinativo/contratto esecutivo) 15/3 → `AWARD_EFFECTIVE` (garanzia) 10/0 → `CONTRACT_SIGNED` 5/0, **60 giorni**, senza stand still (art. 18, c. 3, lett. b). Le fasi di gara sono N/A. Il riferimento è la prassi INAPP (I-2, I-4: circa 1 mese fra memoria e determina del contratto esecutivo).
- **Impatto sull'oracle [Inferenza, da verificare con i test]:**
  - P-003 e P-008 usano date esplicite fino alla prossima scadenza;
  - in S-05 (P-008) le tre milestone spostate restano tre e le righe sono ancorate ad `AWARD`;
  - P-005 ha date esplicite;
  - P-002 e P-007 restano su NEG-4M, invariato.

  Nessun valore della §10.3-10.6 dovrebbe cambiare. Cambiano solo le date previste derivate e non presenti nell'oracle (ad esempio la stipula prevista di P-008 e P-003).

---

## 6. Dettaglio per criticità

### A — Bloccanti

#### CR-01 · Giorni solari o lavorativi per il T-5
- **Risposta proposta:** nessuna norma regola un reminder interno. La memoria non è un termine di legge: la sua scadenza nasce dalla pianificazione INAPP. Il workbook la calcola come "data di inizio attività − N **mesi**" (`EDATE`) e prevede un **alert 1 mese prima della memoria**, quindi ragiona in tempo solare. Per i termini di gara, il riferimento UE (Reg. (CEE, Euratom) 1182/71, art. 3) conta i termini in giorni **inclusi i festivi** e, se l'ultimo giorno è festivo o di sabato/domenica, li fa scadere il giorno lavorativo seguente. È la stessa logica di DEC-010 + `FORWARD`. Il default "solari" è quindi il più coerente con INAPP.
- **Confidenza:** Solo INAPP (default probabile).
- **Fonti:** I-4 (colonne "Data presentazione memoria" e "Alert", formule `EDATE`); [Reg. 1182/71](https://eur-lex.europa.eu/eli/reg/1971/1182/oj), art. 3.
- **Default:** **confermare DEC-010.** Aggiungere un livello opzionale alla policy `MEMORY`: `T-30 · LOW · solo in-app · owner` ("prassi workbook INAPP: alert 1 mese prima"), `DA VALIDARE`. Con DEC-011, che emette solo il livello più alto raggiunto, il conteggio di alert e notifiche al seed non cambia [Inferenza].
- **Da chiedere a INAPP:** testo della circolare sui tempi procedimentali del 26/04/2022; conferma dei giorni solari e dell'alert a 1 mese.

#### CR-02 · Previsione di spesa senza piano SAL
- **Risposta proposta:** nella prassi INAPP la previsione nasce **per annualità**. La memoria indica la quota per anno ("per attività svolta al 31.12"), poi si registrano prenotazioni e impegni per esercizio. Il piano SAL datato arriva spesso solo **dopo la stipula, con addendum** (I-5: 20/50/30 con scadenze dei rilasci). Righe datate e ancorate a una milestone sono quindi un'astrazione ragionevole della previsione per annualità. In assenza di date, le righe possono cadere al 31/12 dell'anno o su un SAL tipico.
- **Confidenza:** Probabile.
- **Fonti:** I-5 (memoria, determina di indizione, addendum); DPR 97/2003, art. 31, c. 4 (impegno pluriennale; a carico del singolo esercizio si impegnano le obbligazioni per le prestazioni effettivamente rese); RAFC art. 22, c. 1 (l'impegno indica la "data di scadenza").
- **Default:** **confermare DEC-030.** Nota da aggiungere: "Nella realtà INAPP la previsione pre-contratto è per annualità (memoria/impegni); la riga datata ne è la rappresentazione. Il piano SAL definitivo può arrivare con addendum (US-062)."
- **Da chiedere a INAPP:** se la memoria e il workbook bastano come fonte delle quote annue (D-02).

#### CR-03 · Disponibilità per procedura o condivisa
- **Risposta proposta:** il vincolo contabile reale è lo **stanziamento di capitolo per esercizio** (il bilancio di previsione "costituisce limite agli impegni", DPR 97/2003, art. 10, c. 5; RAFC art. 22, c. 1), con vincolo di fonte (es. fondo PN GDL, **codice operazione**). Per singola procedura esistono la **prenotazione d'impegno** e poi l'impegno, per annualità (I-5). Il workbook confronta per **codice operazione × anno** il totale programmato con il "Totale da Piano (V.4)". Il modello per procedura × anno × fonte di DEC-031 corrisponde alla "quota di piano o prenotazione assegnata alla procedura". Il controllo condiviso esiste, ma a livello di operazione o capitolo.
- **Confidenza:** Probabile.
- **Fonti:** [DPR 97/2003](https://www.rgs.mef.gov.it/_Documenti/VERSIONE-I/Selezione_normativa/D-P-R-/DPR27-02-2003.pdf), art. 10, c. 5 e art. 31, c. 3; I-1 art. 22; I-4 (foglio "Gare_Esperti per Operazione"); I-5.
- **Default:** **confermare DEC-031** e aggiungere: "`BudgetAllocation` rappresenta la quota di piano o la prenotazione della procedura. Si aggiunge una **vista aggregata** per fonte/operazione × anno, solo informativa nell'MVP: nessuna criticità aggiuntiva, per non alterare l'oracle." Campi facoltativi: `chapter_code` (piano dei conti, es. U.1.03.02.10.003) e `funding_operation`.
- **Da chiedere a INAPP:** il controllo di sostenibilità va fatto sul capitolo, sull'operazione PN o su entrambi?

#### CR-04 · Modelli di procedura
- **Risposta proposta:** la corrispondenza **è nel workbook INAPP**:
  - 1 mese = affidamento diretto (circolare interna 26/04/2022);
  - 4 mesi = negoziata/RDO al minor prezzo, senza commissione;
  - 7 mesi = negoziata/RDO con OEPV e commissione;
  - 9 mesi = procedura aperta europea, scelta quando il netto supera la soglia UE.

  La data della memoria si ricava come inizio attività − N mesi. I mesi INAPP coprono l'intervallo **memoria → inizio attività**, mentre l'Allegato I.3 copre **bando → aggiudicazione**: sono grandezze diverse [Inferenza]. Le durate dei singoli passaggi non sono in nessuna fonte pubblica: proposte in §5.3.
- **Confidenza:** Confermata (corrispondenza); durate delle milestone Probabili.
- **Fonti:** I-4 (note "Procedure previste" e formule); [Allegato I.3](https://www.codiceappalti.it/DLGS_36_2023/Allegato_I_3_Termini_delle_procedure_di_appalto_/12879); artt. 17, 18, 71, 92 D.lgs. 36/2023.
- **Default:** **cambiare DEC-020** (testo in §9, M-01…M-04).
- **Da chiedere a INAPP:** circolare dei tempi procedimentali; per l'accordo quadro, se INAPP indice AQ propri o aderisce solo ad AQ Consip.

#### CR-05 · Input e alternative della riprogrammazione
- **Risposta proposta:** le euristiche FASTEST, MIN_ANNUAL_IMPACT e MANUAL sono scelte di prodotto, non regolate da norme, e sono ragionevoli. Due vincoli di legge vanno rispettati nella propagazione: i **minimi** del §5.3 (offerte 30 gg e stand still 32 gg sopra soglia) e il **massimo di 60 gg** tra aggiudicazione e stipula (art. 18, c. 2), da segnalare come `MILESTONE_BEYOND_LIMIT` WARNING se superato. Una criticità realistica utile: uno slittamento che porta l'indizione oltre il 31/12 fa **decadere la prenotazione** dell'esercizio. Fanno eccezione le gare bandite entro fine anno, la cui prenotazione confluisce nell'avanzo vincolato (DPR 97/2003, art. 31, c. 3; RAFC art. 22, c. 2).
- **Confidenza:** Probabile.
- **Fonti:** D.lgs. 36/2023, art. 18; DPR 97/2003, art. 31, c. 3; I-1 art. 22, c. 2.
- **Default:** **confermare DEC-040…043.** Proposta P1, non nell'MVP: criticità `RESERVATION_LAPSE` (WARNING), attiva solo se la procedura ha una `RESERVATION` dell'anno. Al seed solo P-011, annullata, ne ha una, quindi l'oracle resta invariato.
- **Da chiedere a INAPP:** nulla oltre D5 e D6.

#### CR-06 · Regole di health
- **Risposta proposta:** è una regola di prodotto, senza fonti esterne. Le regole della §8.4 sono coerenti con US-032 e riproducono la tabella 7.2.
- **Confidenza:** Probabile. **Fonti:** specifica §7.2, US-032.
- **Default:** **confermare DEC-050.**
- **Da chiedere a INAPP:** solo se la finestra di attenzione di 10 giorni è adeguata (può confluire in D10).

#### CR-07 · Importo a rischio
- **Risposta proposta:** è una definizione direzionale. Dal contesto PN emerge una terza dimensione, oggi non coperta: il workbook confronta il programmato con il **Piano (V.4)** e con l'"obiettivo di spesa" per annualità. Per un Organismo intermedio lo slittamento di spesa fra anni pesa sui target annuali del programma e sulla regola del disimpegno automatico (Reg. (UE) 2021/1060, art. 105) [Inferenza sull'impatto]. Proposta: mantenere DEC-051 e prevedere in P1 una voce "scostamento dal target di spesa del piano".
- **Confidenza:** Solo INAPP.
- **Fonti:** I-4; [Reg. (UE) 2021/1060](https://eur-lex.europa.eu/eli/reg/2021/1060/oj), artt. 63 e 105.
- **Default:** **confermare DEC-051** (`DA VALIDARE`).
- **Da chiedere a INAPP:** quale definizione usa la Direzione (D3).

#### CR-08 · Oracle scritto prima del codice
- **Risposta proposta:** è la prassi richiesta dalla specifica stessa (App. E: "scenari seed e risultati attesi versionati prima dell'implementazione").
- **Confidenza:** Confermata (dalla specifica). **Fonti:** specifica App. E, §7.5.
- **Default:** **confermare.** **Da chiedere a INAPP:** nulla.

### B — Incoerenze interne

#### CR-09 · Stati delle milestone
- **Risposta:** scelta tecnica; l'enum unico e la regola "OVERDUE prevale su BLOCKED" sono corretti.
- **Confidenza:** Probabile. **Fonti:** specifica §5.3, US-031.
- **Default:** **confermare DEC-021.** **INAPP:** nulla.

#### CR-10 · Stati SAL
- **Risposta:** scelta tecnica. Va aggiunta la corrispondenza con le fasi contabili, che è normativa:
  - `ACCEPTED` = verifica di conformità o regolare esecuzione della prestazione (art. 116 e Allegato II.14 D.lgs. 36/2023; la verifica non può superare **30 giorni** dalla prestazione salvo patto espresso, D.lgs. 231/2002, art. 4, c. 6);
  - `INVOICED` = fattura elettronica ricevuta via SDI;
  - `LIQUIDATED` = liquidazione (DPR 97/2003, art. 32; RAFC art. 24);
  - pagamento `SCHEDULED` = **ordinazione** (mandato/OPI, DPR 97/2003, art. 33; RAFC art. 25);
  - `EXECUTED` = pagamento (RAFC art. 26).
- **Confidenza:** Probabile (corrispondenza Confermata dalle norme citate).
- **Fonti:** [D.lgs. 231/2002, art. 4](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2002-10-09;231~art4); DPR 97/2003, artt. 30-33; I-1 artt. 21-26.
- **Default:** **confermare DEC-022**, con la nota di corrispondenza (M-09). **INAPP:** nulla.

#### CR-11 · Fase e stato
- **Risposta:** il workbook usa come "Status procedura" **Memoria, Indizione, Aggiudicazione, Contratto** (più "Gara eliminata"). Le etichette UI dovrebbero usare questo lessico. In particolare `REVIEW_COMPLETED` corrisponde alla **determina di indizione** (decisione di contrarre, art. 17, c. 1).
- **Confidenza:** Probabile. **Fonti:** I-4 (colonna "Status procedura"); [art. 17](https://www.codiceappalti.it/DLGS_36_2023/Articolo_17__Fasi_delle_procedure_di_affidamento_/12620).
- **Default:** **confermare DEC-001/023**, cambiando le etichette UI (M-05). **INAPP:** nulla.

#### CR-12 · Conteggi del seed
- **Risposta:** scelta di dataset, nessuna fonte. 10 strutture e 6 contratti sono legittimi con DEV-001.
- **Confidenza:** Probabile. **Default:** **confermare DEV-001.** **INAPP:** nulla.

#### CR-13 · P-001 con contratto prima della memoria
- **Risposta:** è impossibile. Il contratto si stipula dopo l'aggiudicazione (art. 18, c. 2), che segue la decisione di contrarre (art. 17, c. 1), a sua volta avviata dalla memoria. Gli atti reali (I-5) mostrano la sequenza memoria → indizione → aggiudicazione → stipula.
- **Confidenza:** Confermata.
- **Fonti:** [art. 18](https://www.codiceappalti.it/DLGS_36_2023/Articolo_18__Il_contratto_e_la_sua_stipulazione_/12621); I-5.
- **Default:** **confermare DEV-002.** **INAPP:** nulla.

#### CR-14 · T0 o T+1
- **Risposta:** nessuna norma; dipende da quando INAPP considera la memoria "non più utile" (circolare interna).
- **Confidenza:** Solo INAPP.
- **Default:** **confermare** T+1 per la riprogrammazione e T0 come solo alert.
- **INAPP:** "Qual è la data che rende la memoria non più utile?" (specifica §14.1).

#### CR-15 · Nascita della baseline
- **Risposta:** nella prassi INAPP-PN la "baseline" della programmazione è la **versione del Piano di attuazione/di dettaglio approvata** (workbook: "Data inizio attività per V1 Ob. Spesa", poi V3 e V4; le rimodulazioni del Piano sono adottate con determina del DG e recepite dall'Autorità di gestione). DEC-024 è una semplificazione accettabile per l'MVP.
- **Confidenza:** Probabile. **Fonti:** I-4 (colonne V1/V3/V4); I-5 (premesse sulla rimodulazione del Piano di attuazione).
- **Default:** **confermare DEC-024**, aggiungendo come evoluzione: "In produzione, ogni versione approvata del Piano di attuazione (V1…Vn) può essere importata come `ProcedureVersion` con `source = SEED_FILE`."
- **INAPP:** la baseline di riferimento è il Piano V1 o la data della memoria consegnata?

#### CR-16 · Due assi del dato
- **Risposta:** scelta tecnica corretta. **Confidenza:** Probabile. **Default:** **confermare DEC-025.** **INAPP:** nulla.

#### CR-17 · Ritardi in esecuzione e previsione
- **Risposta:** è confermato dalle norme che un ritardo **non** cambia da solo la previsione approvata:
  - le modifiche ai tempi o alle modalità di un contratto richiedono un **atto di modifica** (art. 120 D.lgs. 36/2023: addendum, proroghe, modifiche non sostanziali). Nel caso reale I-5 l'addendum ridefinisce i tempi e il piano di pagamento "senza oneri aggiuntivi";
  - la re-imputazione degli impegni a un altro esercizio richiede un atto contabile (nel workbook: "determina rimodulazione impegni").

  La "proiezione calcolata e non persistita" di DEC-044 è quindi corretta.
- **Confidenza:** Confermata.
- **Fonti:** [art. 120](https://www.codiceappalti.it/DLGS_36_2023/Articolo_120__Modifica_dei_contratti_in_corso_di_esecuzione_/12741); I-4; I-5; DPR 97/2003, art. 31.
- **Default:** **confermare DEC-044.** **INAPP:** nulla.

#### CR-18 · Storie SHOULD usate nel DoD
- **Risposta:** scelta di piano. **Confidenza:** Probabile. **Default:** **confermare.** **INAPP:** nulla.

#### CR-19 · Dipendenze fra incrementi
- **Risposta:** scelta di piano. **Confidenza:** Probabile. **Default:** **confermare** la guida §11. **INAPP:** nulla.

#### CR-20 · Ruoli
- **Risposta:** i ruoli reali sono questi:
  - **RUP** (Responsabile unico del progetto, art. 15), nominato per procedura;
  - **direttore dell'esecuzione** (art. 114), che verifica le prestazioni (ruolo naturale di chi verifica i SAL; per servizi semplici può coincidere con il RUP) [Inferenza sull'assetto INAPP];
  - **Responsabile della Struttura**, che firma la memoria come "responsabile tecnico";
  - **Direttore Generale**, unico centro di spesa, che firma le determine.

  "Approvatore" = DG o dirigente delegato (RAFC art. 2, c. 1, lett. b).
- **Confidenza:** Probabile. **Fonti:** D.lgs. 36/2023, artt. 15 e 114; I-1 artt. 2-3; I-5.
- **Default:** **confermare DEC-060**, aggiungendo l'attributo `rup_user` per procedura e l'etichetta "Direttore dell'esecuzione" per chi verifica i SAL (M-07). **INAPP:** v. D5.

#### CR-21 · Netto o lordo
- **Risposta:** il programmato INAPP è **lordo IVA inclusa**. Lo confermano il workbook ("Importo senza IVA" = importo / 1,22; IVA = differenza) e le determine (prenotazioni e impegni "IVA inclusa"). Tre precisazioni:
  1. le soglie si calcolano sul **netto** (art. 14, c. 4);
  2. con lo **split payment** (DPR 633/1972, art. 17-ter) INAPP paga il netto al fornitore e versa l'IVA all'Erario: in contabilità finanziaria l'impegno e il "pagato" restano lordi;
  3. l'aliquota non è sempre il 22%, perché alcune prestazioni (es. formazione) possono essere esenti. Il programmato del workbook comprende anche il **contributo ANAC** a carico della stazione appaltante.
- **Confidenza:** Confermata.
- **Fonti:** I-4; I-5; [art. 17-ter DPR 633/1972](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art17ter).
- **Default:** **confermare DEC-032**, con nota (M-08): `vat_rate` per contratto (default 22%); componente facoltativa `anac_fee`; "pagato" = netto al fornitore + IVA in split payment.
- **INAPP:** nulla.

### C — Lacune

#### CR-22 · Matrice dei permessi
- **Risposta:** il principio dei quattro occhi è coerente con la separazione delle funzioni richiesta nella gestione dei fondi UE e con la distinzione fra chi propone (RUP o Struttura) e chi adotta l'atto (DG) [Inferenza]. La matrice §7.3 è ragionevole.
- **Confidenza:** Probabile. **Fonti:** I-1 art. 3; I-5.
- **Default:** **confermare DEC-061.** **INAPP:** v. D5.

#### CR-23 · Destinatari degli alert
- **Risposta:** nella realtà i destinatari naturali sono il **Responsabile della Struttura** (memoria), il **RUP** (dopo la memoria), la Direzione Acquisti e Patrimonio, la Direzione Servizi finanziari e il DG.
- **Confidenza:** Probabile. **Fonti:** I-3; I-5.
- **Default:** **confermare DEC-062.** Aggiungere il destinatario logico `RUP@PROCEDURE`, risolto sull'utente PROCUREMENT indicato come RUP; senza RUP valorizzato si ricade su PROCUREMENT, quindi l'oracle non cambia [Inferenza]. Fornitore Demo Alfa su P-004: confermare.
- **INAPP:** caselle funzionali reali (D-05).

#### CR-24 · Escalation e livelli superati
- **Risposta:** nessuna norma. Unico riferimento INAPP: l'alert a 1 mese (v. CR-01).
- **Confidenza:** Solo INAPP.
- **Default:** **confermare DEC-011…013.** **INAPP:** D10.

#### CR-25 · Entità mancanti
- **Risposta:** scelta tecnica. Dalle fonti contabili emergono alcuni campi utili:
  - `BudgetAllocation.chapter_code`, `funding_source`, `funding_operation`;
  - `FinancialMovement.accounting_ref` (numero di prenotazione/impegno, facoltativo);
  - `Payment.order_ref` (mandato/OPI, facoltativo; US-064 lo dice già facoltativo).
- **Confidenza:** Probabile. **Fonti:** I-1 artt. 22-26; I-5.
- **Default:** **confermare §6.1**, aggiungendo i campi facoltativi (M-09). **INAPP:** D-06.

#### CR-26 · API incompleta
- **Risposta:** scelta tecnica. **Confidenza:** Probabile. **Default:** **confermare §6.3.** **INAPP:** nulla.

#### CR-27 · Documenti seed
- **Risposta:** gli atti reali comprendono memoria, documento tecnico/offerta, **determina di indizione**, **determina di aggiudicazione**, contratto/ordine e **addendum**. Il seed dovrebbe prevedere i tipi `DETERMINA_INDIZIONE`, `DETERMINA_AGGIUDICAZIONE` e `ADDENDUM`, anche senza nuovi file. Gli atti reali contengono **dati personali** (nomi, codici fiscali, firme): per D-09 servono anonimizzazione e minimizzazione prima di qualunque uso fuori dall'ambiente demo.
- **Confidenza:** Probabile. **Fonti:** I-5; [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj), art. 5, par. 1, lett. c.
- **Default:** **confermare DEC-070**; estendere l'enum dei tipi documento (M-10). **INAPP:** D-09.

#### CR-28 · Arrotondamenti
- **Risposta:** non esiste una norma sull'arrotondamento delle percentuali SAL. ROUND_HALF_UP al centesimo è lo standard dell'euro (per analogia: Reg. (CE) 1103/97, art. 5) [Inferenza per analogia]. L'IVA della fattura la determina il fornitore.
- **Confidenza:** Probabile.
- **Default:** **confermare DEC-033.** **INAPP:** nulla.

#### CR-29 · Accessibilità
- **Risposta:** il quadro è confermato:
  - L. 4/2004 e Linee guida AgID sull'accessibilità degli strumenti informatici;
  - le linee guida rinviano alla norma **EN 301 549** (v3.2.1), che richiede la conformità **WCAG 2.1 livello AA**;
  - obbligo di **dichiarazione di accessibilità**, da pubblicare e aggiornare **entro il 23 settembre** di ogni anno (Direttiva (UE) 2016/2102; Decisione di esecuzione (UE) 2018/1523).

  axe-core copre solo una parte dei criteri: servono anche verifiche manuali (tastiera, lettore di schermo, contrasti).
- **Confidenza:** Confermata.
- **Fonti:** [L. 4/2004](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2004-01-09;4); [Linee guida AgID](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/stabile/introduzione.html).
- **Default:** **confermare DEC-080.** Aggiungere: checklist manuale WCAG 2.1 AA per UI-01…UI-10 in I8 e bozza di dichiarazione di accessibilità tra le evidenze (M-11). WCAG 2.2 AA come obiettivo facoltativo [Inferenza: non risulta ancora obbligatorio].
- **INAPP:** nulla per l'MVP.

#### CR-30 · Orologio
- **Risposta:** scelta tecnica corretta. **Confidenza:** Probabile. **Default:** **confermare DEC-002.** **INAPP:** nulla.

### D — Plausibilità del dataset

#### CR-31 · Tipologie e soglie
- **Risposta:** v. §4. Soglia dell'affidamento diretto di 140.000 € netti **corretta**; INAPP sub-centrale, soglia UE **216.000 €** dal 01/01/2026. P-004, P-009 e P-002 non sono plausibili.
- **Confidenza:** Confermata.
- **Fonti:** [art. 50](https://www.codiceappalti.it/DLGS_36_2023/Articolo_50__Procedure_per_l%E2%80%99affidamento_/12657); [art. 14](https://www.codiceappalti.it/DLGS_36_2023/Articolo_14__Soglie_di_rilevanza_europea_e_metodi_di_calcolo_dell%E2%80%99importo_stimato_degli_appalti._Disciplina_dei_contratti_misti_/12617); [Allegato I della direttiva 2014/24/UE](https://www.codiceappalti.it/DIR_24_2014/ALLEGATO_I_-_AUTORIT%C3%80_GOVERNATIVE_CENTRALI/8051); soglie 2026-27 ([Legislazione Tecnica](https://www.legislazionetecnica.it/10823726/news-edilizia-appalti-professioni-tecniche-sicurezza-ambiente/nuove-soglie-europee-gli-appalti-pubblici-dal-2026), [Appalti&Contratti](https://www.appaltiecontratti.it/appalti-pubblici-pubblicati-regolamenti-con-le-nuove-soglie-comunitarie-per-gli-anni-2026-2027/); regolamenti delegati (UE) 2025/2150, 2025/2151, 2025/2152 su EUR-Lex); I-2; I-4.
- **Default:** **cambiare** il dataset (M-12) e aggiungere la configurazione delle soglie (M-13).
- **INAPP:** solo la conferma della preferenza fra le opzioni A e B per P-002.

#### CR-32 · Cronologia e spesa
- **Risposta:** l'implausibilità è **confermata dai dati INAPP**. Per una negoziata la mediana memoria → stipula è di 261 giorni. Con la memoria al 25/09/2026, P-002 stipulerebbe verso metà 2027 e non potrebbe pagare 200.000 € nel 2026. Lo stesso vale per P-008, in gara, e per P-007. Il compromesso (righe ancorate alla milestone in ritardo) serve solo a riprodurre i numeri della specifica.
- **Confidenza:** Confermata.
- **Fonti:** I-4 (§3.2 di questo documento).
- **Default:** **confermare il compromesso**, registrandolo come deviazione esplicita (DEV-004, "cronologia di spesa non realistica, voluta per il DoD") e citandolo nel runbook demo.
- **INAPP:** vuole dati realistici, accettando nuovi valori attesi?

### E — Rischi di progetto (scelte tecniche, nessuna norma)

#### CR-33 · Ampiezza
- **Risposta:** mitigazione corretta. **Confidenza:** Probabile. **Default:** **confermare.** **INAPP:** nulla.

#### CR-34 · Specifica non validata
- **Risposta:** questo documento chiude in parte D-01 (corrispondenza dei modelli), D-03 (ruolo del DG) e D-06 (fasi contabili). Restano aperti D-02, D-04, D-05, D-07, D-08, D-09 e D-10.
- **Confidenza:** Probabile. **Default:** **confermare.** **INAPP:** §8.

#### CR-35 · Ambiente
- **Risposta:** scelta tecnica; Mailpit al posto di MailHog è ragionevole. Lo stato di manutenzione di MailHog non è stato verificato in questa sessione.
- **Confidenza:** Probabile. **Default:** **confermare DEC-090.** **INAPP:** nulla.

#### CR-36 · Stack
- **Risposta:** scelta tecnica. **Confidenza:** Probabile. **Default:** **confermare DEC-091.** **INAPP:** D-08 (stack, hosting, SSO).

---

## 7. Domande della §7 dell'analisi

| # | Domanda | Risposta proposta | Confidenza | Fonti | Default | Resta da chiedere |
|---|---|---|---|---|---|---|
| 1 | T-5 solari o lavorativi? Festività? | Solari (il workbook usa i mesi, con alert a 1 mese); festività nazionali con spostamento al giorno lavorativo successivo (logica Reg. 1182/71) | Solo INAPP | I-4; Reg. 1182/71, art. 3 | Confermare + T-30 opzionale | Circolare 26/04/2022; patrono di Roma (29 giugno) da attivare? |
| 2 | Disponibilità per procedura o condivisa? | Vincolo per capitolo × fonte/operazione × esercizio; prenotazione e impegno per procedura | Probabile | DPR 97/2003, art. 10, c. 5 e art. 31; I-1 art. 22; I-4; I-5 | Confermare DEC-031 + vista aggregata | Livello di controllo (capitolo o operazione) |
| 3 | Definizione di "importo a rischio" | Non coperto + in slittamento; possibile terza voce "scostamento dal target di spesa del piano" | Solo INAPP | I-4; Reg. 2021/1060, art. 105 | Confermare DEC-051 | Definizione della Direzione |
| 4 | Fasi, durate, milestone bloccanti; corrispondenza tipologie → modelli | Corrispondenza dal workbook (1 AD · 4 negoziata a minor prezzo · 7 negoziata OEPV · 9 aperta UE); durate di dettaglio proposte in §5.3, conformi agli artt. 17, 18, 71 e all'Allegato I.3 | Confermata (corrispondenza) / Probabile (durate) | I-4; Allegato I.3; artt. 17, 18, 71 | **Cambiare DEC-020/§9** | Circolare; modalità dell'AQ |
| 5 | Chi propone, approva, forza; deleghe | Propone il RUP o la Struttura con Gare/Amministrazione; adotta il **DG** con determina (unico centro di spesa); deleghe possibili ai dirigenti dei centri di responsabilità; l'override di un overflow equivale a una **variazione di bilancio** (DG per il gestionale, CdA per il decisionale) | Probabile | I-1 artt. 2, 3, 16; I-5 | Confermare DEC-042, `EXECUTIVE` = DG o delegato | Deleghe effettive |
| 6 | Superamento della disponibilità: bloccante o avviso? | Bloccante: il bilancio annuale è limite agli impegni e l'impegno va assunto nei limiti di capienza del capitolo; si risolve con una variazione di bilancio coperta (RAFC art. 16, c. 4) | Probabile | DPR 97/2003, art. 10, c. 5; I-1 artt. 16 e 22 | Confermare BLOCKING + override | Se in fase di pianificazione basta un avviso |
| 7 | Importi lordi IVA? | Sì | Confermata | I-4; I-5 | Confermare DEC-032 + split payment | — |
| 8 | Tipologie plausibili? | No per P-002, P-004 e P-009 (§4) | Confermata | artt. 14 e 50; Allegato I della direttiva 2014/24/UE; regolamenti delegati 2025 | **Cambiare** dataset | Opzione A o B per P-002 |
| 9 | Date di pagamento pre-contratto? Fonte? | La prassi è per annualità (memoria, prenotazioni e impegni), poi i SAL da contratto/addendum; righe datate come approssimazione | Probabile | I-5; DPR 97/2003, art. 31, c. 4 | Confermare DEC-030 | Fonte ufficiale (D-02) |
| 10 | Alert al Direttore e dopo quale livello? | Nessuna norma; dato che il DG firma le determine e governa le variazioni, sono ragionevoli T0/T+1 per le milestone bloccanti e `BUDGET_OVERFLOW` | Solo INAPP | I-1 art. 3 | Confermare | Sì |
| 11 | Il fornitore accede alla piattaforma? | Le fatture arrivano comunque via **SDI** (fatturazione elettronica obbligatoria verso la PA), i deliverable di solito via PEC: l'accesso del fornitore non è necessario in produzione. Nella demo resta l'accesso limitato | Solo INAPP | I-5 (prassi); L. 244/2007, art. 1, c. 209-214 (comma da verificare) | Confermare D-04 per la demo | Sì |
| 12 | Quali OCR/LLM e quali dati possono uscire? | Il **core resta senza IA**: coerente con L. 132/2025, art. 14 (IA "in funzione strumentale e di supporto", la decisione resta alla persona) e con l'AI Act. Se si abilita un LLM: obbligo di informare l'utente che interagisce con un'IA (AI Act art. 50, dal 02/08/2026); alfabetizzazione del personale (art. 4, dal 02/02/2025); valutazione d'impatto privacy se i documenti contengono dati personali (GDPR art. 35; gli atti reali li contengono); servizi cloud qualificati per la PA; Linee guida AgID sull'IA. Un assistente di monitoraggio interno non sembra rientrare nell'Allegato III dell'AI Act (alto rischio) [Inferenza] | Solo INAPP | [AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj); [L. 132/2025](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-09-23;132~art14); [AgID IA](https://www.agid.gov.it/it/notizie/intelligenza-artificiale-in-consultazione-le-linee-guida-pa) | Confermare: solo locale, LLM disabilitato | Fornitore, residenza dei dati, DPIA. Verificare lo stato definitivo delle linee guida AgID e l'eventuale rinvio di obblighi dell'AI Act ("Digital Omnibus") |

### 7.1 Altre domande della specifica §14.1 (risposte brevi)
- **"Quali fonti contabili distinguono stanziato, prenotato, impegnato, liquidato e pagato?"** Il bilancio di previsione (stanziato, DPR 97/2003 art. 10), la prenotazione (art. 31, c. 3; RAFC art. 22, c. 2), l'impegno (art. 31, c. 1; RAFC art. 22, c. 1), la liquidazione (art. 32; RAFC art. 24), l'ordinazione (mandato/OPI, art. 33; RAFC art. 25) e il pagamento (RAFC art. 26). **Confermata.** Resta da sapere quale sistema INAPP le espone (InGov, D-06).
- **"Come si definiscono i SAL?"** Per contratto o **addendum** (I-5: rilasci con scadenza e percentuali 20/50/30 legate ai deliverable). I certificati di pagamento sono emessi dal RUP entro 7 giorni (art. 125, c. 5-6, per i servizi periodici o continuativi), il saldo dopo la verifica di conformità (art. 125, c. 7). Il pagamento avviene entro 30 giorni dalla fattura, al massimo 60 se pattuito per iscritto e giustificato (D.lgs. 231/2002, art. 4, c. 2 e 4). L'anticipazione del 20% vale anche per servizi e forniture, salvo quelli dell'Allegato II.14 (art. 125, c. 1). **Confermata.**
- **"Dashboard o interazione conversazionale?"**, **"Quali integrazioni hanno API?"**: Solo INAPP.

---

## 8. Domande che restano davvero per INAPP

1. **Circolare sui tempi procedimentali del 26/04/2022**: testo; conferma dei giorni solari per il reminder; quando la memoria diventa "non più utile" (T0 o T+1); alert a 1 mese come nel workbook (CR-01, CR-14, D1, D4).
2. **Accordo quadro**: INAPP indice AQ propri (procedura aperta) o aderisce solo ad AQ e convenzioni Consip (contratto esecutivo)? (CR-04, P-005)
3. **Livello del vincolo di bilancio**: capitolo del piano dei conti, operazione PN o entrambi; la quota per procedura corrisponde alla prenotazione? (CR-03, D2)
4. **Approvazione della riprogrammazione**: è il DG con determina di rimodulazione impegni o un dirigente delegato? Quali deleghe esistono? L'override di un overflow equivale a una variazione di bilancio? (D5, D6)
5. **Importo a rischio** per la Direzione, inclusa l'eventuale voce "scostamento dal target di spesa del Piano PN" (CR-07, D3).
6. **Escalation al DG**: livelli e canali (D10, D-05).
7. **Accesso del fornitore** in produzione (D11, D-04).
8. **Policy IA**: fornitore OCR/LLM, residenza dei dati, DPIA, minimizzazione dei dati personali presenti negli atti (D12, D-07, D-09).
9. **Dataset**: opzione A o B per P-002; dati di spesa realistici al posto del compromesso di CR-32? (CR-31, CR-32)
10. **Baseline**: Piano di attuazione V1 o memoria consegnata? (CR-15)
11. **Contabilità**: INAPP applica di fatto l'imputazione per esigibilità ("competenza potenziata") agli impegni pluriennali? Il RAFC richiama il D.lgs. 91/2011, ma una norma che la estenda agli enti come INAPP non risulta (D-06).

---

## 9. Modifiche proposte alla guida

Nessuna delle modifiche altera i valori della guida §10.3-10.6 [Inferenza da confermare con i test oracle]. Dove c'è un rischio, è indicato.

| ID | DEC / sezione | Testo nuovo proposto |
|---|---|---|
| **M-01** | DEC-020 | "Modelli §9 (YAML versionati, `illustrative: true`). **Selezione del modello** in base a tipologia, criterio di aggiudicazione e valore netto, come nella regola del workbook INAPP: `DIRECT_AWARD`, `DIRECT_AWARD_MEPA`, `MEPA_ORDER`, `CENTRAL_PURCHASING_ORDER` → AD-1M · `NEGOTIATED` → NEG-4M se `award_criterion = LOWEST_PRICE` (default), NEG-7M se `BEST_VALUE` · `OPEN` → **OPEN-9M** · `FRAMEWORK_AGREEMENT` → FA-9M (AQ indetto da INAPP, default) oppure FA-ADH-2M (adesione o contratto esecutivo su AQ/convenzione). `DA VALIDARE` (circolare INAPP 26/04/2022)." |
| **M-02** | §9, tabella | Sostituire con la tabella del §5.3 di questo documento: OPEN-7M rinominato OPEN-9M con valori 45/15 · 15/5 · 35/30 · 90/20 · 30/5 · 35/32 · 20/0; FA-9M con gli stessi valori; NEG-7M nuovo; AD-1M e NEG-4M invariati. Aggiungere: "I minimi rispettano l'art. 71, c. 2 (offerte ≥ 30 gg nella procedura aperta, 15 solo con flag `urgency`) e l'art. 18, c. 3 (stand still 32 gg sopra soglia, esclusi gli appalti basati su AQ); il massimo fra aggiudicazione e stipula è 60 gg (art. 18, c. 2) e il superamento produce `MILESTONE_BEYOND_LIMIT` WARNING; i massimi dell'Allegato I.3 dal bando all'aggiudicazione producono WARNING." |
| **M-03** | §9, etichette | `REVIEW_COMPLETED` → etichetta **"Determina a contrarre / indizione"** (art. 17, c. 1). `AWARD_EFFECTIVE` → etichetta **"Adempimenti pre-stipula / termine dilatorio"**, con nota: "Nel D.lgs. 36/2023 l'aggiudicazione è immediatamente efficace (art. 17, c. 5); la milestone rappresenta garanzia, documenti e, sopra soglia, lo stand still." I codici restano invariati per compatibilità con l'oracle. |
| **M-04** | §9, documenti attesi | "`CONTRACT_SIGNED` → `GARANZIA_DEFINITIVA` (BEFORE, HIGH) in **tutti** i modelli: obbligatoria sopra soglia (10%, art. 117, c. 1); sotto soglia configurabile `required_below_threshold` (default `true`, prassi INAPP; 5%, art. 53, c. 4)." Impatto sull'oracle nullo: la regola BEFORE vale solo per milestone attive (P-005 resta l'unico caso) [Inferenza]. |
| **M-05** | §5.1 | Etichette UI dello stato coerenti con il workbook: `PRELIMINARY_REVIEW` = "Istruttoria / Indizione"; dizionario US-103 con sinonimi "Memoria", "Indizione", "Aggiudicazione", "Contratto". Nuova tipologia **`CENTRAL_PURCHASING_ORDER`** = "Ordinativo su convenzione/AQ Consip". |
| **M-06** | DEC-010 / §8.3 | Policy `MEMORY`: aggiungere il livello opzionale "**T-30 · LOW · solo in-app · owner** (alert a 1 mese, prassi del workbook INAPP), `DA VALIDARE`". Con DEC-011 il conteggio al seed non cambia. |
| **M-07** | DEC-042 / DEC-060 / §7.1 | "`EXECUTIVE` = **Direttore Generale**, unico centro di spesa (RAFC art. 3), o dirigente delegato (art. 2, c. 1, lett. b). L'approvazione di una riprogrammazione corrisponde, nel mondo reale, a una determina del DG di rimodulazione degli impegni; l'override di un `BUDGET_OVERFLOW` presuppone una variazione di bilancio (RAFC art. 16)." Attributo `rup_user_id` su `Procedure` (art. 15). Chi verifica i SAL = "Direttore dell'esecuzione" (art. 114). Destinatario logico `RUP@PROCEDURE`, con fallback su PROCUREMENT. |
| **M-08** | DEC-032 | Aggiungere: "Le soglie si valutano sul netto (art. 14, c. 4). `vat_rate` per contratto (default 22%; esenzioni possibili). Componente facoltativa `anac_fee` nel programmato. In split payment (DPR 633/1972, art. 17-ter) il pagato = netto al fornitore + IVA versata all'Erario, entrambi contati nel pagato lordo." |
| **M-09** | §5.3 / §6.1 | Corrispondenza contabile: `RESERVATION` = prenotazione d'impegno (DPR 97/2003, art. 31, c. 3; RAFC art. 22, c. 2: decade a fine esercizio se non seguita dall'impegno); `COMMITMENT` = impegno (art. 31, c. 1; RAFC art. 22, c. 1, con data di scadenza; pluriennale art. 31, c. 4); `LIQUIDATION` (art. 32; RAFC art. 24); pagamento `SCHEDULED` = ordinazione/mandato-OPI (art. 33; RAFC art. 25); `EXECUTED` = pagamento (RAFC art. 26). Campi facoltativi: `BudgetAllocation.chapter_code`, `funding_source`, `funding_operation`; `FinancialMovement.accounting_ref`; `Payment.order_ref`. |
| **M-10** | §10.7 / DEC-070 | Enum dei tipi documento: aggiungere `DETERMINA_INDIZIONE`, `DETERMINA_AGGIUDICAZIONE`, `ADDENDUM`, `GARANZIA_DEFINITIVA`. Nota: "Gli esempi reali (D-09) contengono dati personali: vanno anonimizzati prima dell'uso." |
| **M-11** | DEC-080 | Aggiungere: "Riferimento normativo: L. 4/2004 + Linee guida AgID → EN 301 549 v3.2.1 → WCAG 2.1 AA. axe-core in E2E **più** una checklist manuale (tastiera, focus, lettore di schermo, contrasto) su UI-01…UI-10 in I8; bozza della dichiarazione di accessibilità tra le evidenze (§13.4)." |
| **M-12** | §10.2 (dataset) | **P-004:** `DIRECT_AWARD` → `NEGOTIATED` (art. 50, c. 1, lett. e) → NEG-4M; le milestone aggiuntive (`INVITATION_SENT`, `OFFERS_DEADLINE`) diventano completate con date plausibili. **P-009:** `MEPA_ORDER` → `CENTRAL_PURCHASING_ORDER` → AD-1M. **P-002:** opzione B (MVP) → resta `NEGOTIATED` con **DEV-003** "sopra soglia UE, tipologia mantenuta per i valori del DoD"; opzione A (se INAPP vuole realismo) → `OPEN`/OPEN-9M, con `date_changes` di S-02 che passa da 7 a 8 (DEV obbligatoria; la specifica §10.4 riporta 7). **CR-32:** registrare DEV-004. Rimuovere "(CR-31)" dalle righe di P-004 e P-009 dopo la correzione. |
| **M-13** | Nuova configurazione `config/procurement_thresholds.yaml` (versionata, `ConfigVersion`) | `contracting_authority_tier: SUB_CENTRAL` (INAPP non è nell'Allegato I della direttiva 2014/24/UE). `eu_thresholds`: `{valid_from: 2024-01-01, works: 5538000, supplies_services_central: 143000, supplies_services_sub_central: 221000, social: 750000}`, `{valid_from: 2026-01-01, works: 5404000, supplies_services_central: 140000, supplies_services_sub_central: 216000, social: 750000}`. `direct_award_max_net: {services_supplies: 140000, works: 150000}` (art. 50, c. 1, lett. a-b). Uso: selezione del modello (M-01) ed eventuale regola `PROCEDURE_TYPE_THRESHOLD_MISMATCH` (WARNING), **disattivata nel seed MVP** per non aggiungere anomalie all'oracle. |
| **M-14** | §8.3, nota ² / §8.6 | "`review_term_days` default 15 (target interno); **massimo di legge 30** dalla prestazione, salvo patto espresso (D.lgs. 231/2002, art. 4, c. 6) → `legal_max_review_days: 30`. `payment_term_days` default 30 dalla ricezione della fattura (art. 4, c. 2); al massimo 60 se pattuito per iscritto e giustificato (art. 4, c. 4). Certificato di pagamento del RUP entro 7 giorni dal SAL (art. 125, c. 5-6)." Default invariati, quindi oracle invariato. |
| **M-15** | §8.5, criticità `FUNDING_END_EXCEEDED` | "`funding_end_date` per fonte: per le fonti PN/FSE+ 2021-2027 il default suggerito è **2029-12-31** (Reg. (UE) 2021/1060, art. 63: spesa sostenuta e pagata entro il 31/12/2029; periodo delle attività INAPP esteso al 31/12/2029). Nel seed resta non configurato, oppure configurato senza effetti perché nessuna riga supera il 2028." |
| **M-16** | §2.5 / D-07 | Aggiungere: "Il core senza IA è coerente con L. 132/2025, art. 14 (IA solo strumentale, la decisione resta umana) e con l'AI Act. Se si abilita un LLM: avviso all'utente che interagisce con un'IA (AI Act art. 50), formazione del personale (art. 4), DPIA (GDPR art. 35), minimizzazione o pseudonimizzazione dei dati personali dei documenti, cloud qualificato per la PA, conformità alle Linee guida AgID sull'IA." |
| **M-17** | DEC-031 | Aggiungere: "`BudgetAllocation` = quota di piano o prenotazione della procedura. Vista aggregata per `funding_source`/`funding_operation` × anno, **solo informativa** nell'MVP (nessuna nuova criticità)." |
| **M-18** | DEC-024 (nota) | "In produzione la baseline può corrispondere alla versione del Piano di attuazione (V1…Vn) importata dal workbook." |
| **M-19** | DEC-040 (P1, facoltativo) | Criticità `RESERVATION_LAPSE` (WARNING): una simulazione porta l'indizione oltre il 31/12 dell'esercizio di una `RESERVATION` esistente (DPR 97/2003, art. 31, c. 3; RAFC art. 22, c. 2). Fuori dall'MVP. |

---

## 10. Fonti

**Normativa nazionale**
- D.lgs. 31 marzo 2023, n. 36 (Codice dei contratti pubblici), testo vigente: [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2023-03-31;36). Testi coordinati consultati: [art. 14](https://www.codiceappalti.it/DLGS_36_2023/Articolo_14__Soglie_di_rilevanza_europea_e_metodi_di_calcolo_dell%E2%80%99importo_stimato_degli_appalti._Disciplina_dei_contratti_misti_/12617), [art. 17](https://www.codiceappalti.it/DLGS_36_2023/Articolo_17__Fasi_delle_procedure_di_affidamento_/12620), [art. 18](https://www.codiceappalti.it/DLGS_36_2023/Articolo_18__Il_contratto_e_la_sua_stipulazione_/12621), [art. 50](https://www.codiceappalti.it/DLGS_36_2023/Articolo_50__Procedure_per_l%E2%80%99affidamento_/12657), [art. 53](https://www.codiceappalti.it/DLGS_36_2023/Articolo_53__Garanzie_a_corredo_dell%E2%80%99offerta_e_garanzie_definitive_/12660), [art. 71](https://www.codiceappalti.it/DLGS_36_2023/Articolo_71__Procedura_aperta_/12683), [art. 92](https://www.codiceappalti.it/DLGS_36_2023/Articolo_92__Fissazione_dei_termini_per_la_presentazione_delle_domande_e_delle_offerte_/12708), [art. 117](https://www.codiceappalti.it/DLGS_36_2023/Articolo_117__Garanzie_definitive_/12738), [art. 120](https://www.codiceappalti.it/DLGS_36_2023/Articolo_120__Modifica_dei_contratti_in_corso_di_esecuzione_/12741), [art. 125](https://www.codiceappalti.it/DLGS_36_2023/Articolo_125__Anticipazione,_modalit%C3%A0_e_termini_di_pagamento_del_corrispettivo_/12745), [Allegato I.3](https://www.codiceappalti.it/DLGS_36_2023/Allegato_I_3_Termini_delle_procedure_di_appalto_/12879).
- D.lgs. 31 dicembre 2024, n. 209 (correttivo): [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-12-31;209). Stand still ridotto a 32 giorni: [Legislazione Tecnica](https://www.legislazionetecnica.it/12655882/news-edilizia-appalti-professioni-tecniche-sicurezza-ambiente/correttivo-al-codice-appalti-ridotto-il-periodo-stand-still).
- D.lgs. 9 ottobre 2002, n. 231, art. 4: [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2002-10-09;231~art4).
- DPR 27 febbraio 2003, n. 97: [testo RGS](https://www.rgs.mef.gov.it/_Documenti/VERSIONE-I/Selezione_normativa/D-P-R-/DPR27-02-2003.pdf) (artt. 10, 30-33 consultati); [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2003-02-27;97).
- D.lgs. 31 maggio 2011, n. 91: [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2011-05-31;91); DPR 4 ottobre 2013, n. 132 (piano dei conti integrato): [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2013-10-04;132).
- DPR 26 ottobre 1972, n. 633, art. 17-ter (split payment): [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art17ter).
- L. 27 dicembre 2006, n. 296, art. 1, c. 450 (MePA): [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2006-12-27;296).
- L. 9 gennaio 2004, n. 4 (accessibilità): [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2004-01-09;4).
- L. 23 settembre 2025, n. 132 (IA), art. 14: [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-09-23;132~art14).

**Normativa UE**
- Direttiva 2014/24/UE, Allegato I: [EUR-Lex](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32014L0024); [testo dell'allegato](https://www.codiceappalti.it/DIR_24_2014/ALLEGATO_I_-_AUTORIT%C3%80_GOVERNATIVE_CENTRALI/8051).
- Regolamenti delegati (UE) 2025/2150, 2025/2151, 2025/2152 (soglie 2026-2027), da consultare su EUR-Lex per numero; sintesi: [Legislazione Tecnica](https://www.legislazionetecnica.it/10823726/news-edilizia-appalti-professioni-tecniche-sicurezza-ambiente/nuove-soglie-europee-gli-appalti-pubblici-dal-2026), [Appalti&Contratti](https://www.appaltiecontratti.it/appalti-pubblici-pubblicati-regolamenti-con-le-nuove-soglie-comunitarie-per-gli-anni-2026-2027/).
- Reg. (CEE, Euratom) 1182/71 (computo dei termini): [EUR-Lex](https://eur-lex.europa.eu/eli/reg/1971/1182/oj).
- Reg. (UE) 2021/1060 (fondi 2021-2027), artt. 63 e 105: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2021/1060/oj).
- Reg. (UE) 2024/1689 (AI Act), artt. 4, 6, 50 e Allegato III: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj).
- Reg. (UE) 2016/679 (GDPR), artt. 5 e 35: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

**AgID**
- Linee guida sull'accessibilità degli strumenti informatici: [Docs Italia](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/stabile/introduzione.html); [dichiarazione di accessibilità](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/stabile/dichiarazione-accessibilita-e-pubblicazione-obiettivi-accessibilita.html).
- Linee guida per l'adozione dell'IA nella PA: [AgID](https://www.agid.gov.it/it/notizie/intelligenza-artificiale-in-consultazione-le-linee-guida-pa). Stato definitivo da verificare: una fonte secondaria indica adozione e consultazioni nel 2025-2026.

**INAPP**
- Regolamento di amministrazione, contabilità e finanza: [PDF](https://www.inapp.gov.it/wp-content/uploads/AT/01_Disposizioni_generali/Atti_generali/22_21_20_19_18/20200403_INAPP_Regolamento_Amministrazione_Contabilita_%20e_Finanza.pdf).
- Programmazione degli acquisti 2026-2028: [pagina](https://www.inapp.gov.it/amministrazione-trasparente/bandi-di-gara-e-contratti/atti-delle-amministrazioni-aggiudicatrici-e-degli-enti-aggiudicatori-distintamente-ogni-procedura/atti-relativi-alla-programmazione-di-lavori-opere-servizi-e-forniture/).
- Articolazione degli uffici: [pagina](https://www.inapp.gov.it/amministrazione-trasparente/amministrazione-trasparente/organizzazione/articolazione-degli-uffici/direzione-generale-uffici-dirigenziali-e-servizi/).
- Locali, usati come evidenza e non riprodotti: workbook `04_09_26_Elenco_Prodotti_Gare_Esperti - PN GDL.xlsx`; `Documenti Gara/*.pdf`.
