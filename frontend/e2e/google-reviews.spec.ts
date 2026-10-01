import { test, expect, type BrowserContext } from "@playwright/test";
import { apiLogin, API_URL, contextFor, findRestaurantId, requireEnv } from "./helpers";

// Herramienta de admin "Reseñas de Google". Requiere `python scripts/seed_e2e.py`.
// La conversión se simula interceptando /admin/google-review/resolve (no sale a internet).
// La asignación usa el enlace LARGO de Maps del seed: el backend lo resuelve sin red y genera
// el mismo enlace que ya tiene "E2E Propio", así que no altera lo que comprueban otras specs.
requireEnv("E2E_ADMIN_PASSWORD", "E2E_OWNER_PASSWORD");
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const OWNER_USERNAME = process.env.E2E_OWNER_USERNAME ?? "e2e_owner";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

const SHORT = "https://maps.app.goo.gl/ypMDFVAFDyfr9xFY6";
const LONG =
  "https://www.google.com/maps/place/Chifa+Taiwan/@-9.9554469,-76.2486745,21z/data=!4m6!3m5" +
  "!1s0x91a7c3749150a1f7:0xb61bbbe27d37f437!8m2!3d-9.9554923!4d-76.2486634?entry=tts";
const REVIEW = "https://www.google.com/search?q=Chifa+Taiwan#lrd=0x91a7c3749150a1f7:0xb61bbbe27d37f437,3,,,,";

test.describe("Reseñas de Google (admin)", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let adminCtx: BrowserContext;
  let ownerCtx: BrowserContext;
  let ownRestaurantId = "";

  test.beforeAll(async ({ browser }) => {
    // Puede esperar el reset del rate limit del login (62 s)
    test.setTimeout(240_000);
    const admin = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    const owner = await apiLogin(OWNER_USERNAME, OWNER_PASSWORD);
    adminCtx = await contextFor(browser, admin);
    ownerCtx = await contextFor(browser, owner);
    ownRestaurantId = await findRestaurantId(admin, "E2E Propio");
    if (!ownRestaurantId) throw new Error("Falta el restaurante e2e: corre `python scripts/seed_e2e.py`.");
    const baseURL = test.info().project.use.baseURL ?? "http://localhost:3000";
    await adminCtx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  });

  test.afterAll(async () => {
    await adminCtx?.close();
    await ownerCtx?.close();
  });

  test("el admin convierte un enlace de Maps, lo copia y lo prueba", async () => {
    const page = await adminCtx.newPage();
    let resolveBody: unknown = null;
    await page.route(`${API_URL.replace(/\/$/, "")}/admin/google-review/resolve`, async (route) => {
      resolveBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ nombre: "Chifa Taiwan", ftid: "0x91a7c3749150a1f7:0xb61bbbe27d37f437", review_url: REVIEW }),
      });
    });

    await page.goto("/admin/dashboard");
    await page.getByRole("link", { name: "Reseñas de Google" }).click();
    await page.waitForURL("**/admin/google-reviews");

    await page.getByLabel("Enlace de Google Maps del local").first().fill(SHORT);
    await page.getByRole("button", { name: "Obtener enlace" }).click();

    const result = page.getByTestId("resolve-result");
    await expect(result).toContainText("Chifa Taiwan");
    await expect(result.getByRole("textbox")).toHaveValue(REVIEW);
    expect(resolveBody).toEqual({ maps_url: SHORT });

    await result.getByRole("button", { name: "Copiar" }).click();
    await expect(result.getByRole("button", { name: "Copiado" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(REVIEW);

    const probar = result.getByRole("link", { name: "Probar" });
    await expect(probar).toHaveAttribute("href", REVIEW);
    await expect(probar).toHaveAttribute("target", "_blank");
    await page.close();
  });

  test("el admin asigna el enlace a un restaurante y lo guarda", async () => {
    const page = await adminCtx.newPage();
    await page.goto("/admin/google-reviews");
    await page.getByLabel("Restaurante").selectOption({ label: "E2E Propio" });

    const current = page.getByTestId("current-review-link");
    await expect(current).toBeVisible({ timeout: 15_000 });

    await page.locator("#assign-maps-url").fill(LONG);
    await page.locator("#assign-override").fill("https://evil.com/review");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/enlace oficial de reseñas debe ser/)).toBeVisible();

    await page.locator("#assign-override").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Enlace guardado");
    await expect(current).toContainText(REVIEW);

    // Info General muestra el resumen (solo admin)
    await page.goto(`/admin/restaurants/${ownRestaurantId}`);
    await expect(page.getByTestId("google-review-summary")).toContainText(REVIEW, { timeout: 15_000 });
    await page.close();
  });

  test("un dueño no ve la sección ni puede entrar por URL", async () => {
    const page = await ownerCtx.newPage();
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Reseñas de Google" })).toHaveCount(0);

    await page.goto("/admin/google-reviews");
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });

    // Tampoco ve el resumen en Info General de su restaurante
    await page.goto(`/admin/restaurants/${ownRestaurantId}`);
    await expect(page.getByText("Visibilidad de la carta")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("google-review-summary")).toHaveCount(0);
    await page.close();
  });
});
