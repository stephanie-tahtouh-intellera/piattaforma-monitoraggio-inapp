import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, user: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Utente").fill(user);
  await page.getByLabel("Password").fill("Demo2026!");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard direzionale" })).toBeVisible();
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

test.describe.serial("[DEMO] demo script della specifica §13.3", () => {
  test("[T-001][T-025] dashboard del Direttore Generale con KPI dell'oracle", async ({ page }) => {
    await loginAs(page, "dirigente");
    await expect(page.getByText("Ambiente DEMO — data di riferimento 01/10/2026").first()).toBeVisible();
    const kpi = (label: string) => page.locator(".kpi-card", { hasText: label });
    await expect(kpi("Procedure monitorate").locator(".kpi-value")).toHaveText("12");
    await expect(kpi("In ritardo").locator(".kpi-value")).toHaveText("4");
    await expect(kpi("Da riprogrammare").locator(".kpi-value")).toHaveText("3");
    await expect(kpi("Alert critici").locator(".kpi-value")).toHaveText("4");
    await expect(kpi("Importo a rischio")).toContainText("612.000,00");
    await axe(page);
  });

  test("[T-003] portafoglio filtrato Rosso + 2027", async ({ page }) => {
    await loginAs(page, "dirigente");
    await page.goto("/portafoglio?health=RED&year=2027&sort=code");
    const codes = await page.locator("tbody td.mono a").allTextContents();
    expect(codes).toEqual(["P-002", "P-005", "P-008", "P-010"]);
    await axe(page);
  });

  test("[T-004] P-001: alert memoria T-5 alla Struttura", async ({ page }) => {
    await loginAs(page, "struttura.si");
    await page.goto("/procedure/P-001?tab=alerts");
    await expect(page.locator("tbody tr", { hasText: "Scadenza milestone" })).toContainText("T-5");
    await expect(page.locator("tbody tr", { hasText: "Scadenza milestone" })).toContainText("Alta");
  });

  test("[T-006][T-007] Ufficio Gare simula P-002: 150.000 € spostati, eccedenza 2027 di 80.000 €", async ({ page }) => {
    await loginAs(page, "gare");
    await page.goto("/procedure/P-002/riprogrammazione");
    await page.getByLabel("Nuova data proposta (obbligatorio)").fill("16/11/2026");
    await page.getByRole("button", { name: "Calcola simulazione" }).click();
    await expect(page.getByRole("heading", { name: /2\. Cronoprogramma \(7 date cambiate\)/ })).toBeVisible();
    await page.getByRole("button", { name: "Avanti" }).click();
    await expect(page.getByText("150.000,00 €").first()).toBeVisible();
    await expect(page.getByText("Eccedenza 80.000,00 €")).toBeVisible();
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Invia ad approvazione" }).click();
    await expect(page.getByText(/salvata\. Nessun dato corrente è stato modificato/)).toBeVisible();
  });

  test("[T-009][DEC-110] l'Ufficio Gare approva la bozza automatica: nuova versione, baseline intatta", async ({ page }) => {
    await loginAs(page, "gare");
    await page.goto("/procedure/P-002?tab=simulations");
    const row = page.locator("tbody tr", { hasText: "Più rapida" });
    await row.getByLabel(/Motivazione/).first().fill("Memoria attesa entro il 12/10, nessuno spostamento tra annualità");
    await row.getByRole("button", { name: "Approva" }).click();
    await expect(row).toContainText("Approvata");
    await page.goto("/procedure/P-002?tab=overview");
    await expect(page.getByText(/V1 – baseline \(baseline\) → V2 – riprogrammazione/)).toBeVisible();
  });

  test("[T-011][T-024] P-004 finanza e P-009 pagamento oltre il liquidato rifiutato", async ({ page }) => {
    await loginAs(page, "amministrazione");
    await page.goto("/procedure/P-004?tab=finance");
    await expect(page.locator("tfoot")).toContainText("190.400,00");
    await page.goto("/procedure/P-009?tab=finance");
    await page.getByLabel("Importo (obbligatorio)").fill("305000,01");
    await page.getByRole("button", { name: "Registra pagamento" }).click();
    await expect(page.locator(".alert-box.error")).toContainText("Puoi registrare al massimo 305.000,00");
  });

  test("[T-017] il fornitore non vede le procedure altrui", async ({ page }) => {
    await loginAs(page, "fornitore.alfa");
    await page.goto("/procedure/P-010");
    await expect(page.getByRole("heading", { name: "Accesso non consentito" })).toBeVisible();
    const res = await page.request.get("/api/procedures/P-010");
    expect(res.status()).toBe(403);
  });

  test("[T-019] assistente: pagato su P-004 con fonti", async ({ page }) => {
    await loginAs(page, "dirigente");
    await page.goto("/assistente");
    await page.getByLabel("Domanda").fill("Quanto è stato pagato su P-004?");
    await page.getByRole("button", { name: "Chiedi" }).click();
    await expect(page.locator(".msg.bot")).toContainText("pagato 47.600,00");
  });
});
