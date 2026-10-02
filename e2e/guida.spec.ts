import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TOURS, TOUR_ORDER } from "../src/ui/tour/content";

/** [DEC-106] Ogni passo di ogni guida porta a una pagina esistente e l'elemento indicato è presente. */

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

test.describe.serial("[DEC-106] guida demo per attore", () => {
  for (const role of TOUR_ORDER) {
    const tour = TOURS[role];
    test(`percorso ${role} (${tour.login}, ${tour.steps.length} passi)`, async ({ page }) => {
      await loginWithTour(page, tour.login);
      for (const [i, step] of tour.steps.entries()) {
        const panel = page.locator(".tour-panel");
        await expect(panel.locator(".tour-count")).toHaveText(`Passo ${i + 1} di ${tour.steps.length}`);
        await expect(panel.getByRole("heading", { level: 2 })).toHaveText(step.title);
        await expect(panel.locator(".tour-away")).toHaveCount(0, { timeout: 15_000 });
        if (step.target) await expect(page.locator(step.target).first(), `${role} passo ${i + 1}: ${step.target}`).toHaveClass(/tour-target/, { timeout: 10_000 });
        if (i === 0) await axe(page);
        if (i < tour.steps.length - 1) await panel.getByRole("button", { name: "Avanti ›" }).click();
      }
      await expect(page.locator(".tour-end")).toBeVisible();
      await page.locator(".tour-panel").getByRole("button", { name: "Fine" }).click();
      await expect(page.getByRole("button", { name: "Apri la guida demo" })).toBeVisible();
    });
  }

  test("il fornitore non vede la procedura di un altro contraente", async ({ page }) => {
    await loginWithTour(page, "fornitore.alfa");
    await page.goto("/procedure/CD-04");
    await expect(page.getByRole("heading", { name: "Accesso non consentito" })).toBeVisible();
  });

  test("aiuto della pagina e pagina /guida", async ({ page }) => {
    await loginWithTour(page, "amministrazione");
    await page.locator(".tour-panel").getByRole("button", { name: "Aiuto pagina" }).click();
    await expect(page.locator(".tour-panel").getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.locator(".tour-panel")).toContainText("Cosa puoi fare come Amministrazione");
    await page.goto("/procedure/CD-04?tab=finance");
    await expect(page.locator(".tour-panel").getByRole("heading", { name: "Scheda procedura · Finanza" })).toBeVisible();
    await expect(page.locator(".tour-panel")).toContainText("Registrare fattura, liquidazione e pagamento");
    await page.goto("/guida");
    await expect(page.getByRole("heading", { name: "Guida alla demo" })).toBeVisible();
    await expect(page.locator(".guide-card")).toHaveCount(7);
    await expect(page.locator(".guide-card.is-current")).toContainText("Amministrazione");
    await axe(page);
  });

  test("il percorso completo della Struttura cambia davvero i dati", async ({ page }) => {
    await loginWithTour(page, "struttura.si");
    await page.goto("/procedure/BZ-001");
    const card = page.locator("[data-tour='memoria']");
    await card.getByLabel("Protocollo o nota").fill("INAPP-DEMO 412/2026");
    await card.getByRole("button", { name: "Consegna memoria" }).click();
    await expect(page.getByText("V2 – baseline (baseline)")).toBeVisible();
  });
});
