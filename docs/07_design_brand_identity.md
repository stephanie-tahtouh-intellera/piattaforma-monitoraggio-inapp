# Design e brand identity — Piattaforma INAPP MVP

> **Destinatario:** AI coding agent che realizza il frontend (Next.js + TypeScript, Tailwind, shadcn/ui).
> **Stato:** v1.0 — 01/10/2026. Proposta da validare con INAPP (comunicazione istituzionale e responsabile dell'accessibilità).
> **File collegati:** [`docs/design/tokens.css`](design/tokens.css) (token pronti all'uso). Specifica: [`00_specifica_originale_v1_0.md`](00_specifica_originale_v1_0.md) §9; guida: [`02_guida_sviluppo_agente.md`](02_guida_sviluppo_agente.md) §4–5.

**Gerarchia.** Per *comportamenti, regole, etichette canoniche e dati* prevalgono specifica e guida. Questo documento governa *aspetto, componenti, microcopy e accessibilità visiva*. In caso di conflitto con la guida, si apre una DEC-1xx nel registro decisioni.

**Legenda dei valori** (usata in tutto il documento):

| Marca | Significato |
|---|---|
| **[R]** | Valore **rilevato** sul sito www.inapp.gov.it (CSS o HTML), con fonte. |
| **[DI]** | Valore tratto da Designers Italia / Bootstrap Italia, con fonte. |
| **[P]** | Valore **proposto** in questo documento per l'applicazione. |

---

## Indice

1. [Analisi del sito INAPP](#1-analisi-del-sito-inapp)
2. [Design system della PA e linee guida](#2-design-system-della-pa-e-linee-guida)
3. [Principi di design](#3-principi-di-design)
4. [Design token](#4-design-token)
5. [Logo, header istituzionale e marcatura DEMO](#5-logo-header-istituzionale-e-marcatura-demo)
6. [Componenti](#6-componenti)
7. [Formati it-IT](#7-formati-it-it)
8. [Tono di voce e microcopy](#8-tono-di-voce-e-microcopy)
9. [Checklist di accessibilità](#9-checklist-di-accessibilità)
10. [Wireframe testuali](#10-wireframe-testuali)
11. [Fonti](#11-fonti)

---

## 1. Analisi del sito INAPP

### 1.1 Metodo

- www.inapp.gov.it è protetto da una verifica anti-bot di Cloudflare (HTTP 403 / pagina "Just a moment…" per client automatici). I valori sono stati quindi estratti dalle **copie integrali dell'Internet Archive** (HTML e CSS originali, modalità `id_`):
  - home: snapshot del 12/09/2026 — `web.archive.org/web/20260912171834/https://www.inapp.gov.it/`;
  - *Istituto* (20/09/2026), *Pubblicazioni* (20/09/2026), *Amministrazione Trasparente › Bandi di gara e contratti* (29/06/2026);
  - fogli di stile: tema figlio `wp-content/themes/oceanwp-child-theme-inapp/css/style.min.css?54`, tema padre `wp-content/themes/oceanwp/assets/css/style.min.css`, CSS inline del Customizer OceanWP nella home.
- Il file SVG del logo è stato letto solo per ricavarne i colori; **non** è stato salvato nel repository.
- La pagina della home è aggiornata al 23/08/2026 (`article:modified_time`); la piattaforma potrebbe cambiare: ricontrollare prima del rilascio.

### 1.2 Piattaforma tecnica [R]

| Aspetto | Rilevato | Fonte |
|---|---|---|
| CMS e tema | WordPress, tema **OceanWP** con tema figlio `oceanwp-child-theme-inapp` | `<link>` dei CSS nella home |
| Framework UI | **Nessun Bootstrap Italia**: nessun riferimento a `bootstrap-italia`, classi `it-header-*` o sprite di icone di Designers Italia | HTML della home |
| Font | **Titillium Web** da Google Fonts, pesi 100–900 con corsivi | `fonts.googleapis.com/css?family=Titillium+Web:100,…,900i` |
| Icone | **Font Awesome 6.4.2** e Simple Line Icons 2.4.0 (dal tema) | `oceanwp/assets/fonts/fontawesome/css/all.min.css?ver=6.4.2` |
| Altro | Glide.js (caroselli), Yoast SEO, CookieLawInfo (banner cookie con "Rifiuta tutti") | HTML della home |
| Lingua | `<html lang="it-IT">`, versione inglese su `/en/homepage` | HTML della home |

### 1.3 Palette rilevata [R]

Frequenza = occorrenze nel CSS del tema figlio.

| Colore | Hex | Uso sul sito | Occorrenze |
|---|---|---|---|
| **Blu notte INAPP** | `#003567` | Top bar, footer, titoli di pagina (`h1.page-title`), hover dei bottoni, paginazione attiva, bottone di ricerca | 34 + Customizer |
| **Blu INAPP** | `#0059B3` | Sfondo dell'header (`#site-header`), bottone `.btn`, filtri delle notizie, pallini attivi, menu trasparenza nel footer | 17 + Customizer |
| Blu notte (variante) | `#003657` | Link del menu laterale | 5 |
| Testo | `#0B0B0B` | `body` (Customizer) | — |
| Testo scuro | `#191919`, `#333`, `#111` | Accordion, titoli dei widget, filtro attivo | — |
| Grigio placeholder | `#666` | Testo del campo di ricerca | 1 |
| Bordi | `#DDD`, `#CCC`, `#E5E5E5`, `#E1E1E1`, `#E9E9E9` | Card, separatori, tabelle | 10 / 7 / 5 / 1 / tema |
| Fondo tenue azzurro | `#F4F8FB` | Box `vertical-align-center`, risultati di ricerca, elenchi notizie | 3 |
| Bordo azzurro | `#A9C8E0` | Bordo dei box informativi | 1 |
| Zebra tabelle | `#F0F6FC` | Righe pari delle tabelle di Amministrazione Trasparente | 1 |
| Intestazione tabelle | `#F5F5F5` + bordo inferiore 2px `#E1E1E1` | `thead` di Amministrazione Trasparente | 1 |
| Tinta trasparente | `rgba(0,89,179,.10)` | Riquadro metadati evento | 1 |
| Verde | `#68AB54` / hover `#538943` | Eventi esterni e "Partecipa" | 3 / 1 |
| Celeste | `#D8F1FB` | Colonna IeFP | 1 |

**Colori del logo** (dal file `Logo_INAPP-01white-1.svg`, solo lettura): il marchio è un mosaico multicolore con testo bianco; tinte principali `#009EE2`/`#008ECB`/`#05BAEE` (azzurri), `#51AD32`/`#499C2D` (verdi), `#E5007E`/`#CD0071` (magenta), `#E20613`/`#CA0B0F` (rossi), `#FCC200`/`#E1AF00`/`#FFD361` (gialli), `#EC694A`/`#D35F43` (arancio). Queste tinte appartengono al marchio: **non** vanno usate come colori di stato.

### 1.4 Tipografia rilevata [R]

| Elemento | Valore | Fonte |
|---|---|---|
| Famiglia | `font-family: Titillium Web` | Customizer OceanWP (inline) |
| Corpo | `18px`, `line-height: 1.5`, colore `#0B0B0B` | Customizer |
| Radice | `:root { font-size: 16px }` | tema figlio |
| Titoli (tema padre) | `font-weight: 600; line-height: 1.4; color: #333`; h1 23px, h2 20px, h3 18px, h4 17px, h5 15px, h6 14px | `oceanwp/style.min.css` |
| Titolo pagina | `h1.page-title` colore `#003567`, filetto inferiore 1px `#DDD` | tema figlio |
| Menu principale | 21px, `line-height: 1.4`; sottomenu 16px bold | tema figlio |
| Titoli slider home | 1.8rem (1.35rem sotto 990px) bianco su `#003567` | tema figlio |
| Breadcrumb | 0.85rem | tema figlio |
| Etichette form | 16px, `font-weight: 700` (o 600) | tema figlio (`.pl-form`, `.cerca-pubblicazioni`) |

### 1.5 Layout, header, footer e navigazione [R]

- **Contenitore:** `width: 1400px; max-width: 97%`. Pagine interne a due colonne: contenuto 76% + menu laterale 24%; sotto 990px una colonna.
- **Struttura dall'alto:** link "Salta al contenuto" → **top bar** `#003567` (selettore lingua *EN*, *Contatti*; social in mobile) → **header** `#0059B3` alto 91px con logo bianco (136px di larghezza via CSS, `max-width: 166px`), "Seguici su:" con icone social, campo "Cerca nel sito..." (16rem, bordo 1px `#003567`, angoli vivi, bottone lente `#003567`) → **menu principale** centrato, voci bianche 21px: *Istituto, Aree di ricerca, Strumenti, Rilevazioni, Progetti, Eventi, Rivista Sinappsi, Pubblicazioni, Biblioteca, Comunicazione, URP*. Sotto 990px menu hamburger con etichetta "Menù".
- **Breadcrumb:** `Home » Istituto`, separatore `»`, ultima voce con `aria-current="page"` (Yoast).
- **Footer** `#003567`: logo bianco (10rem), denominazione "Istituto nazionale per l'analisi delle politiche pubbliche — Corso d'Italia, 33 — Roma | C.F. 80111170587", social, licenza CC BY-NC 4.0; fascia **TRASPARENZA** su `#0059B3` (Amministrazione Trasparente, Accesso civico, Whistleblowing, Privacy, Dichiarazione di accessibilità, Social Media Policy, Note legali); seconda fascia (Bandi di concorso, Bandi di gara e contratti, Pubblicità legale, Servizi online, …); ultima riga bianca con link `#003567` bold.

### 1.6 Componenti rilevati [R]

| Componente | Stile | Fonte (selettore) |
|---|---|---|
| Bottone | sfondo `#0059B3`, testo bianco, `padding: .75rem 1rem`, `font-weight: 700`, hover `#003567`, transizione 0.2s, **angoli vivi** | `.btn` |
| Bottone ricerca pubblicazioni | `#0059B3`, 600, 1rem, `padding: .5rem 2rem`, **MAIUSCOLO** | `.cerca-pubblicazioni .align-end button` |
| Card | bordo 1px `#DDD`, `border-radius: .25rem`, nessuna ombra (un'ombra `0 0 10px rgb(214 214 214/50%)` è dichiarata ma non valida) | `.evidenza-box-hp`, `#gallery-strumenti` |
| Etichetta di sezione | fascia `#003567` o `#0059B3`, testo bianco 600, 0.9–1rem | `.titoletto`, `.evidenza-box-hp--title` |
| Chip/filtri | rettangoli `#0059B3` (attivo `#111`); pillole `#003567` con `border-radius: 1.25rem` | `.notizie-filters`, `.events-top-navigation` |
| Paginazione | quadrati 2rem, bordo `#CCC`, raggio .25rem, attivo `#0059B3` | `.pubb-pagination` |
| Tabelle | `th` **maiuscolo**, padding 10px, bordo inferiore `#E9E9E9`; in Trasparenza `thead` `#F5F5F5`, zebra `#F0F6FC` | OceanWP, `.single-amm-trasparente` |
| Campi form | altezza minima 40px, 14px, `padding: 6px 12px`, bordo 1px `#DDD`, raggio 3px; focus: bordo `#BBB`, `outline: 0` | OceanWP |
| Accordion | quadratino `#191919` con "+", bordo `#CCC` | `.accordion-item` |
| Link nel contenuto | sottolineati; icona dopo i link esterni, `mailto:` e `tel:` | `#primary a[target=_blank]:after` |

### 1.7 Logo e iconografia [R]

- Logo in versione **bianca** su fondo blu (`#0059B3` nell'header, `#003567` nel footer); `alt="Inapp"` nell'header, `alt=""` nel footer. Il marchio contiene un mosaico multicolore: va sempre su fondo scuro uniforme.
- Nella home compaiono anche i loghi **Unione Europea** e **Ministero del Lavoro** (contesto PN Giovani, donne e lavoro / FSE+). Non vanno riprodotti nell'app: hanno regole d'uso proprie.
- Icone: Font Awesome (social, lente, calendario, link esterno, busta, telefono) con `aria-hidden="true"`.

### 1.8 Tono di voce osservato [R]

- **Istituzionale, in terza persona, descrittivo:** "L'Istituto nazionale per l'analisi delle politiche pubbliche (Inapp) è un Ente pubblico di ricerca…". Frasi lunghe e ricche di riferimenti normativi ("art. 37, Decreto Legislativo 14 marzo 2013, n. 33").
- Call to action brevi: "Vai al contenuto", "Consulta tutti gli eventi", "Cerca nel sito...", "Seguici su:", "Rifiuta tutti" / "Accetta tutti".
- Metadati espliciti nelle pagine di trasparenza: "Responsabile dei dati: …", "Ultimo aggiornamento: 17/06/2026".
- **Incoerenze da non replicare:** denominazione "Inapp" e "INAPP" alternate; date in tre formati (`29.07.2026`, `20-07-2026`, `17/06/2026`); intestazioni di tabella in maiuscolo; misto italiano/inglese nell'interfaccia (`Search:`).

### 1.9 Note di accessibilità sul sito [R]

- Buone pratiche presenti: skip link, `aria-label` "(si apre in una nuova scheda)" sui link esterni, `aria-current` nel breadcrumb, testo alternativo nascosto sul bottone di ricerca, Dichiarazione di accessibilità pubblicata tramite il form AgID.
- Criticità rilevate (contrasti calcolati in §4.9): testo bianco su `#68AB54` = **2.78:1** (non conforme); bordi `#DDD` = 1.36:1 (accettabili solo come separatori decorativi, non come confine di un controllo); focus degli input con `outline: 0` e bordo `#BBB` (debole).

---

## 2. Design system della PA e linee guida

### 2.1 Il sito INAPP usa il design system della PA?

**Solo in parte.** Il sito adotta **Titillium Web**, il carattere di riferimento di Designers Italia, e alcune pratiche di accessibilità, ma è costruito su un tema WordPress commerciale (OceanWP) personalizzato, **non** su Bootstrap Italia, UI Kit Italia o i modelli di Designers Italia. Il colore primario è il blu INAPP `#0059B3` e il blu notte `#003567`, non il "Blu Italia" `#0066CC` del design system. INAPP è un ente nazionale vigilato dal Ministero del Lavoro e usa un dominio `.gov.it`. Designers Italia indica Blu Italia e header/footer standard per i servizi su scala nazionale e un colore primario libero per i servizi territoriali; INAPP ha di fatto un'identità cromatica propria, che questo documento rispetta.

### 2.2 Quadro normativo pertinente

| Riferimento | Cosa comporta per l'MVP | Fonte |
|---|---|---|
| CAD, art. 53, e **Linee guida di design per i siti internet e i servizi digitali della PA** (AgID, Determina n. 224/2022) | Requisiti di design per siti e servizi digitali delle PA; rimandano a Designers Italia per kit, modelli e Manuale operativo. Per un prototipo interno sono un riferimento di buona pratica, non un obbligo di conformità puntuale. | [AgID, PDF](https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf), [notizia AgID](https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2022/07/27/pubblicate-linee-guida-design-i-siti-internet-i-servizi-digitali-pa), [Designers Italia](https://designers.italia.it/community/notizie/20220727-nuove-linee-guida-e-manuale-operativo-di-design/) |
| Legge 4/2004 ("Legge Stanca") e **Linee guida sull'accessibilità degli strumenti informatici** (AgID) | Accessibilità obbligatoria per le PA, con riferimento a **EN 301 549** e quindi a **WCAG 2.1 AA**; dichiarazione di accessibilità e modello di autovalutazione. Applicabilità agli applicativi interni: da confermare con il responsabile dell'accessibilità di INAPP (obiettivo comunque DEC-080). | [Linee guida AgID (PDF docs.italia)](https://docs.italia.it/media/pdf/lg-accessibilita-docs/bozza/lg-accessibilita-docs.pdf), [Allegato 2 — autovalutazione](https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/stabile/_downloads/1fc9ff9c1f5ead84753923dbecf38ee1/Allegato%202%20-%20Modello%20di%20autovalutazione.pdf) |
| WCAG 2.1 | Criteri 1.4.3 (contrasto testo 4.5:1), 1.4.11 (contrasto non testuale 3:1), 1.4.1 (non solo colore), 2.4.7 (focus visibile), 1.4.10 (reflow), 1.4.12 (spaziatura testo), 4.1.3 (messaggi di stato). | [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/) |

### 2.3 Designers Italia: fondamenti utili [DI]

| Fondamento | Indicazione | Fonte |
|---|---|---|
| Identità | Servizi nazionali: Titillium, Blu Italia `#0066CC`, header/footer standard; servizi territoriali: colore primario libero applicato con coerenza; sempre nel rispetto delle linee guida di accessibilità. | [Identità](https://designers.italia.it/design-system/fondamenti/identita/) |
| Colori | Primario `#0066CC` (HSL 210°, 100%, 40%); feedback: successo `#008055`, errore `#CC334D`, avviso arancio; soglie 4.5:1 testo e 3:1 grafica. | [Colori](https://designers.italia.it/design-system/fondamenti/colori/) |
| Tipografia | **Titillium Web** (titoli, interfaccia, testo), **Lora** (lettura lunga), **Roboto Mono** (dati tecnici, codice). H1 40–48, H2 32–40, H3 28–32 bold; H4 24–32, H5 20–24, H6 16–18 semibold; testo 16–18/24; didascalia 14/16; righe max ~75 caratteri; ritmo verticale di 4px; massimo 4 livelli di titolo per pagina. | [Tipografia](https://designers.italia.it/design-system/fondamenti/tipografia/) |
| Microtesti | Verbi specifici nelle call to action; errori che spiegano problema, causa e soluzione senza colpevolizzare; conferme "Vuoi + verbo" per azioni irreversibili; stati vuoti che indicano come iniziare; terminologia coerente. | [Microtesti](https://designers.italia.it/design-system/fondamenti/microtesti/) |
| Tono di voce | Autorevole ma semplice, niente burocratese superfluo, uso del "tu", tono adattato allo stato d'animo, orientamento all'azione. | [Tono di voce](https://designers.italia.it/design-system/fondamenti/tono-di-voce/), [Guida al linguaggio della PA](https://docs.italia.it/italia/designers-italia/writing-toolkit/it/bozza/index.html) |
| Manuale operativo | Come progettare con il design system .italia. | [Manuale operativo di design](https://docs.italia.it/italia/designers-italia/manuale-operativo-design-docs/it/versione-corrente/doc/progettazione-dell-interfaccia/progettare-con-il-design-system-italia.html) |

**Bootstrap Italia 2.18.3** (`src/scss/base/_variables.scss`, letto da npm/jsDelivr) [DI]: `$primary` = HSB(210, 100, 80) = `#0066CC`; `$font-family-sans-serif: 'Titillium Web', Geneva, Tahoma, sans-serif`; serif `Lora`; mono `Roboto Mono`; `$font-size-base: 1rem`; `$border-radius: 4px` (sm 2px, lg 8px); breakpoint `576 / 768 / 992 / 1200 / 1400`; successo `hsl(160,100%,25%)` = `#008055`, pericolo `hsl(350,60%,50%)` = `#CC334D`, avviso `hsl(36,100%,30%)` = `#995C00`; colore scuro `hsl(210,54%,20%)` = `#17334F`. Fonte: [bootstrap-italia su jsDelivr](https://cdn.jsdelivr.net/npm/bootstrap-italia@2.18.3/src/scss/base/_variables.scss), [documentazione](https://italia.github.io/bootstrap-italia/).

### 2.4 Scelta per l'MVP [P]

**Identità INAPP + fondamenti di Designers Italia, implementati con shadcn/ui e Tailwind.**

- **Colori:** si usano quelli di INAPP (`#003567`, `#0059B3`) e non `#0066CC`, perché l'app deve risultare riconoscibile per gli utenti dell'Istituto. Il blu INAPP ha un contrasto migliore del Blu Italia (6.82:1 contro 5.57:1 su bianco).
- **Fondamenti DI:** Titillium Web, Roboto Mono per i codici, griglia a 4px, raggio di 4px, scala tipografica ridotta per l'alta densità, regole di microtesto e tono.
- **Componenti:** shadcn/ui (Radix) personalizzato con i token. Scartati *Bootstrap Italia* (CSS Bootstrap 5 globale, in conflitto con Tailwind) e *Design React Kit* (`italia/design-react-kit`, basato su Bootstrap Italia e pensato per siti e servizi al cittadino). Registrare la scelta come DEC-1xx se l'agente la ritiene irreversibile.
- **Densità:** il sito è editoriale (corpo 18px); l'app è un gestionale, quindi il testo di default è 14px nelle tabelle e 16px nei form, entro l'intervallo 12–18px indicato da DI.

---

## 3. Principi di design

1. **Dato prima della decorazione.** Superfici piatte, bordi sottili al posto delle ombre (come il sito INAPP), colore riservato a significato e azioni. Nessuna immagine decorativa.
2. **Lo stato si legge senza colore.** Ogni stato (health, severità, fase, milestone, SAL) è un **testo + icona**; il colore rafforza ma non è mai l'unico canale (WCAG 1.4.1, guida §5.1).
3. **Ogni numero ha unità, periodo e fonte.** Importi in euro con formato italiano, data di riferimento visibile, "n.d." quando il dato manca (mai 0), link all'evidenza (`source_type`, `evidence_refs`).
4. **Spiegare il perché.** Accanto a health e alert si mostrano le regole causali (`health_drivers`): "Rosso perché la memoria è scaduta il 26/09/2026".
5. **Azioni sicure e reversibili per default.** Conferma esplicita per operazioni irreversibili, motivazione obbligatoria dove la richiede la specifica, quattro occhi visibili ("Non puoi approvare una proposta che hai creato").
6. **Densità controllata a 1366×768.** Tabelle compatte, filtri in una riga, contenuto utile sopra la piega; mai scroll orizzontale della pagina (solo dentro le tabelle).
7. **Identità sobria e onesta.** Colori INAPP, nessun uso del logo ufficiale nell'ambiente demo, banner DEMO sempre visibile.
8. **Tastiera e screen reader alla pari del mouse.** Focus visibile, ordine logico, nomi accessibili, annunci dei messaggi di stato.

---

## 4. Design token

I token completi sono in [`docs/design/tokens.css`](design/tokens.css). Struttura su tre livelli:

1. **primitivi** (`--brand-*`, `--primary-50…950`, `--neutral-0…950`): solo valori, mai usati direttamente nei componenti;
2. **semantici** (`--ds-color-*`, `--health-*`, `--severity-*`, `--feedback-*`, `--chart-*`, `--demo-banner-*`, tipografia, spaziature, raggi, ombre): l'unico livello consumato dai componenti;
3. **alias shadcn/ui** (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`, …) che puntano ai semantici.

I token semantici di colore, tipografia, raggio e ombra hanno il prefisso **`--ds-`** (es. `--ds-color-text`, `--ds-radius`): i nomi `--color-*`, `--font-*`, `--text-*`, `--radius-*` e `--shadow-*` sono namespace del tema di Tailwind v4 e, riusati, creerebbero riferimenti circolari nel blocco `@theme` (§4.14).

L'MVP ha **solo il tema chiaro**. Un tema scuro richiederebbe nuovi passi di colore validati, non un'inversione automatica.

### 4.1 Brand e scala primaria

| Token | Hex | Origine | Uso |
|---|---|---|---|
| `--brand-navy` = `--primary-800` | `#003567` | [R] top bar e footer | Header applicativo, titoli di pagina, hover/active dei bottoni, voce attiva della sidebar |
| `--brand-blue` = `--primary-600` | `#0059B3` | [R] header e `.btn` | Bottone primario, link, focus, serie "Previsione" |
| `--brand-tint` | `#F4F8FB` | [R] box informativi | Barra filtri, pannelli, hover di riga |
| `--brand-tint-border` | `#A9C8E0` | [R] | Bordo dei pannelli informativi |
| `--primary-50` | `#F0F6FC` | [R] zebra Trasparenza | Righe alterne |
| `--primary-100` | `#E0ECF8` | [P] | Riga selezionata, voce attiva della sidebar |
| `--primary-200` | `#C2D9F0` | [P] | Testo secondario su header navy |
| `--primary-300…500` | `#94BCE3` `#5C97D1` `#2A74C2` | [P] | Illustrazioni, stati intermedi (non per testo) |
| `--primary-700` | `#004A94` | [P] | Hover del bottone primario |
| `--primary-900/950` | `#00264A` `#001A33` | [P] | Riserva |
| `--brand-yellow` | `#FFD361` | [R] logo | **Solo** banner DEMO |
| `--brand-yellow-strong` | `#FCC200` | [R] logo | **Solo** anello di focus su fondo navy |

### 4.2 Neutri, superfici, testo e bordi [P]

Neutri freddi (tinta ~210°) coerenti con il blu INAPP: `--neutral-0 #FFFFFF`, `25 #FAFBFC`, `50 #F4F6F8`, `100 #EBEEF2`, `200 #DDE2E8`, `300 #C4CCD5`, `400 #9AA5B1`, `500 #6E7A87`, `600 #55606D`, `700 #3E4853`, `800 #2A323B`, `900 #1A1F24`, `950 #0E1216`.

| Token semantico | Valore | Uso |
|---|---|---|
| `--ds-color-bg-page` | `#F4F6F8` | Sfondo dell'area contenuti |
| `--ds-color-bg-surface` | `#FFFFFF` | Card, tabelle, modali, sidebar |
| `--ds-color-bg-subtle` | `#F4F8FB` | Barra filtri, hover riga, pannelli |
| `--ds-color-bg-muted` | `#EBEEF2` | Intestazioni di tabella, chip di fase |
| `--ds-color-bg-zebra` | `#F0F6FC` | Righe alterne (opzionali) |
| `--ds-color-bg-selected` | `#E0ECF8` | Righe selezionate, voce attiva |
| `--ds-color-text` | `#1A1F24` | Testo principale |
| `--ds-color-text-secondary` | `#3E4853` | Testo di supporto |
| `--ds-color-text-muted` | `#55606D` | Etichette, metadati, unità |
| `--ds-color-text-placeholder` | `#687482` | Placeholder (conforme 4.5:1) |
| `--ds-color-link` / `-hover` | `#0059B3` / `#003567` | Link (sempre sottolineati nel testo corrente) |
| `--ds-color-border` | `#DDE2E8` | Separatori decorativi |
| `--ds-color-border-input` | `#6E7A87` | Bordo di input, select, checkbox (≥ 3:1) |
| `--ds-color-focus` / `-inverse` | `#0059B3` / `#FCC200` | Anello di focus su chiaro / su navy |
| `--ds-color-action-danger` | `#B3261E` (hover `#8E1E18`) | Azioni distruttive |

### 4.3 Health: VERDE / AMBRA / ROSSO / NEUTRO [P]

| Health (codice) | Etichetta UI | Icona (lucide-react) | `fg` testo/icona | `bg` | `border` | `solid` (grafici, Gantt, pallini) |
|---|---|---|---|---|---|---|
| `GREEN` | **Verde** | `CircleCheck` | `#12663A` | `#E7F5EC` | `#9FD3B0` | `#1E7B45` |
| `AMBER` | **Ambra** | `TriangleAlert` | `#8A4600` | `#FFF4DB` | `#F2C27A` | `#C27C00` |
| `RED` | **Rosso** | `OctagonAlert` | `#9B1C1C` | `#FDECEC` | `#E8A3A3` | `#9B1C1C` |
| `NEUTRAL` | **Neutro** | `CircleMinus` | `#4A5560` | `#EEF1F4` | `#C4CCD5` | `#6E7A87` |

- Le icone hanno **forme diverse** (cerchio, triangolo, ottagono, cerchio con trattino): distinguono lo stato anche in scala di grigi e in modalità a contrasto elevato.
- Validazione daltonismo (simulazione Machado 2009, OKLab, script `validate_palette.js` della skill dataviz): i `solid` verde/ambra/rosso hanno ΔE minimo **6.7** (deuteranopia, verde↔rosso), nella fascia 6–8 ammessa **solo** con codifica secondaria; distanza in visione normale ≥ 21.4. Per questo testo + icona sono obbligatori.
- Lo stato neutro ha croma volutamente bassa (significa "non valutato").

### 4.4 Severità degli alert [P]

| Severità | Etichetta | Icona | Stile | `fg` | `bg` |
|---|---|---|---|---|---|
| `LOW` | **Bassa** | `Info` | tenue | `#0B4F8A` | `#E8F1FA` |
| `MEDIUM` | **Media** | `TriangleAlert` | tenue | `#8A4600` | `#FFF4DB` |
| `HIGH` | **Alta** | `CircleAlert` | tenue + testo 600 | `#9A3412` | `#FDEDE4` |
| `CRITICAL` | **Critica** | `OctagonAlert` | **pieno** (unico invertito) | `#FFFFFF` | `#B3261E` |

Ordine di priorità visiva: Critica > Alta > Media > Bassa. Nelle liste ordinate per severità la colonna contiene sempre l'etichetta testuale.

### 4.5 Feedback [P]

| Ruolo | Testo | Sfondo | Icona |
|---|---|---|---|
| Successo | `#12663A` | `#E7F5EC` | `CircleCheck` |
| Avviso | `#8A4600` | `#FFF4DB` | `TriangleAlert` |
| Errore | `#9B1C1C` (testo sotto i campi `#B3261E`) | `#FDECEC` | `CircleX` |
| Informazione | `#0B4F8A` | `#E8F1FA` | `Info` |

### 4.6 Grafici [P]

**Serie temporali della finanza** (job "identità", validato *all-pairs* sui primi tre slot: CVD ΔE ≥ 10.0, visione normale ≥ 24.9, contrasto ≥ 3:1):

| Serie | Token | Hex | Codifica secondaria obbligatoria |
|---|---|---|---|
| **Baseline** | `--chart-baseline-fill` + `--chart-baseline-stroke` | `#9AA5B1` + bordo `#55606D` | Tratteggio a 45°, bordo 1.5px, legenda e etichetta "Baseline" |
| **Previsione approvata** | `--chart-1` | `#0059B3` | Pieno |
| **Pagato** (consuntivo) | `--chart-3` | `#1A9E77` | Pieno |
| **Simulazione** | `--chart-2` | `#E0682F` | Tratteggio a 135° + bordo tratteggiato; etichetta "Simulazione (non approvata)" |
| **Disponibilità** | `--chart-availability` | `#1A1F24` | Linea a gradino tratteggiata 2px, mai barra |
| **Eccedenza** | `--chart-overflow` | `#9B1C1C` | Contorno + etichetta diretta "Eccedenza 80.000 €" + icona `OctagonAlert` |
| Linea "oggi" | `--chart-today` | `#003567` | Etichetta "Data di riferimento 01/10/2026" |

La baseline è un *riferimento* volutamente grigio: il riempimento da solo è 2.50:1 su bianco, quindi il requisito 1.4.11 è soddisfatto dal **bordo `#55606D` (6.40:1)**, dal tratteggio e dalla vista tabellare.

**Palette categoriale** (strutture, tipologie; ordine fisso, mai ciclato; validata sulle coppie adiacenti: CVD ΔE minimo 9.7, visione normale ≥ 17.8, tutte ≥ 3:1 su bianco):

| Slot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Hex | `#0059B3` | `#E0682F` | `#1A9E77` | `#B88200` | `#C2187A` | `#3F8F2A` | `#5B3FA8` | `#0096D6` |
| Tinta | blu INAPP | arancio (logo) | acqua | ocra (logo) | magenta (logo) | verde (logo) | viola | ciano (logo) |

Regole: oltre 8 serie si raggruppa in "Altre"; nei grafici a dispersione o con confronti tra serie qualsiasi (*all-pairs*) usare **al massimo 3 slot**; il colore segue l'entità (una struttura mantiene il colore anche quando un filtro cambia il numero di serie); lo slot 6 (verde) non va affiancato agli stati di health; mai doppio asse y; colori di health **riservati** agli stati.

### 4.7 Banner DEMO [P]

`--demo-banner-bg #FFD361`, testo `#1A1F24` (11.65:1), bordo inferiore `#8A6100` (5.54:1). Il giallo con trama a righe (vedi §6.1) non si confonde con il badge Ambra (`#FFF4DB`, senza righe).

### 4.8 Ombre, bordi, raggi

| Token | Valore | Origine | Uso |
|---|---|---|---|
| `--ds-radius-none` | 0 | [R] bottoni e ricerca del sito | Banner, barre |
| `--ds-radius-sm` | 2px | [DI] | Badge compatti, checkbox |
| `--ds-radius` | **4px** | [R] card del sito, [DI] default | Bottoni, input, card, badge, popover e menu (alimenta `--radius` di shadcn e `rounded-md`) |
| `--ds-radius-md` | 6px | [P] | Riserva (non mappato sulle classi Tailwind) |
| `--ds-radius-lg` | 8px | [DI] | Modali, drawer |
| `--ds-radius-full` | 9999px | [R] pillole eventi | Chip dei filtri, contatori |
| `--ds-shadow-none` | — | [R] il sito non usa ombre | Card e tabelle (si usa il bordo 1px `--ds-color-border`) |
| `--ds-shadow-sm` | `0 1px 3px rgba(16,24,40,.10), 0 1px 2px rgba(16,24,40,.06)` | [P] | Header di tabella sticky, card sollevata in drag |
| `--ds-shadow-md` | `0 4px 12px rgba(16,24,40,.12)` | [P] | Dropdown, popover, toast |
| `--ds-shadow-lg` | `0 12px 32px rgba(16,24,40,.18)` | [P] | Modali |

### 4.9 Tabella dei contrasti (calcolati)

Calcolo con la formula WCAG 2.1 della luminanza relativa (script Python, appendice A). Soglie: **4.5:1** per testo normale (1.4.3), **3:1** per componenti e grafica (1.4.11).

| Uso | Primo piano | Sfondo | Rapporto | Soglia | Esito |
|---|---|---|---:|---:|---|
| Testo primario su bianco | `#1A1F24` | `#FFFFFF` | 16.60:1 | 4.5:1 | AA ✔ |
| Testo primario su surface-subtle | `#1A1F24` | `#F4F8FB` | 15.54:1 | 4.5:1 | AA ✔ |
| Testo primario su riga selezionata | `#1A1F24` | `#E0ECF8` | 13.85:1 | 4.5:1 | AA ✔ |
| Testo secondario su bianco | `#3E4853` | `#FFFFFF` | 9.31:1 | 4.5:1 | AA ✔ |
| Testo muted su bianco | `#55606D` | `#FFFFFF` | 6.40:1 | 4.5:1 | AA ✔ |
| Testo muted su surface-subtle | `#55606D` | `#F4F8FB` | 6.00:1 | 4.5:1 | AA ✔ |
| Testo muted su sfondo pagina | `#55606D` | `#F4F6F8` | 5.91:1 | 4.5:1 | AA ✔ |
| Testo muted su riga zebra | `#55606D` | `#F0F6FC` | 5.88:1 | 4.5:1 | AA ✔ |
| Testo muted su intestazione tabella | `#55606D` | `#EBEEF2` | 5.50:1 | 4.5:1 | AA ✔ |
| Placeholder su bianco | `#687482` | `#FFFFFF` | 4.76:1 | 4.5:1 | AA ✔ |
| Link su bianco | `#0059B3` | `#FFFFFF` | 6.82:1 | 4.5:1 | AA ✔ |
| Link su riga zebra | `#0059B3` | `#F0F6FC` | 6.26:1 | 4.5:1 | AA ✔ |
| Link su riga selezionata | `#0059B3` | `#E0ECF8` | 5.69:1 | 4.5:1 | AA ✔ |
| Link hover su bianco | `#003567` | `#FFFFFF` | 12.32:1 | 4.5:1 | AA ✔ |
| Bianco su bottone primario | `#FFFFFF` | `#0059B3` | 6.82:1 | 4.5:1 | AA ✔ |
| Bianco su bottone primario hover | `#FFFFFF` | `#004A94` | 8.72:1 | 4.5:1 | AA ✔ |
| Testo bottone secondario | `#003567` | `#FFFFFF` | 12.32:1 | 4.5:1 | AA ✔ |
| Bordo bottone secondario | `#0059B3` | `#FFFFFF` | 6.82:1 | 3:1 | AA ✔ |
| Bianco su bottone danger | `#FFFFFF` | `#B3261E` | 6.54:1 | 4.5:1 | AA ✔ |
| Bianco su bottone danger hover | `#FFFFFF` | `#8E1E18` | 8.94:1 | 4.5:1 | AA ✔ |
| Bianco su header navy | `#FFFFFF` | `#003567` | 12.32:1 | 4.5:1 | AA ✔ |
| Testo secondario su header navy | `#C2D9F0` | `#003567` | 8.49:1 | 4.5:1 | AA ✔ |
| Navy su voce sidebar attiva | `#003567` | `#E0ECF8` | 10.28:1 | 4.5:1 | AA ✔ |
| Bordo input | `#6E7A87` | `#FFFFFF` | 4.38:1 | 3:1 | AA ✔ |
| Anello di focus su bianco | `#0059B3` | `#FFFFFF` | 6.82:1 | 3:1 | AA ✔ |
| Anello di focus su navy | `#FCC200` | `#003567` | 7.54:1 | 3:1 | AA ✔ |
| Testo banner DEMO | `#1A1F24` | `#FFD361` | 11.65:1 | 4.5:1 | AA ✔ |
| Bordo banner DEMO | `#8A6100` | `#FFFFFF` | 5.54:1 | 3:1 | AA ✔ |
| Chip di fase | `#2A323B` | `#EBEEF2` | 11.15:1 | 4.5:1 | AA ✔ |
| **Verde** testo su fondo badge | `#12663A` | `#E7F5EC` | 6.25:1 | 4.5:1 | AA ✔ |
| Verde testo su bianco | `#12663A` | `#FFFFFF` | 7.03:1 | 4.5:1 | AA ✔ |
| Verde solid su bianco | `#1E7B45` | `#FFFFFF` | 5.28:1 | 3:1 | AA ✔ |
| **Ambra** testo su fondo badge | `#8A4600` | `#FFF4DB` | 6.50:1 | 4.5:1 | AA ✔ |
| Ambra testo su bianco | `#8A4600` | `#FFFFFF` | 7.10:1 | 4.5:1 | AA ✔ |
| Ambra solid su bianco | `#C27C00` | `#FFFFFF` | 3.40:1 | 3:1 | AA ✔ |
| **Rosso** testo su fondo badge | `#9B1C1C` | `#FDECEC` | 7.14:1 | 4.5:1 | AA ✔ |
| Rosso testo/solid su bianco | `#9B1C1C` | `#FFFFFF` | 8.15:1 | 4.5:1 | AA ✔ |
| **Neutro** testo su fondo badge | `#4A5560` | `#EEF1F4` | 6.71:1 | 4.5:1 | AA ✔ |
| Neutro testo su bianco | `#4A5560` | `#FFFFFF` | 7.61:1 | 4.5:1 | AA ✔ |
| Neutro solid su bianco | `#6E7A87` | `#FFFFFF` | 4.38:1 | 3:1 | AA ✔ |
| Severità **Bassa** | `#0B4F8A` | `#E8F1FA` | 7.36:1 | 4.5:1 | AA ✔ |
| Severità **Media** | `#8A4600` | `#FFF4DB` | 6.50:1 | 4.5:1 | AA ✔ |
| Severità **Alta** | `#9A3412` | `#FDEDE4` | 6.41:1 | 4.5:1 | AA ✔ |
| Severità **Critica** (bianco su pieno) | `#FFFFFF` | `#B3261E` | 6.54:1 | 4.5:1 | AA ✔ |
| Testo errore sotto i campi | `#B3261E` | `#FFFFFF` | 6.54:1 | 4.5:1 | AA ✔ |
| Toast informazione | `#0B4F8A` | `#E8F1FA` | 7.36:1 | 4.5:1 | AA ✔ |
| Grafico slot 1 / Previsione | `#0059B3` | `#FFFFFF` | 6.82:1 | 3:1 | AA ✔ |
| Grafico slot 2 / Simulazione | `#E0682F` | `#FFFFFF` | 3.39:1 | 3:1 | AA ✔ |
| Grafico slot 3 / Pagato | `#1A9E77` | `#FFFFFF` | 3.39:1 | 3:1 | AA ✔ |
| Grafico slot 4 | `#B88200` | `#FFFFFF` | 3.37:1 | 3:1 | AA ✔ |
| Grafico slot 5 | `#C2187A` | `#FFFFFF` | 5.67:1 | 3:1 | AA ✔ |
| Grafico slot 6 | `#3F8F2A` | `#FFFFFF` | 4.06:1 | 3:1 | AA ✔ |
| Grafico slot 7 | `#5B3FA8` | `#FFFFFF` | 7.72:1 | 3:1 | AA ✔ |
| Grafico slot 8 | `#0096D6` | `#FFFFFF` | 3.32:1 | 3:1 | AA ✔ |
| Baseline: riempimento | `#9AA5B1` | `#FFFFFF` | 2.50:1 | 3:1 | Da solo ✘ → conforme grazie al bordo |
| Baseline: bordo | `#55606D` | `#FFFFFF` | 6.40:1 | 3:1 | AA ✔ |
| Disponibilità (linea) | `#1A1F24` | `#FFFFFF` | 16.60:1 | 3:1 | AA ✔ |
| Linea "oggi" nel Gantt | `#003567` | `#F4F6F8` | 11.37:1 | 3:1 | AA ✔ |
| *[R] Corpo del sito* | `#0B0B0B` | `#FFFFFF` | 19.68:1 | 4.5:1 | AA ✔ |
| *[R] Bianco su header del sito* | `#FFFFFF` | `#0059B3` | 6.82:1 | 4.5:1 | AA ✔ |
| *[R] Bianco su top bar/footer* | `#FFFFFF` | `#003567` | 12.32:1 | 4.5:1 | AA ✔ |
| *[R] Bianco su verde eventi* | `#FFFFFF` | `#68AB54` | 2.78:1 | 4.5:1 | ✘ non conforme (non riusare) |
| *[R] Placeholder `#666`* | `#666666` | `#FFFFFF` | 5.74:1 | 4.5:1 | AA ✔ |
| *[R] Bordo card `#DDD`* | `#DDDDDD` | `#FFFFFF` | 1.36:1 | 3:1 | ✘ solo decorativo |
| *[DI] Blu Italia* | `#0066CC` | `#FFFFFF` | 5.57:1 | 4.5:1 | AA ✔ |

Qualsiasi nuova coppia colore va aggiunta a questa tabella e verificata con lo script (appendice A). In CI, `@axe-core/playwright` (DEC-080) controlla i contrasti effettivi.

### 4.10 Tipografia

**Famiglie:** `--ds-font-sans: var(--font-titillium), "Titillium Web", "Segoe UI", Roboto, Helvetica, Arial, sans-serif` [R][DI]; `--ds-font-mono: var(--font-roboto-mono), "Roboto Mono", ui-monospace, Consolas, monospace` [DI] per CIG, CUP, codici procedura (P-002), correlation ID e hash.

**Verifiche sul file del font** (Titillium Web 1.002 da Google Fonts, analizzato con fontTools):

- pesi disponibili **200, 300, 400, 600, 700, 900**: **non esiste il 500**. Mappare `font-medium` di Tailwind su 600 oppure vietarlo (lint), altrimenti il browser sintetizza o arrotonda il peso;
- le cifre sono già **tabulari** (larghezza 560/1000 per tutte); `tnum` non è una feature OpenType del font, quindi `tabular-nums` è innocuo ma non necessario. Gli importi si allineano in colonna anche in Titillium;
- presenti `€` e lo spazio indivisibile U+00A0 (usato da `Intl` it-IT); **assente** U+202F (spazio stretto indivisibile): non introdurlo a mano.

Caricamento con `next/font/google`: `Titillium_Web({ subsets: ['latin','latin-ext'], weight: ['400','600','700'], display: 'swap', variable: '--font-titillium' })` e `Roboto_Mono({ subsets: ['latin'], weight: ['400','600'], variable: '--font-roboto-mono' })`, con le classi `variable` applicate a `<html>`; `--ds-font-sans` le richiama per prime (vedi `tokens.css`).

**Scala [P]** (rem su base 16px; non alterare il `font-size` di `<html>`, così lo zoom del browser resta corretto):

| Token | Dimensione / interlinea | Peso | Uso |
|---|---|---|---|
| `text-xs` | 12/16 | 400–600 | Didascalie, etichette degli assi, contatori. Mai per informazioni essenziali da sole. |
| `text-sm` | **14/20** | 400 | **Default UI**: celle di tabella, menu, badge, etichette secondarie |
| `text-base` | 16/24 | 400 | Input, testo dei form, paragrafi, risposte dell'assistente |
| `text-lg` | 18/28 | 600 | Titoli di sezione (h3), titolo dei modali |
| `text-xl` | 20/28 | 600 | Titoli di card e aree (h2) |
| `text-2xl` | 24/32 | 700 | Titolo di pagina (h1), colore `--brand-navy` come sul sito |
| `text-3xl` | 30/36 | 600 | Valore principale delle KPI card |

Regole: intestazioni di tabella in *sentence case* 14px 600 (non in maiuscolo come sul sito); massimo 4 livelli di titolo per pagina (DI); paragrafi lunghi entro ~75 caratteri (`max-w-prose`); spaziatura del testo ridefinibile dall'utente senza perdita di contenuto (1.4.12): niente altezze fisse sui contenitori di testo.

### 4.11 Spaziature e densità [P]

Griglia a **4px** (ritmo verticale DI), corrispondente alla scala predefinita di Tailwind (`1` = 4px). Valori ricorrenti:

| Elemento | Valore |
|---|---|
| Padding orizzontale pagina | 24px (`px-6`) |
| Gap tra card / sezioni | 16px / 24px |
| Padding card | 16px (compatte 12px) |
| Altezza controlli | 36px default, 32px compatti (toolbar e filtri), 44px per l'azione principale dei form a pagina intera |
| Riga di tabella | 40px default, **32px compatta** (portafoglio); padding cella 8px × 12px |
| Area cliccabile minima | 24×24px (anticipa WCAG 2.2 2.5.8); icone-bottone 32×32px |
| Banner DEMO / header / sidebar | 32px / 56px / 232px (64px compressa) |

### 4.12 Breakpoint e layout [P]

| Nome Tailwind | Min | Comportamento |
|---|---|---|
| `sm` | 640px | Layout di consultazione a colonna singola (non obiettivo MVP) |
| `md` | 768px | Sidebar a scomparsa (drawer) |
| `lg` | 1024px | **Minimo supportato pienamente**: sidebar compressa a icone (64px) |
| `xl` | 1280px | **Risoluzione primaria (1366×768)**: sidebar estesa 232px, area contenuti ~1086px netti |
| `2xl` | 1536px | Contenuti fino a `max-width: 1600px`, centrati |

A 1366×768 lo spazio verticale utile, tolti banner e header (88px) e la UI del browser, è di circa 560–600px: KPI, filtri e prime righe delle tabelle devono stare sopra la piega. Header di tabella e barra azioni del wizard sono *sticky*. Reflow (1.4.10): a 320px CSS (zoom 400%) le pagine passano a una colonna; le tabelle dati possono scorrere orizzontalmente dentro il proprio contenitore (eccezione ammessa per contenuti bidimensionali).

### 4.13 Movimento e livelli [P]

Durate 120ms (hover, focus) e 200ms (apertura di popover e modali), easing `cubic-bezier(0.2,0,0,1)`. Con `prefers-reduced-motion: reduce` niente animazioni (già in `tokens.css`). Niente skeleton lampeggianti più di 3 volte al secondo. Livelli z: sticky 20, header 30, dropdown 40, overlay 50, modale 60, toast 70, skip link 100.

### 4.14 Mappatura Tailwind

**Tailwind v4 (consigliato con Next.js e shadcn/ui attuali)** — in `app/globals.css`:

```css
@import "tailwindcss";
@import "../../docs/design/tokens.css"; /* oppure copia in frontend/src/styles/tokens.css */

@theme inline {
  /* Nota: i token del progetto usano il prefisso --ds- per non collidere con i
     namespace di Tailwind v4 (--color-*, --font-*, --text-*, --radius-*, --shadow-*). */
  --font-sans: var(--ds-font-sans);
  --font-mono: var(--ds-font-mono);
  --font-weight-medium: 600;              /* Titillium non ha il 500 */

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);

  --color-brand-navy: var(--brand-navy);
  --color-brand-blue: var(--brand-blue);
  --color-subtle: var(--ds-color-bg-subtle);
  --color-zebra: var(--ds-color-bg-zebra);
  --color-selected: var(--ds-color-bg-selected);
  --color-page: var(--ds-color-bg-page);
  --color-text-muted: var(--ds-color-text-muted);

  --color-health-green-fg: var(--health-green-fg);     --color-health-green-bg: var(--health-green-bg);
  --color-health-amber-fg: var(--health-amber-fg);     --color-health-amber-bg: var(--health-amber-bg);
  --color-health-red-fg: var(--health-red-fg);         --color-health-red-bg: var(--health-red-bg);
  --color-health-neutral-fg: var(--health-neutral-fg); --color-health-neutral-bg: var(--health-neutral-bg);
  --color-sev-low-fg: var(--severity-low-fg);          --color-sev-low-bg: var(--severity-low-bg);
  --color-sev-medium-fg: var(--severity-medium-fg);    --color-sev-medium-bg: var(--severity-medium-bg);
  --color-sev-high-fg: var(--severity-high-fg);        --color-sev-high-bg: var(--severity-high-bg);
  --color-sev-critical-fg: var(--severity-critical-fg); --color-sev-critical-bg: var(--severity-critical-bg);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4); --color-chart-5: var(--chart-5); --color-chart-6: var(--chart-6);
  --color-chart-7: var(--chart-7); --color-chart-8: var(--chart-8);
  --color-demo: var(--demo-banner-bg);

  --radius-sm: var(--ds-radius-sm);
  --radius-md: var(--ds-radius);          /* rounded-md di shadcn = 4px */
  --radius-lg: var(--ds-radius-lg);
  --shadow-sm: var(--ds-shadow-sm);
  --shadow-md: var(--ds-shadow-md);
  --shadow-lg: var(--ds-shadow-lg);
}
```

**`tailwind.config.ts`** (Tailwind v3, oppure v4 tramite `@config`). Con valori hex in variabili i modificatori di opacità (`bg-primary/50`) non funzionano in v3: non usarli, esistono token dedicati.

```ts
import type { Config } from "tailwindcss";

const v = (name: string) => `var(--${name})`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    extend: {
      fontFamily: { sans: [v("ds-font-sans")], mono: [v("ds-font-mono")] },
      fontWeight: { normal: "400", medium: "600", semibold: "600", bold: "700" },
      fontSize: {
        xs: ["0.75rem", "1rem"], sm: ["0.875rem", "1.25rem"], base: ["1rem", "1.5rem"],
        lg: ["1.125rem", "1.75rem"], xl: ["1.25rem", "1.75rem"], "2xl": ["1.5rem", "2rem"],
        "3xl": ["1.875rem", "2.25rem"],
      },
      colors: {
        background: v("background"), foreground: v("foreground"),
        card: { DEFAULT: v("card"), foreground: v("card-foreground") },
        popover: { DEFAULT: v("popover"), foreground: v("popover-foreground") },
        primary: {
          DEFAULT: v("primary"), foreground: v("primary-foreground"),
          50: v("primary-50"), 100: v("primary-100"), 200: v("primary-200"), 300: v("primary-300"),
          400: v("primary-400"), 500: v("primary-500"), 600: v("primary-600"), 700: v("primary-700"),
          800: v("primary-800"), 900: v("primary-900"), 950: v("primary-950"),
        },
        neutral: {
          0: v("neutral-0"), 25: v("neutral-25"), 50: v("neutral-50"), 100: v("neutral-100"),
          200: v("neutral-200"), 300: v("neutral-300"), 400: v("neutral-400"), 500: v("neutral-500"),
          600: v("neutral-600"), 700: v("neutral-700"), 800: v("neutral-800"), 900: v("neutral-900"),
          950: v("neutral-950"),
        },
        secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
        border: v("border"), input: v("input"), ring: v("ring"),
        brand: { navy: v("brand-navy"), blue: v("brand-blue"), tint: v("brand-tint") },
        surface: { page: v("ds-color-bg-page"), subtle: v("ds-color-bg-subtle"), zebra: v("ds-color-bg-zebra"), selected: v("ds-color-bg-selected") },
        health: {
          green: { fg: v("health-green-fg"), bg: v("health-green-bg"), border: v("health-green-border"), solid: v("health-green-solid") },
          amber: { fg: v("health-amber-fg"), bg: v("health-amber-bg"), border: v("health-amber-border"), solid: v("health-amber-solid") },
          red: { fg: v("health-red-fg"), bg: v("health-red-bg"), border: v("health-red-border"), solid: v("health-red-solid") },
          neutral: { fg: v("health-neutral-fg"), bg: v("health-neutral-bg"), border: v("health-neutral-border"), solid: v("health-neutral-solid") },
        },
        severity: {
          low: { fg: v("severity-low-fg"), bg: v("severity-low-bg") },
          medium: { fg: v("severity-medium-fg"), bg: v("severity-medium-bg") },
          high: { fg: v("severity-high-fg"), bg: v("severity-high-bg") },
          critical: { fg: v("severity-critical-fg"), bg: v("severity-critical-bg") },
        },
        chart: {
          1: v("chart-1"), 2: v("chart-2"), 3: v("chart-3"), 4: v("chart-4"),
          5: v("chart-5"), 6: v("chart-6"), 7: v("chart-7"), 8: v("chart-8"),
          baseline: v("chart-baseline-fill"), "baseline-stroke": v("chart-baseline-stroke"),
          availability: v("chart-availability"), overflow: v("chart-overflow"), grid: v("chart-grid"),
        },
        demo: { bg: v("demo-banner-bg"), fg: v("demo-banner-fg"), border: v("demo-banner-border") },
      },
      borderRadius: { none: "0", sm: v("ds-radius-sm"), DEFAULT: v("ds-radius"), md: v("ds-radius"), lg: v("ds-radius-lg"), full: "9999px" },
      boxShadow: { xs: v("ds-shadow-xs"), sm: v("ds-shadow-sm"), md: v("ds-shadow-md"), lg: v("ds-shadow-lg"), focus: v("ds-shadow-focus") },
      height: { banner: v("layout-demo-banner-h"), header: v("layout-header-h"), control: v("control-h-md"), "control-sm": v("control-h-sm") },
      width: { sidebar: v("layout-sidebar-w"), "sidebar-collapsed": v("layout-sidebar-w-collapsed") },
      zIndex: { sticky: "20", header: "30", dropdown: "40", overlay: "50", modal: "60", toast: "70" },
      transitionDuration: { fast: "120ms", base: "200ms" },
    },
  },
} satisfies Config;
```

Per Recharts (che vuole colori come stringhe) esporre un modulo `src/design/chartTokens.ts` che legge i token con `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')` o, più semplicemente, replica i valori hex di `tokens.css` con un test che ne verifica l'allineamento.

---

## 5. Logo, header istituzionale e marcatura DEMO

### 5.1 Logo INAPP

- **Aggiornamento (01/10/2026, indicazione del cliente): il logo ufficiale INAPP si usa** (DEC-081). File: `public/brand/inapp-logo-white.svg`, cioè la versione bianca del sito. Si applicano le regole d'uso qui sotto; il banner DEMO resta sempre visibile. La parte che segue sulla "predisposizione" è superata.
- **Placeholder testuale** (componente `BrandMark`): testo "**Monitoraggio Gare e Contratti**" (Titillium 700, 18px, bianco) con sottotitolo "Prototipo dimostrativo per INAPP" (14px, `--ds-color-text-inverse-muted`). Nessuna sigla dentro forme che imitino il marchio, nessun mosaico colorato.
- **Predisposizione:** variabile `NEXT_PUBLIC_BRAND_LOGO_URL` vuota per default. Il logo ufficiale si attiva solo dopo autorizzazione scritta di INAPP, fornito dall'Istituto (SVG versione **bianca**, come quella in uso nell'header del sito), copiato in `frontend/public/brand/` in quel momento. Regole d'uso: solo su `--brand-navy` o `--brand-blue`; altezza 32–40px nell'header (sul sito ~136px di larghezza); area di rispetto pari almeno all'altezza della lettera "I"; nessuna deformazione, ricolorazione o ombra; `alt="INAPP — Istituto nazionale per l'analisi delle politiche pubbliche"` se il logo è anche link alla dashboard.
- Non usare i loghi di Unione Europea, Ministero del Lavoro, PN Giovani, donne e lavoro o Erasmus+ presenti sul sito.

### 5.2 Header istituzionale e header applicativo

Il sito INAPP ha top bar + header + menu (§1.5). Un gestionale ad alta densità non può spendere 200px in verticale: si usa **un solo header applicativo** di 56px su `--brand-navy`, che riprende la top bar del sito come segnale di identità senza imitarne la struttura. Il collegamento istituzionale (in stile "slim header" di Designers Italia) è solo un link testuale nel menu utente: "Sito istituzionale INAPP" (apre www.inapp.gov.it in una nuova scheda, con icona e testo nascosto "(si apre in una nuova scheda)").

### 5.3 Marcatura dell'ambiente DEMO (obbligatoria)

| Elemento | Specifica |
|---|---|
| **Banner** | Prima fascia della pagina, subito dopo lo skip link, **sempre visibile** (sticky con l'header, non chiudibile). Altezza 32px, sfondo `--demo-banner-bg` con righe diagonali tenui (`repeating-linear-gradient(135deg, #FFD361 0 12px, #FFCB45 12px 24px)`, contrasto del testo verificato sul colore più scuro), bordo inferiore 1px `--demo-banner-border`. Contenuto: icona `FlaskConical` + **"Ambiente DEMO — data di riferimento 01/10/2026"** (testo canonico della guida §4.5, 14px 600) + " · Dati fittizi. Non è un servizio ufficiale INAPP." (14px 400; si può nascondere sotto 1280px, mai il testo canonico). |
| Semantica | `<div role="region" aria-label="Avviso ambiente dimostrativo">`. **Non** `role="alert"`, che verrebbe annunciato a ogni navigazione. La data è letta dalla config/API (`Clock.reference_date()`), mai scritta nel codice. |
| Titolo della scheda | Prefisso `[DEMO]`: "[DEMO] Portafoglio · Monitoraggio Gare e Contratti". |
| Metadati | `<meta name="robots" content="noindex, nofollow">`; favicon generica (lettera "M" su navy), non quella di INAPP. |
| Export e stampe | Piè di pagina "Documento generato in ambiente DEMO il gg/mm/aaaa — dati fittizi" ed eventuale filigrana "DEMO". |
| E-mail (Mailpit) | Oggetto con prefisso `[DEMO]` e piè con la stessa dicitura. |
| Codici | I codici demo (CIG/CUP) restano marcati come tali (es. badge "demo" accanto al CIG nella testata della scheda procedura). |

---

## 6. Componenti

Tutti i componenti partono da shadcn/ui (Radix) e usano solo token semantici. Icone: **lucide-react** (predefinita in shadcn), tratto 1.75–2px, 16px nel testo e nelle tabelle, 20px nei bottoni-icona e nell'header; icone decorative con `aria-hidden="true"`, icone senza testo con nome accessibile (`aria-label` o testo `sr-only`). Font Awesome (usato dal sito) non serve.

### 6.1 Layout applicativo (app shell)

```
[skip link "Salta al contenuto principale"] (visibile al focus)
+------------------------------------------------------------------------------------+
| BANNER DEMO 32px (sticky)                                                          |
+------------------------------------------------------------------------------------+
| HEADER 56px navy (sticky): [=] BrandMark | ricerca globale | data rif. | campanella | utente/ruolo |
+--------------+---------------------------------------------------------------------+
| SIDEBAR      | Breadcrumb                                                          |
| 232px        | H1 titolo pagina                      [azioni di pagina]            |
| (64 compr.)  | ------------------------------------------------------------------  |
|              | contenuto (sfondo --ds-color-bg-page, card bianche)                    |
+--------------+---------------------------------------------------------------------+
```

- **Landmark:** `<header>` (banner + header), `<nav aria-label="Navigazione principale">` (sidebar), `<main id="contenuto">`, `<nav aria-label="Percorso">` (breadcrumb). Nessun footer applicativo; versione e commit nel pannello "Informazioni" del menu utente.
- **Header** (`--ds-color-bg-inverse`, testo bianco, focus giallo `--ds-color-focus-inverse`): a sinistra bottone `PanelLeft` per comprimere la sidebar (`aria-expanded`) e `BrandMark`; al centro **ricerca globale** (procedure per codice o oggetto, 320px, placeholder "Cerca per codice o oggetto", scorciatoia `/`); a destra la **data di riferimento** come testo ("Dati al 01/10/2026"), la campanella degli alert con contatore (`aria-label="Alert: 3 da gestire"`), il menu utente con nome, **ruolo attivo** (badge, es. "Dirigente") e ambito; "Cambia ruolo" solo in demo.
- **Sidebar** (bianca, bordo destro `--ds-color-border`): voci in ordine di uso. *Dashboard*, *Portafoglio*, *Centro alert* (contatore), *Coda di validazione* (contatore), *Contratti e SAL*, *Assistente*; separatore; *Amministrazione* (solo ADMIN). La simulazione di riprogrammazione non è una voce: si avvia dalla scheda procedura. Voce: 36px, icona 20px + etichetta 14px; attiva: sfondo `--ds-color-bg-selected`, testo `--brand-navy` 600, barra sinistra 3px `--brand-blue`, `aria-current="page"`. In modalità compressa: solo icone con tooltip e `aria-label`. Le voci non permesse al ruolo **non si mostrano** (non disabilitate).
- **Breadcrumb:** come sul sito, ma con separatore `ChevronRight` (`aria-hidden`), ultima voce `aria-current="page"` non cliccabile. Esempio: "Portafoglio › P-002 Supporto metodologico e project management".
- **Titolo di pagina:** h1 24px 700 navy; sotto, riga di metadati muted (es. "Ultimo aggiornamento 01/10/2026 alle 08:00 · Fonte: run_checks").

### 6.2 Bottoni

| Variante | Stile | Uso |
|---|---|---|
| Primario | sfondo `#0059B3`, testo bianco 600, hover `#004A94`, active `#003567`, raggio 4px | **Una** azione principale per vista ("Invia ad approvazione") |
| Secondario | bianco, bordo 1px `#0059B3`, testo navy 600 | Azioni alternative ("Salva bozza", "Esporta") |
| Ghost | trasparente, testo navy, hover `--ds-color-bg-subtle` | Toolbar, azioni di riga |
| Danger | sfondo `#B3261E`, testo bianco | "Rifiuta proposta", "Annulla procedura" (sempre con modale) |
| Link | testo `--ds-color-link` sottolineato | Navigazione inline |

Altezze 32/36/44px; icona a sinistra 16px; etichette in *sentence case* (il sito usa il maiuscolo nel bottone di ricerca: non replicarlo). Stato di caricamento: spinner + testo ("Salvataggio in corso…"), `aria-busy="true"`, bottone disabilitato per evitare doppi invii (con `Idempotency-Key` lato API). Disabilitato: `--neutral-100` / testo `--neutral-500` e, quando possibile, motivo nel tooltip o nel testo ("Serve il ruolo Dirigente").

### 6.3 Tabelle dense (portafoglio, alert, SAL, audit)

- **TanStack Table** con ordinamento, paginazione e filtri **lato server** (`page`/`size`, massimo 100). Elemento `<table>` reale con `<caption>` (anche `sr-only`: "Portafoglio procedure, 12 risultati, ordinati per health"), `<th scope="col">`, `aria-sort` sulle colonne ordinabili; il bottone di ordinamento è dentro il `<th>`.
- **Stile:** card bianca con bordo 1px; intestazione `--ds-color-bg-muted` 14px 600 *sentence case*, sticky (`top` = banner + header), ombra `--ds-shadow-sm` quando la pagina scorre; righe 32px (compatta, default nel portafoglio) o 40px; separatori orizzontali `--ds-color-border`; zebra opzionale `--ds-color-bg-zebra` (attivabile dall'utente); hover `--ds-color-bg-subtle`; selezionata `--ds-color-bg-selected` + checkbox.
- **Allineamenti:** testo a sinistra; **importi e numeri a destra** (`.num`, cifre tabulari); date centrate o a sinistra in formato `gg/mm/aaaa`; badge a sinistra. Codici in `font-mono` 13–14px.
- **Colonne del portafoglio** (in ordine): selezione · Codice (link alla scheda, mono) · Oggetto (troncato a 2 righe con `title` e tooltip) · Struttura · Tipologia · Fase (chip neutro) · **Health** (badge) · Prossima scadenza (data + "tra 5 giorni"/"scaduta da 5 giorni") · Importo programmato · Pagato · Importo a rischio · Owner. Visibilità delle colonne configurabile; la prima colonna (Codice) resta fissa nello scroll orizzontale.
- **Riga cliccabile:** l'intera riga non è un link; il link è sul codice (evita bersagli enormi e conflitti con la selezione). Le azioni di riga stanno nel menu `MoreHorizontal` con `aria-label="Azioni per P-002"`.
- **Totali:** riga `<tfoot>` 600 con "Totale (12 procedure)" e somme; il totale dichiara il perimetro ("esclusi gli importi delle procedure annullate").
- **Paginazione:** "1–25 di 112" + scelta righe per pagina (25/50/100) + precedente/successiva; `aria-label` sui bottoni.
- **Export:** bottone secondario "Esporta XLSX" che esporta **i filtri correnti** e lo dichiara ("Esporta 12 righe filtrate").

### 6.4 Filtri

- **Barra filtri** su `--ds-color-bg-subtle` sopra la tabella, in una riga a 1366px: ricerca testuale (debounce 300ms) + select multiple *Struttura, Annualità, Tipologia, Fase, Health* + "Altri filtri" (popover). Ogni controllo ha `<label>` visibile o `aria-label` esplicito.
- **Filtri attivi** come chip (`radius-full`, `--ds-color-bg-selected`, testo navy) sotto la barra: "Health: Rosso ×", con bottone di rimozione `aria-label="Rimuovi filtro Health: Rosso"`; link "Azzera filtri".
- **Stato nell'URL** (query string con codici, es. `?health=RED&year=2027`), così le KPI della dashboard aprono il portafoglio filtrato e il tasto Indietro funziona. Nei parametri non vanno mai dati personali.
- Il conteggio dei risultati si annuncia con una live region `aria-live="polite"` ("12 procedure trovate").
- I filtri globali della dashboard (struttura, annualità, tipologia, fase, health) usano gli stessi componenti e lo stesso vocabolario.

### 6.5 Badge di stato

Anatomia: `inline-flex`, altezza 22px (20px compatto), padding 2px 8px, raggio 4px, bordo 1px `border`, icona 14px + testo 13–14px 600. **Testo sempre presente**; in spazi molto stretti (Gantt) si può mostrare solo l'icona, con `aria-label` e tooltip contenenti il testo.

```tsx
<HealthBadge value="RED" drivers={[...]} />
// rende: <span class="badge badge-red"><OctagonAlert aria-hidden /> Rosso</span>
// + tooltip/popover "Perché Rosso" con l'elenco dei health_drivers (regola, bersaglio, data)
```

**Health:** vedi §4.3. Il badge è un bottone (popover "Perché è Rosso") solo dove ci sono i `health_drivers`; altrimenti è testo statico.

**Fase della procedura** (neutra, per non competere con health): chip `--ds-color-bg-muted`, testo `--neutral-800`, icona di fase opzionale. Etichette canoniche dalla guida §5.1: Bozza, Memoria attesa, Istruttoria, Gara, Aggiudicata, Stipula, Esecuzione, Chiusura, Chiusa, Annullata (con icona `Ban`; niente testo barrato, che riduce la leggibilità).

**Milestone** (guida §5.2; etichette proposte da inserire nel dizionario UI, DEC-001):

| Codice | Etichetta | Tono | Icona |
|---|---|---|---|
| `NOT_STARTED` | Non avviata | neutro | `Circle` |
| `UPCOMING` | Prevista | neutro | `CalendarDays` |
| `DUE_SOON` | In scadenza | ambra | `CalendarClock` |
| `DUE_TODAY` | Scade oggi | ambra (600) | `Clock` |
| `OVERDUE` | Scaduta | rosso | `CalendarX` |
| `COMPLETED` | Completata | verde | `CircleCheck` |
| `SUSPENDED` | Sospesa | neutro | `CirclePause` |
| `NOT_APPLICABLE` | Non applicabile | neutro | `CircleSlash` |
| `CANCELLED` | Annullata | neutro | `Ban` |
| flag `blocked` | + "Bloccata" | rosso se bloccante | `Lock` + motivazione nel tooltip |

**SAL** (guida §5.3): Pianificato, Presentato, In verifica, Accettato, Fatturato, Liquidato, Pagato parzialmente, Pagato (verde), Respinto (rosso), Sospeso (neutro); flag `overdue` → badge aggiuntivo "Scaduto" rosso. **Pagamenti:** Bozza, Programmato, Eseguito, Riconciliato (verde), Stornato (neutro con icona `Undo2`).

**Alert:** severità §4.4; stato Aperto (`CircleDot`), Preso in carico (`UserCheck`), Risolto (`CircleCheck`), Sospeso (`CirclePause`), Chiuso automaticamente (`CircleCheckBig`, neutro). **Simulazione:** Bozza, Inviata, Approvata (verde), Respinta (rosso), Superata (neutro), Non aggiornata (ambra, `RefreshCcw`). **Criticità:** Bloccante (rosso, `OctagonAlert`), Avvertenza (ambra). **Validazione dato:** Proposto, Validato (verde), In conflitto (ambra), Mancante (rosso, mostra "n.d.").

### 6.6 KPI card

```
+--------------------------------------+
| Procedure in ritardo          (i)    |  <- etichetta 14px muted + tooltip con la definizione
| 4                                    |  <- valore 30px 600, cifre tabulari
| su 12 · al 01/10/2026                |  <- unità/periodo 12–14px muted (sempre)
| [OctagonAlert] 2 con alert critici   |  <- riga di contesto opzionale (testo + icona)
+--------------------------------------+
```

- Card bianca, bordo 1px, raggio 4px, padding 16px, altezza minima 112px; 4 card per riga a 1366px (2 righe: conteggi e importi).
- **Tutta la card è un link** al portafoglio filtrato, con nome accessibile completo: "Procedure in ritardo: 4 su 12 al 01/10/2026. Apri il portafoglio filtrato". Focus sull'intera card.
- KPI previsti (guida §8.6): Procedure totali, In ritardo, Da riprogrammare, Alert critici, Programmato, Contrattualizzato, Pagato, **Importo a rischio** con due righe separate "Non coperto" e "In slittamento" (DEC-051).
- Importi: valore abbreviato nella card ("1,3 Mln €"), importo completo nel tooltip e nel nome accessibile ("1.250.000,00 €"). Dato assente: "n.d." con motivo nel tooltip, mai "0".
- Nessuna freccia di tendenza senza periodo di confronto; colore di stato solo se il KPI è uno stato (es. Alert critici > 0 → icona rossa + testo).

### 6.7 Grafici (Recharts)

- **Forme:** *Baseline vs previsione per annualità* → barre raggruppate per anno (2026, 2027, 2028) con serie Baseline / Previsione approvata / Pagato e, nel wizard, Simulazione; la **Disponibilità** è un gradino tratteggiato sovrapposto; l'eccedenza è evidenziata con contorno ed etichetta diretta. *Riparto della spesa per struttura* → barre orizzontali ordinate per valore, un solo colore (slot 1), niente torte con più di 5 fette. *Stato SAL/pagamenti* → barra impilata orizzontale 100% con etichette dirette o tabella.
- **Marcatori:** barre con spazio di 2px tra serie, estremità con raggio 2px solo sul lato del valore, linee 2px, marcatori ≥ 8px; griglia orizzontale `--chart-grid`, nessuna griglia verticale; assi 12px `--chart-axis`.
- **Assi e unità:** titolo dell'asse "Importi in migliaia di €" e tick "0", "200", "400" (it-IT, senza decimali); in alternativa tick completi "200.000 €". Mai assi senza unità. Mai doppio asse y.
- **Legenda** sempre presente con ≥ 2 serie, in alto a sinistra, con campione che riproduce il tratteggio; con ≤ 4 serie anche etichette dirette sui valori chiave (non su ogni barra).
- **Tooltip** al passaggio del mouse **e al focus da tastiera** (ogni gruppo/annualità focalizzabile): "2027 — Previsione approvata 430.000,00 € · Disponibilità 350.000,00 € · Eccedenza 80.000,00 €".
- **Alternativa testuale obbligatoria:** toggle "Grafico | Tabella" sopra ogni grafico; la tabella ha gli stessi dati e la stessa intestazione. Il contenitore SVG ha `role="img"` e `aria-label` con il messaggio principale ("Nel 2027 la previsione supera la disponibilità di 80.000 €"), più link alla tabella.
- **Pattern SVG** da definire una volta (`<defs>`): `hatch-45` (baseline), `hatch-135` (simulazione), `hatch-overflow`; con `forced-colors: active` i pattern restano visibili (usare `stroke` e non solo `fill`).

### 6.8 Timeline / Gantt delle milestone (tab Cronoprogramma)

- **Layout:** a sinistra una griglia (240–320px) con Milestone, Owner (ruolo@ambito), Stato (badge); a destra la scala temporale (mesi, con zoom Mese/Trimestre/Anno), sincronizzate in verticale. Righe 32px.
- **Barre e marcatori:** baseline = barra sottile 4px `--chart-baseline-stroke` sotto la riga; previsione approvata = barra 12px `--primary-600` (milestone puntuali = rombo 12px); effettivo = rombo pieno `--health-green-solid` con `CircleCheck`; simulazione = barra tratteggiata `--chart-2`. Scostamento indicato a destra della barra con testo: "+45 gg" (`abbr title="giorni"`), rosso se oltre la data bloccante.
- **Stati:** milestone scaduta = barra con bordo 2px `--health-red-solid` + icona `CalendarX` + testo nel tooltip; bloccata = icona `Lock`; dipendenze = connettori a gomito 1px `--neutral-500` con freccia.
- **Riferimenti:** linea verticale 2px tratteggiata `--chart-today` con etichetta "01/10/2026 — data di riferimento"; weekend e festività (calendario `config/calendar.yaml`) con fondo `--neutral-50`; date bloccate (vincoli) con fondo a righe e legenda.
- **Accessibilità:** il Gantt è una rappresentazione visiva; **la griglia a sinistra, o una vista "Elenco" alternativa, è la fonte accessibile** (tabella con Milestone, Baseline, Previsione, Effettivo, Scostamento, Stato, Evidenze). Ogni barra è focalizzabile solo in modalità "esplora" (frecce su/giù per riga), con tooltip al focus.

### 6.9 Stepper del wizard di riprogrammazione (5 step)

```
 (1) Causa ──── (2) Cronoprogramma ──── (3) Finanza ──── (4) Alternative ──── (5) Decisione
  [check]          [corrente: navy]        [da fare]         [da fare]           [da fare]
```

- Elenco ordinato `<ol aria-label="Passaggi della riprogrammazione">`; il passo corrente ha `aria-current="step"`; ogni passo ha numero + etichetta + stato testuale `sr-only` ("completato", "da correggere").
- **Stati:** completato = cerchio `--primary-600` con `Check` bianco; corrente = cerchio navy pieno con numero bianco, etichetta 600; da fare = cerchio con bordo `--neutral-500`, etichetta muted; con errori = icona `CircleAlert` `--feedback-error-text` + testo "Da correggere". Connettore 2px (`--primary-600` se completato, altrimenti `--neutral-300`).
- Si torna ai passi completati cliccando; ai passi futuri solo con "Avanti" (che valida il passo).
- **Barra azioni sticky** in basso: a sinistra "Indietro" (ghost), "Salva bozza" (secondario); a destra "Avanti" (primario); al passo 5 "Invia ad approvazione" oppure, per chi approva, "Approva" / "Rifiuta" (danger) con motivazione obbligatoria. Il riepilogo del passo 5 mostra le differenze baseline/forecast/simulazione, le criticità (Bloccante/Avvertenza) e l'eventuale override (solo Dirigente, con motivazione).
- Su 1366×768 lo stepper occupa una riga di 56px; il contenuto del passo è a due colonne (form a sinistra 60%, anteprima dell'impatto a destra 40%).
- Se la simulazione diventa `STALE` (409 `STALE_SIMULATION`): avviso ambra in testa "La procedura è cambiata dopo la creazione di questa simulazione. Ricalcola prima di inviarla." + bottone "Ricalcola".

### 6.10 Form ed errori

- **Etichetta sopra il campo** (14px 600), testo d'aiuto sotto l'etichetta o sotto il campo (14px muted) collegato con `aria-describedby`. Campi obbligatori: "(obbligatorio)" nel testo dell'etichetta; non basta l'asterisco. In alternativa, se quasi tutti sono obbligatori, si marcano i facoltativi con "(facoltativo)".
- **Input:** altezza 36px, bordo 1px `--ds-color-border-input`, raggio 4px, testo 16px (evita lo zoom su mobile), focus = bordo `--primary-600` + anello `--ds-shadow-focus`. Larghezza proporzionata al contenuto atteso (data 160px, importo 200px).
- **Importi:** allineati a destra, suffisso "€" fuori dal campo, accettano "1.234,56" e "1234,56", si riformattano al blur; `inputmode="decimal"`. **Date:** campo testo `gg/mm/aaaa` + bottone calendario (date picker di shadcn in italiano, settimana da lunedì, festività evidenziate); valore inviato in ISO.
- **Validazione:** React Hook Form + Zod, al submit e poi al blur dei campi già toccati; mai mentre l'utente scrive.
- **Errore di campo:** bordo 2px `--feedback-error-text`, icona `CircleAlert` + messaggio sotto il campo (14px, `#B3261E`), `aria-invalid="true"`, messaggio collegato con `aria-describedby`.
- **Riepilogo errori** in testa al form al submit fallito: box `--feedback-error-bg` con titolo "Correggi 2 errori per continuare", elenco di link ai campi; il focus si sposta sul riepilogo (`tabIndex=-1`).
- **Errori API** (envelope §10.2) mappati per codice in messaggi umani (§8.4); i `details` di `FINANCIAL_INVARIANT_VIOLATION` diventano testo: "Puoi pagare al massimo 12.000,00 € su questo SAL (liquidato non ancora pagato)."
- **Motivazioni** (rifiuto, override, risoluzione manuale): `textarea` con contatore "minimo 20 caratteri" e con testo d'aiuto che spiega dove sarà registrata ("Comparirà nell'audit").
- **Modifiche non salvate:** avviso alla navigazione ("Hai modifiche non salvate. Vuoi uscire senza salvare?").

### 6.11 Toast

- Solo per **conferme non bloccanti** di azioni appena eseguite ("Bozza salvata", "Alert preso in carico"). Mai per errori che richiedono un'azione (si usa l'alert inline) né per contenuti che l'utente deve poter rileggere.
- Posizione in basso a destra, larghezza 360px, massimo 3 impilati; sfondo bianco, bordo sinistro 4px del colore di feedback, icona + titolo 14px 600 + testo facoltativo + azione facoltativa ("Annulla", "Apri").
- Durata minima 6 secondi, **in pausa con hover e focus**, chiudibile (`aria-label="Chiudi notifica"`); annuncio con `role="status"` (`aria-live="polite"`). Il focus non viene spostato sul toast.

### 6.12 Modali di conferma

- Per azioni irreversibili o con effetti rilevanti: approvare/rifiutare una riprogrammazione, annullare una procedura, registrare un pagamento, risolvere manualmente un alert, reset della demo.
- **Titolo come domanda con verbo specifico** (DI: "Vuoi + verbo"): "Vuoi approvare la riprogrammazione di P-002?". Corpo: conseguenze concrete e irreversibilità ("La nuova previsione sostituirà quella approvata. La baseline non cambia. L'operazione è registrata nell'audit."). Campo motivazione se richiesto.
- **Bottoni:** azione con lo stesso verbo del titolo ("Approva riprogrammazione"; danger per "Annulla procedura") e "Torna indietro" (secondario) al posto di un ambiguo "Annulla" quando l'azione stessa è un annullamento.
- `AlertDialog` di Radix: focus intrappolato, focus iniziale sul bottone **meno distruttivo**, `Esc` chiude, il focus torna all'elemento che ha aperto il modale, sfondo `rgba(14,18,22,.5)`, raggio 8px, `--ds-shadow-lg`, larghezza 480–560px.
- Per il reset della demo: digitazione di conferma ("Scrivi RESET per confermare").

### 6.13 Stati vuoti, caricamento, parziali ed errori (spec §9.5)

| Stato | Rappresentazione | Esempio di testo |
|---|---|---|
| Caricamento iniziale | Skeleton con la forma del contenuto (righe di tabella, card), senza lampeggio; `aria-busy="true"` sul contenitore; dopo 10 s messaggio "Il caricamento richiede più tempo del previsto…" | — |
| Aggiornamento | Contenuto precedente visibile + barra di avanzamento sottile in alto; nessuno spostamento del layout | "Aggiornamento in corso" (sr-only) |
| Vuoto (nessun dato) | Icona 32px muted + titolo + spiegazione + azione | "Nessun alert da gestire. Quando una scadenza si avvicina, la trovi qui." |
| Vuoto (filtri) | Come sopra, con azione "Azzera filtri" | "Nessuna procedura corrisponde ai filtri selezionati." |
| Parziale | Banner ambra sopra la sezione + dati disponibili + "n.d." dove manca | "Alcuni dati finanziari non sono disponibili: il calcolo del residuo è parziale." |
| Errore | Box errore con cosa è successo, cosa fare, bottone "Riprova" e correlation ID copiabile (mono) | "Non è stato possibile caricare il portafoglio. Riprova tra qualche istante. Codice di supporto: 7f3a…" |
| Permesso negato (403) | Pagina/sezione con icona `Lock` | "Non hai i permessi per vedere questa procedura. Contatta l'amministratore se pensi che sia un errore." |
| Non trovato (404) | Pagina con link alla dashboard | "La procedura P-099 non esiste o è stata rimossa." |

### 6.14 Viewer documenti (tab Documenti, coda di validazione)

- **Vista divisa:** elenco del fascicolo (sinistra 280px: nome, classificazione, stato di elaborazione, data) · anteprima (centro) · pannello **campi estratti** (destra 360px).
- **Anteprima:** pagine renderizzate (PDF.js o immagini generate dal backend con PyMuPDF), barra con pagina "3 di 12", zoom (adatta larghezza / 100% / +/−), scaricamento del file originale; scorciatoie `PgSu`/`PgGiù`.
- **Campi estratti:** per ogni campo etichetta, valore proposto, stato di validazione (badge), **fonte** ("Pagina 3, estratto: '…importo complessivo di € 480.000,00…'") con link "Mostra nel documento" che porta alla pagina ed evidenzia la porzione (riquadro 2px `--primary-600` + fondo `--primary-100` al 40%). Azioni: "Conferma", "Correggi", "Rifiuta".
- **Stati di elaborazione:** In coda (neutro, `Clock`), In elaborazione (`Loader`, con `aria-live`), Completata (verde), Errore OCR (rosso, con "Riprova elaborazione"), Testo non leggibile (ambra).
- **Accessibilità:** sempre disponibile la vista "Testo estratto" come alternativa all'immagine della pagina; i comandi del viewer sono bottoni con nome accessibile; il documento non si apre in automatico in una nuova scheda.

### 6.15 Scheda procedura e tab

- **Testata** (card fissa sopra le tab): codice demo (mono) + oggetto (h1), riga di metadati (CIG/CUP demo con badge "demo", struttura, owner, tipologia), a destra **badge di fase e health** e importo programmato grande; sotto, "Prossima scadenza: Memoria — 06/10/2026 (tra 5 giorni)" e "Perché è Ambra" se ci sono driver.
- **Tab** (Radix Tabs, `role="tablist"`, frecce per spostarsi): Panoramica · Cronoprogramma · Documenti · Finanza · Alert (contatore) · Simulazioni · Audit. La tab attiva è nell'URL (`?tab=finanza`). Contatori con testo accessibile ("Alert, 2 aperti").
- **Panoramica:** tre colonne baseline / previsione / effettivo per date e importi; "Problemi aperti" con severità; "Azioni consentite" in base al ruolo (le azioni non consentite non compaiono; se utile, spiegazione "Per approvare serve il ruolo Dirigente o Validatore").
- **Audit:** tabella con data e ora, autore, evento, prima → dopo (diff con `del`/`ins`, non solo colore), motivazione, correlation ID (mono, copiabile).

### 6.16 Assistente conversazionale

- Pannello a pagina intera (o drawer destro 480px dalla scheda procedura). Messaggi dell'utente allineati a destra su `--ds-color-bg-selected`; risposte a sinistra su bianco, testo 16px.
- **Ogni risposta mostra le fonti** come elenco numerato di link (procedura, documento e pagina, regola); niente risposta senza fonti: in quel caso "Non ho trovato informazioni sufficienti nei dati disponibili."
- Etichetta permanente sotto il campo: "Le risposte sono generate automaticamente: verifica sempre le fonti." Area messaggi con `aria-live="polite"`; durante la generazione "L'assistente sta scrivendo…".

---

## 7. Formati it-IT

Un unico modulo `src/lib/format.ts`; vietato formattare a mano nei componenti. Le API usano ISO e importi come stringhe decimali (guida §4.5); la conversione avviene solo nella UI. Verifiche fatte con Node 22 (ICU):

| Dato | Regola | Implementazione | Esempio |
|---|---|---|---|
| Importo | Euro, 2 decimali, punto per le migliaia, virgola per i decimali, simbolo dopo con spazio indivisibile | `new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' })` | `120.000,00 €` |
| Importo < 10.000 | **Attenzione:** di default it-IT **non** raggruppa le cifre sotto 10.000 (`1234,50 €`); usare `useGrouping: 'always'` per coerenza nelle colonne | come sopra | `1.234,50 €` |
| Negativo | Segno meno davanti | come sopra | `-80.000,50 €` |
| Differenza | Segno esplicito | `signDisplay: 'exceptZero'` | `+80.000,00 €` |
| Importo KPI abbreviato | Solo dove lo spazio lo impone, con valore completo nel tooltip e nel nome accessibile. `notation: 'compact'` in it-IT abbrevia solo da 1 milione ("Mln"), mentre sotto restituisce `480.000,0 €`: usare una funzione propria | `≥ 1e6 → "1,3 Mln €"`, sotto → intero senza decimali `"480.000 €"` | `1,3 Mln €` |
| Assi dei grafici | In migliaia, interi, unità nel titolo dell'asse | `Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 })` su valore/1000 | `430` (titolo: "migliaia di €") |
| Percentuale | Virgola decimale, nessuno spazio | `{ style: 'percent', maximumFractionDigits: 1 }` | `12,5%` |
| Numero intero | Separatore delle migliaia sempre | `{ useGrouping: 'always' }` | `1.000 procedure` |
| Data | `gg/mm/aaaa`, fuso `Europe/Rome` | `Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' })` | `01/10/2026` |
| Data e ora (audit) | `gg/mm/aaaa, hh:mm` (24 ore) | `+ hour: '2-digit', minute: '2-digit'` | `01/10/2026, 14:00` |
| Data estesa | Titoli, banner, e-mail | `{ dateStyle: 'full' }` | `giovedì 1 ottobre 2026` |
| Data relativa | Sempre **insieme** alla data assoluta | `Intl.RelativeTimeFormat('it-IT', { numeric: 'auto' })` | `06/10/2026 (tra 5 giorni)`, `ieri` |
| Scostamento | "gg" solo in tabelle e Gantt, con `abbr` | — | `+45 gg` → "45 giorni di ritardo" per gli screen reader |
| Annualità | Anno a 4 cifre senza separatore | `String(year)` | `2027` |
| Mesi | Minuscoli | `{ month: 'long' }` | `ottobre 2026` |
| Dato mancante | "n.d." con motivo nel tooltip (`reason` dell'API); mai `0`, `-` o vuoto | — | `n.d.` |
| Codici | Mono, senza formattazione numerica | `font-mono` | `P-002`, `CIG 9A1B2C3D4E (demo)` |

Gli importi della demo sono **lordi IVA inclusa** (DEC-032): dove compaiono netto e IVA, intestare le colonne "Imponibile", "IVA (22%)", "Totale lordo".

---

## 8. Tono di voce e microcopy

### 8.1 Principi [P] (da Designers Italia, adattati a un gestionale interno)

1. **Chiaro e preciso.** Parole del dominio (procedura, memoria, SAL, liquidazione, riprogrammazione) usate sempre allo stesso modo; niente sinonimi creativi.
2. **Diretto, senza burocratese.** Frasi brevi, forma attiva, verbo in testa: "Carica la memoria", non "Si procede al caricamento della memoria".
3. **"Tu" sobrio**, come raccomanda Designers Italia ("Hai 2 alert da gestire"); dove possibile frasi senza pronome ("2 alert da gestire"). *DA VALIDARE con INAPP:* se l'Istituto preferisse una forma impersonale, si cambia nel dizionario UI (DEC-001) senza toccare i componenti.
4. **Spiegare causa e rimedio**, mai colpevolizzare: "La data proposta cade dopo la scadenza del contratto (30/06/2027). Scegli una data entro il 30/06/2027."
5. **Numeri con unità e periodo**: "4 procedure in ritardo al 01/10/2026", non "4 in ritardo".
6. **Onestà sulla demo e sull'automazione**: dire quando un valore è calcolato, proposto, simulato o estratto da un documento ("Valore proposto dall'estrazione automatica: da validare").
7. **Coerenza ortografica**: "INAPP" sempre maiuscolo (il sito alterna "Inapp"); *sentence case* in titoli, bottoni e intestazioni; niente punto finale nelle etichette e nei bottoni, sì nei messaggi composti da frasi; virgolette basse « » o alte " " in modo uniforme (scegliere " ").

### 8.2 Glossario d'interfaccia (estratto)

| Usa | Non usare | Note |
|---|---|---|
| Procedura | Pratica, gara (per l'entità) | "Gara" è solo la fase |
| Baseline | Piano originale, base | Termine della specifica; tooltip: "Valori approvati all'avvio; non cambiano." |
| Previsione | Forecast, stima | Si intende la previsione **approvata** |
| Effettivo | Actual, reale | Date e importi realmente registrati |
| Simulazione | Bozza di riprogrammazione | Non approvata fino alla decisione |
| Riprogrammazione | Ripianificazione, rischedulazione | — |
| Health / Stato di salute | Semaforo, RAG | In colonna "Health"; nei testi "stato di salute". *DA VALIDARE* |
| Importo a rischio | Esposizione | Sempre scomposto: non coperto + in slittamento |
| Prendi in carico | Acknowledge, accetta | Azione sugli alert |
| Data di riferimento | Oggi, data odierna | La data di business della demo |

### 8.3 Esempi di microcopy

| Contesto | Testo |
|---|---|
| Accesso demo | Titolo "Accedi all'ambiente dimostrativo"; testo "Scegli un profilo demo. I dati sono fittizi."; bottone "Accedi come Dirigente" |
| Bottoni | "Invia ad approvazione", "Approva riprogrammazione", "Rifiuta proposta", "Prendi in carico", "Registra pagamento", "Esporta XLSX", "Salva bozza" (mai "OK", "Conferma" generico, "Procedi") |
| Placeholder | "Cerca per codice o oggetto" (mai istruzioni importanti solo nel placeholder) |
| Select | "Seleziona una struttura" |
| Testo d'aiuto | "La data deve essere un giorno lavorativo. Le festività sono escluse." |
| Errore campo | "Inserisci una data nel formato gg/mm/aaaa, per esempio 15/10/2026." |
| Errore importo | "L'importo supera il liquidato disponibile: puoi pagare al massimo 12.000,00 €." |
| Quattro occhi | "Non puoi approvare una proposta che hai creato tu. Serve un altro Dirigente o un Validatore." |
| Criticità bloccante | "Questa simulazione ha 1 criticità bloccante: nel 2027 la previsione supera la disponibilità di 80.000,00 €. Per inviarla serve un override motivato del Dirigente." |
| Health driver | "Rosso perché la consegna della memoria è scaduta il 26/09/2026 (5 giorni fa)." |
| Successo | Toast "Riprogrammazione approvata" + "La nuova previsione è attiva. Gli alert sono stati ricalcolati." |
| Stato vuoto | "Nessun elemento da validare. Le proposte di associazione e i campi estratti compaiono qui." |
| Errore generico | "Non è stato possibile salvare le modifiche. Riprova; se il problema continua, comunica il codice di supporto 7f3a…" |
| Conferma | Titolo "Vuoi annullare la procedura P-011?"; testo "Le prenotazioni non impegnate saranno rilasciate. L'operazione non si può annullare."; bottoni "Annulla procedura" / "Torna indietro" |
| Simulazione non aggiornata | "La procedura è cambiata dopo la creazione di questa simulazione. Ricalcola prima di inviarla." |
| Assistente | "Le risposte sono generate automaticamente: verifica sempre le fonti." |

### 8.4 Messaggi per i codici d'errore API (guida §4.5)

| Codice | Messaggio |
|---|---|
| `UNAUTHENTICATED` | "La sessione è scaduta. Accedi di nuovo per continuare." |
| `FORBIDDEN` | "Non hai i permessi per questa operazione." + ruolo richiesto, se noto |
| `NOT_FOUND` | "L'elemento richiesto non esiste o è stato rimosso." |
| `VALIDATION_ERROR` | Errori sui singoli campi + riepilogo |
| `FINANCIAL_INVARIANT_VIOLATION` | "L'operazione renderebbe incoerenti gli importi: {dettaglio con disponibile e richiesto}." |
| `INVALID_TRANSITION` | "Questa azione non è possibile nello stato attuale ({stato})." |
| `STALE_SIMULATION` | "La procedura è cambiata dopo la simulazione. Ricalcola prima di continuare." |
| `BLOCKING_CRITICALITY_REQUIRES_OVERRIDE` | "Ci sono criticità bloccanti: serve un override motivato del Dirigente." |
| `FOUR_EYES_VIOLATION` | "Chi crea la proposta non può approvarla." |
| `IDEMPOTENCY_CONFLICT` | "Questa operazione è già stata registrata. Aggiorna la pagina per vedere lo stato attuale." |
| `UPLOAD_REJECTED` | "Il file non è stato accettato: {motivo, es. formato non ammesso o dimensione oltre 20 MB}." |

---

## 9. Checklist di accessibilità

Obiettivo **WCAG 2.1 AA** (DEC-080), con riferimento a EN 301 549 e alle linee guida AgID. Da verificare per ogni pagina principale (axe-core senza violazioni *serious/critical*, più verifica manuale).

**Percepibile**
- [ ] Contrasto testo ≥ 4.5:1 e componenti/grafica ≥ 3:1: solo coppie presenti nella tabella §4.9 (1.4.3, 1.4.11).
- [ ] Nessuna informazione affidata al solo colore: health, severità, stati, serie dei grafici e diff dell'audit hanno testo, icona, pattern o simboli (1.4.1).
- [ ] Ogni grafico ha la vista tabellare equivalente e un `aria-label` con il messaggio principale (1.1.1).
- [ ] Icone decorative `aria-hidden`; icone-bottone con nome accessibile (1.1.1, 4.1.2).
- [ ] Tabelle con `<caption>`, `<th scope>`, `aria-sort`; nessuna tabella usata per l'impaginazione (1.3.1).
- [ ] Etichette visibili e collegate a ogni campo; `autocomplete` sui campi di accesso (1.3.1, 1.3.5).
- [ ] Testo ridimensionabile al 200% senza perdita; reflow a 320px CSS, tranne lo scroll interno delle tabelle (1.4.4, 1.4.10).
- [ ] Spaziatura del testo modificabile senza tagli: nessuna altezza fissa su contenitori di testo (1.4.12).
- [ ] Tooltip e popover chiudibili con `Esc`, persistenti al passaggio del mouse, attivabili anche al focus (1.4.13).
- [ ] `lang="it"` sul documento; `lang="en"` sui termini inglesi lunghi, se presenti (3.1.1, 3.1.2).

**Utilizzabile**
- [ ] Tutto raggiungibile e operabile da tastiera, senza trappole (tranne il focus nei modali, che si chiude con `Esc`) (2.1.1, 2.1.2).
- [ ] Skip link "Salta al contenuto principale" come primo elemento focalizzabile (2.4.1).
- [ ] Titolo di pagina unico e descrittivo con prefisso `[DEMO]` (2.4.2).
- [ ] Ordine del focus coerente con l'ordine visivo; dopo l'apertura di un modale il focus va al modale e alla chiusura torna al punto di partenza (2.4.3).
- [ ] Testo dei link comprensibile fuori contesto ("Apri P-002", non "clicca qui") (2.4.4).
- [ ] Focus sempre visibile: anello 2px `--ds-color-focus` con offset 2px, giallo su navy; mai `outline: none` senza alternativa (2.4.7).
- [ ] Scorciatoie da un solo carattere (es. `/` per la ricerca) disattivabili o attive solo con il focus nel contesto giusto (2.1.4).
- [ ] Nessun timeout di sessione senza avviso e possibilità di estensione (2.2.1).
- [ ] Bersagli cliccabili ≥ 24×24px (buona pratica WCAG 2.2).

**Comprensibile**
- [ ] Navigazione e terminologia coerenti in tutte le schermate (3.2.3, 3.2.4).
- [ ] Nessun cambio di contesto automatico alla selezione di un filtro, salvo aggiornamento dei risultati annunciato (3.2.2).
- [ ] Errori identificati in testo, con suggerimento di correzione e riepilogo (3.3.1, 3.3.3).
- [ ] Conferma, revisione o annullamento per operazioni con effetti finanziari o irreversibili (3.3.4).
- [ ] Istruzioni di formato visibili per date e importi (3.3.2).

**Robusto**
- [ ] Componenti Radix con ruoli e stati ARIA corretti (tab, dialog, menu, combobox, tooltip) (4.1.2).
- [ ] Messaggi di stato annunciati senza spostare il focus: risultati dei filtri, toast (`role="status"`), salvataggi, "L'assistente sta scrivendo…" (4.1.3).
- [ ] Banner DEMO come regione con etichetta, non live region.

**Verifiche manuali minime prima della demo:** navigazione completa con sola tastiera del percorso demo (spec §13.3); NVDA + Firefox o Chrome su dashboard, portafoglio, wizard; zoom al 200% a 1366×768; Windows "Contrasto elevato" (`forced-colors`); simulazione di daltonismo (DevTools › Rendering › Emulate vision deficiencies) su dashboard e Gantt.

---

## 10. Wireframe testuali

Larghezza di riferimento 1366px. Le proporzioni sono indicative. Codici e scenari vengono dal seed (spec §7.2), ma **i numeri delle KPI sono illustrativi**: i valori attesi sono quelli dell'oracle (guida §10.6).

### 10.1 Dashboard direzionale (UI-02)

```
+------------------------------------------------------------------------------------------------------+
| [fiala] Ambiente DEMO — data di riferimento 01/10/2026 · Dati fittizi. Non è un servizio ufficiale INAPP |
+------------------------------------------------------------------------------------------------------+
| [=] Monitoraggio Gare e Contratti  [Cerca per codice o oggetto  /]  Dati al 01/10/2026  [alert 3]  Dirigente v|
|     Prototipo dimostrativo per INAPP                                                                 |
+----------------+-------------------------------------------------------------------------------------+
| > Dashboard    | Dashboard                                            Ultimo aggiornamento 08:00     |
|   Portafoglio  | [Struttura: Tutte v] [Annualità: 2026 v] [Tipologia v] [Fase v] [Health v]  Azzera  |
|   Centro alert |                                                                                     |
|   (3)          | +-------------------+ +-------------------+ +-------------------+ +-----------------+|
|   Validazione  | | Procedure totali  | | In ritardo        | | Da riprogrammare  | | Alert critici   ||
|   (5)          | | 12                | | 4                 | | 2                 | | [ott] 2         ||
|   Contratti    | | al 01/10/2026     | | su 12             | | su 12             | | aperti          ||
|   e SAL        | +-------------------+ +-------------------+ +-------------------+ +-----------------+|
|   Assistente   | +-------------------+ +-------------------+ +-------------------+ +-----------------+|
|   ------------ | | Programmato       | | Contrattualizzato | | Pagato            | | Importo a rischio||
|   Ammini-      | | 3,7 Mln €         | | 1,2 Mln €         | | 0,3 Mln €         | | 330.000 €       ||
|   strazione    | | versione corrente | | contratti firmati | | pagamenti validi  | | Non coperto     ||
|                | |                   | |                   | |                   | |   180.000 €     ||
|                | |                   | |                   | |                   | | In slittamento  ||
|                | |                   | |                   | |                   | |   150.000 €     ||
|                | +-------------------+ +-------------------+ +-------------------+ +-----------------+|
|                | +---------------------------------------------+ +--------------------------------+ |
|                | | Richiede attenzione                 Vedi tutti| | Baseline e previsione per anno | |
|                | | Sev.     Procedura                 Scadenza   | | [Grafico | Tabella]            | |
|                | | [ott]Critica P-002 Memoria scaduta 26/09/2026| |  migliaia di €                 | |
|                | | [ott]Critica P-008 Eccedenza 2027  -100.000 €| |  [base][prev][pag] 2026        | |
|                | | [cer]Alta    P-010 SAL 1 non verif. 20/09/2026| |  [base][prev][sim] 2027 --disp-| |
|                | | [tri]Media   P-001 Memoria     tra 5 giorni  | |  [base][prev]      2028        | |
|                | | [tri]Media   P-004 Pagamento   20/10/2026    | |  Legenda: Baseline (righe) ... | |
|                | +---------------------------------------------+ +--------------------------------+ |
|                | +---------------------------------------------+ +--------------------------------+ |
|                | | Riparto della spesa per struttura           | | Stato SAL e pagamenti          | |
|                | +---------------------------------------------+ +--------------------------------+ |
+----------------+-------------------------------------------------------------------------------------+
Legenda icone: [ott] OctagonAlert  [cer] CircleAlert  [tri] TriangleAlert  [fiala] FlaskConical
```

### 10.2 Portafoglio (UI-03)

```
+------------------------------------------------------------------------------------------------------+
| BANNER DEMO                                                                                          |
| HEADER                                                                                               |
+----------------+-------------------------------------------------------------------------------------+
|   Dashboard    | Dashboard › Portafoglio                                                             |
| > Portafoglio  | Portafoglio                                          [Esporta 3 righe XLSX] [Colonne v]|
|   ...          | +---------------------------------------------------------------------------------+ |
|                | | [Cerca per codice o oggetto ] [Struttura v] [Annualità v] [Tipologia v] [Fase v] | |
|                | | [Health v] [Altri filtri v]                                                     | |
|                | | Filtri attivi: (Health: Rosso x) (Annualità: 2027 x)  Azzera filtri              | |
|                | +---------------------------------------------------------------------------------+ |
|                | 3 procedure trovate                                                                 |
|                | +---------------------------------------------------------------------------------+ |
|                | |[ ]|Codice |Oggetto               |Struttura   |Fase      |Health   |Prossima scad.  | |
|                | |   |       |                      |            |          |         |     Programmato| |
|                | |---+-------+----------------------+------------+----------+---------+----------------| |
|                | |[ ]|P-002  |Supporto metodologico |Programmaz. |Memoria   |[ott]Rosso|26/09/2026     | |
|                | |   |       |e project management  |e controllo |attesa    |         |scaduta 5 gg     | |
|                | |   |       |                      |            |          |         |  480.000,00 €   | |
|                | |[ ]|P-005  |Servizi cloud e       |Sistemi inf.|Stipula   |[ott]Rosso|+45 gg         | |
|                | |   |       |continuità operativa  |            |          |         |  310.000,00 €   | |
|                | |[ ]|P-008  |Evoluzione piattaforma|Innovazione |Gara      |[ott]Rosso|...            | |
|                | |   |       |politiche attive      |digitale    |          |         |  890.000,00 €   | |
|                | |---+-------+----------------------+------------+----------+---------+----------------| |
|                | |   |Totale (3 procedure)                                              1.680.000,00 € | |
|                | +---------------------------------------------------------------------------------+ |
|                | Righe per pagina [25 v]                                  1–3 di 3   [<] [>]         |
+----------------+-------------------------------------------------------------------------------------+
Nota: a 1366px le colonne Pagato, Importo a rischio e Owner sono visibili scorrendo la tabella
(colonna Codice fissa) o attivabili da "Colonne".
```

### 10.3 Scheda procedura (UI-04), tab Panoramica

```
+------------------------------------------------------------------------------------------------------+
| BANNER DEMO / HEADER                                                                                 |
+----------------+-------------------------------------------------------------------------------------+
|   Portafoglio  | Portafoglio › P-002                                                                 |
|                | +---------------------------------------------------------------------------------+ |
|                | | P-002  Supporto metodologico e project management        [Memoria attesa]        | |
|                | | CIG 9A1B2C3D4E (demo) · CUP ... (demo) · Programmazione e controllo   [ott] Rosso| |
|                | | Owner: STRUCTURE_USER@PROGRAMMAZIONE_CONTROLLO · Procedura negoziata  480.000,00 €| |
|                | | Prossima scadenza: Consegna memoria — 26/09/2026 (scaduta da 5 giorni)            | |
|                | | Perché è Rosso: milestone bloccante scaduta; eccedenza 2027 di 80.000,00 € [v]   | |
|                | |                                        [Avvia simulazione]  [Altre azioni v]    | |
|                | +---------------------------------------------------------------------------------+ |
|                | [Panoramica] Cronoprogramma  Documenti  Finanza  Alert (2)  Simulazioni (1)  Audit  |
|                | ----------------------------------------------------------------------------------- |
|                | +--------------------------+ +--------------------------+ +-----------------------+ |
|                | | Date chiave              | | Importi per anno         | | Problemi aperti       | |
|                | |          Base  Prev  Eff | |       Base   Prev   Disp | | [ott]Critica Memoria  | |
|                | | Memoria  26/09 26/09  n.d.| | 2026  ...    ...    ...  | |  scaduta (T+1)        | |
|                | | Indiz.   ...   ...   n.d.| | 2027  ...    ...    ...  | | [cer]Alta Riprogram-  | |
|                | | Aggiud.  ...   ...   n.d.| |  Eccedenza 2027 80.000 € | |  mazione richiesta    | |
|                | +--------------------------+ +--------------------------+ | [Prendi in carico]    | |
|                |                                                           +-----------------------+ |
|                | +---------------------------------------------------------------------------------+ |
|                | | Azioni consentite al ruolo Dirigente: approva o rifiuta simulazioni inviate;     | |
|                | | override motivato delle criticità bloccanti.                                     | |
|                | +---------------------------------------------------------------------------------+ |
+----------------+-------------------------------------------------------------------------------------+
```

---

## 11. Fonti

**Sito INAPP (valori [R])**
- Home (pagina viva, protetta da Cloudflare): https://www.inapp.gov.it/
- Snapshot home 12/09/2026: http://web.archive.org/web/20260912171834/https://www.inapp.gov.it/
- Snapshot *Istituto* 20/09/2026: http://web.archive.org/web/20260920033758/https://www.inapp.gov.it/istituto
- Snapshot *Pubblicazioni* 20/09/2026: http://web.archive.org/web/20260920203442/https://www.inapp.gov.it/pubblicazioni
- Snapshot *Bandi di gara e contratti* 29/06/2026: http://web.archive.org/web/20260629110202/https://www.inapp.gov.it/amministrazione-trasparente/bandi-di-gara-e-contratti/
- CSS del tema figlio: https://www.inapp.gov.it/wp-content/themes/oceanwp-child-theme-inapp/css/style.min.css (via Internet Archive)
- CSS del tema padre: https://www.inapp.gov.it/wp-content/themes/oceanwp/assets/css/style.min.css (via Internet Archive)
- Font: https://fonts.googleapis.com/css?family=Titillium+Web (richiamato dalla home)

**Designers Italia e Bootstrap Italia ([DI])**
- Identità: https://designers.italia.it/design-system/fondamenti/identita/
- Colori: https://designers.italia.it/design-system/fondamenti/colori/
- Tipografia: https://designers.italia.it/design-system/fondamenti/tipografia/
- Microtesti: https://designers.italia.it/design-system/fondamenti/microtesti/
- Tono di voce: https://designers.italia.it/design-system/fondamenti/tono-di-voce/
- Fondamenti di scrittura (notizia): https://designers.italia.it/community/notizie/20230530-design-system-pubblicati-i-fondamenti-di-scrittura-per-l-esperienza-utente/
- Guida al linguaggio della PA: https://docs.italia.it/italia/designers-italia/writing-toolkit/it/bozza/index.html
- Manuale operativo di design: https://docs.italia.it/italia/designers-italia/manuale-operativo-design-docs/it/versione-corrente/doc/progettazione-dell-interfaccia/progettare-con-il-design-system-italia.html
- Bootstrap Italia 2.18.3, variabili SCSS: https://cdn.jsdelivr.net/npm/bootstrap-italia@2.18.3/src/scss/base/_variables.scss — documentazione: https://italia.github.io/bootstrap-italia/

**Norme e linee guida**
- Linee guida di design per i siti internet e i servizi digitali della PA (AgID, 2022): https://www.agid.gov.it/sites/default/files/repository_files/design-linee-guida-docs.pdf
- Notizia AgID sull'adozione: https://www.agid.gov.it/it/agenzia/stampa-e-comunicazione/notizie/2022/07/27/pubblicate-linee-guida-design-i-siti-internet-i-servizi-digitali-pa
- Linee guida sull'accessibilità degli strumenti informatici (AgID): https://docs.italia.it/media/pdf/lg-accessibilita-docs/bozza/lg-accessibilita-docs.pdf
- Modello di autovalutazione (Allegato 2): https://docs.italia.it/AgID/documenti-in-consultazione/lg-accessibilita-docs/it/stabile/_downloads/1fc9ff9c1f5ead84753923dbecf38ee1/Allegato%202%20-%20Modello%20di%20autovalutazione.pdf
- WCAG 2.1: https://www.w3.org/TR/WCAG21/

---

## Appendice A — Ricalcolo dei contrasti

```python
# python contrast.py  (formula WCAG 2.1 della luminanza relativa)
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(fg, bg):
    a, b = sorted((lum(fg), lum(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)

print(f"{ratio('#FFFFFF', '#0059B3'):.2f}:1")  # 6.82:1
```

Per i colori dei grafici, oltre al contrasto, verificare la distinguibilità con il daltonismo (simulazione Machado-Oliveira-Fernandes 2009, ΔE in OKLab ≥ 8 obiettivo, ≥ 6 solo con codifica secondaria, visione normale ≥ 15): i valori del §4.6 sono stati validati così. Se si aggiunge o si riordina uno slot, ripetere la verifica.

## Appendice B — Decisioni da validare con INAPP

1. Uso dei colori INAPP (`#003567`, `#0059B3`) invece del Blu Italia `#0066CC`.
2. Assenza del logo nell'ambiente DEMO e sua eventuale autorizzazione per versioni successive.
3. Forma di cortesia: "tu" (Designers Italia) oppure forma impersonale.
4. Etichetta "Health" contro "Stato di salute" e le etichette italiane degli stati di milestone, SAL e alert (dizionario DEC-001).
5. Applicabilità formale delle linee guida AgID sull'accessibilità a questo strumento interno e necessità di una dichiarazione di accessibilità.
