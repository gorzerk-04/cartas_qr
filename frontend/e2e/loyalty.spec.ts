import { test, expect, type BrowserContext } from "@playwright/test";
import { apiLogin, contextFor, findRestaurantId, requireEnv } from "./helpers";

// Requiere backend y frontend levantados y `python scripts/seed_e2e.py` ejecutado: deja
// "E2E Propio" con el programa activo (2 visitas, sin espera entre visitas). Variables:
//   E2E_OWNER_PASSWORD (obligatoria), E2E_OWNER_USERNAME (def. "e2e_owner")
requireEnv("E2E_OWNER_PASSWORD");
const OWNER_USERNAME = process.env.E2E_OWNER_USERNAME ?? "e2e_owner";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";
const OWN_SLUG = "e2e-propio";

// Celular nuevo en cada corrida, para que el comensal siempre sea "nuevo"
const PHONE = `9${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`;

test.describe("Fidelización", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let ownerCtx: BrowserContext;
  let restaurantId = "";

  test.beforeAll(async ({ browser }) => {
    // Puede esperar el reset del rate limit del login (62 s) una vez
    test.setTimeout(180_000);
    const owner = await apiLogin(OWNER_USERNAME, OWNER_PASSWORD);
    ownerCtx = await contextFor(browser, owner);
    restaurantId = await findRestaurantId(owner, "E2E Propio");
    if (!restaurantId) throw new Error("Falta el restaurante e2e: corre `python scripts/seed_e2e.py`.");
  });

  test.afterAll(async () => {
    await ownerCtx?.close();
  });

  test("el dueño hace check-in de un celular nuevo, con nombre y consentimiento, y ve 1/2", async () => {
    const page = await ownerCtx.newPage();
    await page.goto(`/admin/restaurants/${restaurantId}/check-in`);

    await page.getByLabel("Celular del comensal").fill(PHONE);
    await page.getByRole("button", { name: "Registrar visita" }).click();

    // Comensal nuevo: pide nombre y consentimiento antes de crearlo
    await expect(page.getByText("Es un comensal nuevo")).toBeVisible({ timeout: 15_000 });
    const submit = page.getByRole("button", { name: "Registrar comensal y visita" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Nombre", { exact: true }).fill("Comensal E2E");
    await expect(submit).toBeDisabled(); // falta el consentimiento
    await page.getByRole("checkbox").check();
    await submit.click();

    const result = page.getByTestId("check-in-result");
    await expect(result).toBeVisible({ timeout: 15_000 });
    await expect(result.getByText("Comensal E2E")).toBeVisible();
    await expect(result.getByTestId("progress-label")).toHaveText("1 / 2");
    await expect(result.getByRole("button", { name: "Anular esta visita" })).toBeVisible();
    await expect(result.getByText("¡Tiene un plato gratis!")).toHaveCount(0);
    await page.close();
  });

  test("un segundo check-in llega a 2/2 y aparece Canjear", async () => {
    const page = await ownerCtx.newPage();
    await page.goto(`/admin/restaurants/${restaurantId}/check-in`);

    await page.getByLabel("Celular del comensal").fill(PHONE);
    await page.getByRole("button", { name: "Registrar visita" }).click();

    const result = page.getByTestId("check-in-result");
    await expect(result.getByTestId("progress-label")).toHaveText("2 / 2", { timeout: 15_000 });
    await expect(result.getByText("¡Tiene un plato gratis!")).toBeVisible();
    await expect(result.getByRole("button", { name: "Canjear" })).toBeVisible();
    await page.close();
  });

  test("tras canjear, el saldo vuelve a 0", async () => {
    const page = await ownerCtx.newPage();
    // El canje se hace desde la ficha del comensal (buscado por los últimos dígitos de su celular)
    await page.goto(`/admin/restaurants/${restaurantId}/customers`);
    await page.getByLabel("Buscar comensal").fill(PHONE.slice(-6));
    await page.getByRole("link", { name: "Comensal E2E" }).first().click();

    await expect(page.getByTestId("progress-label")).toHaveText("2 / 2", { timeout: 15_000 });
    await page.getByRole("button", { name: "Canjear" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Se entregará Postre e2e gratis y se consumirán 2 visitas.")).toBeVisible();
    await dialog.getByRole("button", { name: "Canjear" }).click();

    await expect(page.getByTestId("progress-label")).toHaveText("0 / 2", { timeout: 15_000 });
    await expect(page.getByText("Postre e2e gratis").first()).toBeVisible();
    await page.close();
  });

  test("la carta pública muestra el banner de fidelidad", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/menu/${OWN_SLUG}`);
    const banner = page.getByTestId("loyalty-banner");
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText("Programa de fidelidad");
    await expect(banner).toContainText("2 visitas");
    await expect(banner).toContainText("Postre e2e gratis");
    await expect(banner).toContainText("Pregunta en caja");
    // nunca muestra datos de comensales
    await expect(page.locator("body")).not.toContainText(PHONE);
    await expect(page.locator("body")).not.toContainText("Comensal E2E");
    await ctx.close();
  });
});
