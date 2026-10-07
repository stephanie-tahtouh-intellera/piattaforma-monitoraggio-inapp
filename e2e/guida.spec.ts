import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LANE_ROLES, PROCESS_TOUR, ROLE_TOUR, TOURS, TOUR_ORDER } from "../src/ui/tour/content";

/** [DEC-106][DEC-107] Guida demo: ogni passo porta a una pagina esistente; il percorso per fasi porta BZ-001 alla stipula. */

async function loginWithTour(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto(`/login?utente=${user}&guida=1`);
  await expect(page.getByLabel("Avvia la guida demo del ruolo dopo l'accesso")).toBeChecked();
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.locator(".tour-panel")).toBeVisible();
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

const panel = (page: Page) => page.locator(".tour-panel");

async function checkStep(page: Page, tourId: string, i: number) {
  const tour = TOURS[tourId]!;
  const step = tour.steps[i]!;
  await expect(panel(page).locator(".tour-count")).toContainText(`Passo ${i + 1} di ${tour.steps.length}`);
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(step.title);
  await expect(panel(page).locator(".tour-away")).toHaveCount(0, { timeout: 15_000 });
  if (step.target) await expect(page.locator(step.target).first(), `${tourId} passo ${i + 1}: ${step.target}`).toHaveClass(/tour-target/, { timeout: 10_000 });
}

test.describe.serial("[DEC-106] guida demo", () => {
  for (const role of TOUR_ORDER) {
    const tour = ROLE_TOUR[role];
    test(`percorso ${role} (${tour.login}, ${tour.steps.length} passi)`, async ({ page }) => {
      await loginWithTour(page, tour.login!);
      for (let i = 0; i < tour.steps.length; i++) {
        await checkStep(page, role, i);
        if (i === 0) await axe(page);
        if (i < tour.steps.length - 1) await panel(page).getByRole("button", { name: "Avanti ›" }).click();
      }
      await expect(page.locator(".tour-end")).toBeVisible();
      await panel(page).getByRole("button", { name: "Fine" }).click();
      await expect(page.getByRole("button", { name: "Apri la guida demo" })).toBeVisible();
    });
  }

  test("aiuto della pagina, scheda Iter e pagina /guida", async ({ page }) => {
    await loginWithTour(page, "amministrazione");
    await panel(page).getByRole("button", { name: "Aiuto pagina" }).click();
    await expect(panel(page).getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.goto("/procedure/CD-03?tab=iter");
    await expect(panel(page).getByRole("heading", { name: "Scheda procedura · Iter" })).toBeVisible();
    await expect(panel(page)).toContainText("Registrare prenotazioni e impegni per annualità");
    await expect(page.locator(".phase-bar li")).toHaveCount(4);
    await expect(page.locator(".phase-bar li.is-current")).toContainText("Fabbisogno");
    await axe(page);
    await page.goto("/guida");
    await expect(page.getByRole("heading", { name: "Guida alla demo" })).toBeVisible();
    await expect(page.locator(".guide-card")).toHaveCount(TOUR_ORDER.length);
    await expect(page.locator(".map-step")).toHaveCount(TOURS[PROCESS_TOUR]!.steps.filter((s) => s.stage !== undefined && LANE_ROLES.includes(s.role!)).length);
    await axe(page);
  });

  test("Modulo 2 nascosto: niente SAL né pagamenti nella scheda", async ({ page }) => {
    await loginWithTour(page, "dirigente");
    await page.goto("/procedure/OP04-S18?tab=finance");
    await expect(page.getByRole("heading", { name: "Prenotazioni e impegni per annualità" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Piano SAL e pagamenti" })).toHaveCount(0);
    await expect(page.locator(".phase-bar")).toContainText("Contratto stipulato");
  });

  test("percorso per fasi: BZ-001 dal piano alla stipula, con cambio di attore dal pannello", async ({ page }) => {
    test.setTimeout(240_000);
    await page.context().clearCookies();
    await page.goto("/login?utente=struttura.si");
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard direzionale" })).toBeVisible();
    await page.goto("/guida");
    await page.getByRole("button", { name: /Avvia il percorso per fasi/ }).click();
    const tour = TOURS[PROCESS_TOUR]!;
    const passo = page.locator("[data-tour='passo']");
    const register = async (fill?: () => Promise<void>, button = "Registra il passo") => {
      await expect(passo).toBeVisible();
      const before = await passo.locator("h3").textContent();
      if (fill) await fill();
      await passo.getByRole("button", { name: button }).click();
      await expect(passo.locator(".alert-box.error")).toHaveCount(0);
      if (button === "Registra il passo") await expect(passo.locator("h3")).not.toHaveText(before ?? "");
      else await expect(passo).toContainText("il contratto è stipulato");
    };
    const note = (t: string) => passo.getByLabel(/Nota o riferimento|Fonte di finanziamento|Riferimento dell'ordine/).fill(t);
    const actions: Record<number, () => Promise<void>> = {
      1: async () => {
        const card = page.locator("[data-tour='memoria']");
        await card.getByLabel("Protocollo o nota").fill("INAPP-DEMO 412/2026");
        await card.getByRole("button", { name: "Consegna memoria" }).click();
        // Alla consegna la scheda sparisce con il refresh: l'esito è la procedura che non è più bozza, non il messaggio
        await expect(card).toHaveCount(0);
      },
      2: () => register(() => note("Funzionario assegnato: dott.ssa Bianchi")),
      3: () => register(() => note("PN GDL – Priorità 1")),
      4: () => register(() => passo.getByLabel("Operatore economico a cui richiedere i documenti").selectOption("SUP-ALFA")),
      5: () => register(() => note("DGUE, DURC e dichiarazioni inviati")),
      6: () => register(),
      7: () => register(() => note("Det. n. 312 del 01/10/2026")),
      8: () => register(),
      9: () => register(),
      10: () => register(),
      11: () => register(() => passo.getByLabel(/Importo di aggiudicazione/).fill("84.180,00")),
      12: () => register(),
      13: () => register(),
      14: () => register(undefined, "Accetto l'ordine e controfirmo il contratto"),
      16: async () => {
        const row = page.locator("tbody tr", { hasText: "RS-CD05-001" });
        await row.getByLabel(/Override/).check();
        await row.getByLabel("Motivazione (obbligatorio)").fill("Copertura 2028 nella prossima variazione di bilancio");
        await row.getByRole("button", { name: "Approva" }).click();
        await expect(row).toContainText("Approvata");
      },
    };
    for (let i = 0; i < tour.steps.length; i++) {
      const switchBtn = panel(page).getByRole("button", { name: /^Accedi come .* e continua$/ });
      await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(tour.steps[i]!.title);
      if (await switchBtn.count()) {
        await switchBtn.click();
        await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(tour.steps[i]!.title);
        await expect(switchBtn).toHaveCount(0);
      }
      await checkStep(page, PROCESS_TOUR, i);
      await actions[i]?.();
      if (i === 15) {
        await expect(page.locator(".phase-bar .is-end")).toContainText("Contratto stipulato");
        await axe(page);
      }
      if (i < tour.steps.length - 1) await panel(page).getByRole("button", { name: "Avanti ›" }).click();
    }
    await page.goto("/procedure/BZ-001?tab=finance");
    await expect(page.locator("main")).toContainText("84.180,00");
    await expect(page.locator("main")).toContainText("Fornitore Demo Alfa S.r.l.");
  });

  test("il fornitore non vede la procedura di un altro operatore", async ({ page }) => {
    await loginWithTour(page, "fornitore.alfa");
    await page.goto("/procedure/CD-05");
    await expect(page.getByRole("heading", { name: "Accesso non consentito" })).toBeVisible();
  });
});
