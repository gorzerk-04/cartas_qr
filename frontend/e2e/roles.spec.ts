import { test, expect, type BrowserContext } from "@playwright/test";
import { apiLogin, contextFor, findRestaurantId, requireEnv } from "./helpers";

// Requiere backend (localhost:8000) y frontend (localhost:3000) levantados y los datos
// sembrados con `python scripts/seed_e2e.py` (ver README). Variables de entorno:
//   E2E_ADMIN_PASSWORD, E2E_OWNER_PASSWORD (obligatorias)
//   E2E_ADMIN_USERNAME (def. "admin"), E2E_OWNER_USERNAME (def. "e2e_owner")
requireEnv("E2E_ADMIN_PASSWORD", "E2E_OWNER_PASSWORD");
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const OWNER_USERNAME = process.env.E2E_OWNER_USERNAME ?? "e2e_owner";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

test.describe("Roles", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let adminCtx: BrowserContext;
  let ownerCtx: BrowserContext;
  let ownRestaurantId = "";
  let otherRestaurantId = "";

  test.beforeAll(async ({ browser }) => {
    // Puede esperar el reset del rate limit del login (62 s) una vez
    test.setTimeout(180_000);
    const admin = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    const owner = await apiLogin(OWNER_USERNAME, OWNER_PASSWORD);
    adminCtx = await contextFor(browser, admin);
    ownerCtx = await contextFor(browser, owner);

    ownRestaurantId = await findRestaurantId(admin, "E2E Propio");
    otherRestaurantId = await findRestaurantId(admin, "E2E Ajeno");
    if (!ownRestaurantId || !otherRestaurantId) {
      throw new Error("Faltan los restaurantes e2e: corre `python scripts/seed_e2e.py`.");
    }
  });

  test.afterAll(async () => {
    await adminCtx?.close();
    await ownerCtx?.close();
  });

  test("el dueño entra directo a su único restaurante y solo ve ese", async () => {
    const page = await ownerCtx.newPage();
    await page.goto("/admin/dashboard");
    // Con un solo restaurante asignado el dueño aterriza en su detalle desde el login;
    // al entrar con sesión existente basta con abrir la lista.
    await page.goto("/admin/restaurants");
    await expect(page.getByText("E2E Propio").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E Ajeno")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Nuevo Restaurante/i })).toHaveCount(0);
    await page.close();
  });

  test("el dueño no ve 'Usuarios' y /admin/users lo devuelve al dashboard", async () => {
    const page = await ownerCtx.newPage();
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Usuarios" })).toHaveCount(0);

    await page.goto("/admin/users");
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
    await page.close();
  });

  test("el dueño ve 'no encontrado' al abrir por URL un restaurante ajeno", async () => {
    const page = await ownerCtx.newPage();
    await page.goto(`/admin/restaurants/${otherRestaurantId}`);
    await expect(page.getByText("Restaurante no encontrado").first()).toBeVisible({ timeout: 15_000 });
    await page.close();
  });

  test("el dueño no ve el slug editable ni el estado 'Activo' en su restaurante", async () => {
    const page = await ownerCtx.newPage();
    await page.goto(`/admin/restaurants/${ownRestaurantId}`);
    await expect(page.getByText("Visibilidad de la carta")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Activo")).toHaveCount(0);
    await expect(page.getByLabel(/^Publicado/)).toBeDisabled();
    await expect(page.locator("#slug")).toBeDisabled();
    await expect(page.getByText("La información general es de solo lectura")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar Cambios" })).toHaveCount(0);
    await page.close();
  });

  test("el dueño no ve la pestaña ni el menú de Código QR y /qr lo devuelve al dashboard", async () => {
    const page = await ownerCtx.newPage();
    await page.goto(`/admin/restaurants/${ownRestaurantId}`);
    for (const tab of ["Info General", "Categorías", "Productos", "Check-in", "Comensales", "Fidelización"]) {
      await expect(page.getByRole("link", { name: tab, exact: true })).toBeVisible({ timeout: 15_000 });
    }
    await expect(page.getByRole("link", { name: "Código QR" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Códigos QR" })).toHaveCount(0);

    await page.goto(`/admin/restaurants/${ownRestaurantId}/qr`);
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
    await page.goto("/admin/qr");
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
    await page.close();
  });

  test("el admin ve ambos restaurantes y la pantalla Usuarios", async () => {
    const page = await adminCtx.newPage();
    await page.goto("/admin/restaurants");
    await expect(page.getByText("E2E Propio").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E Ajeno").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Nuevo Restaurante/i })).toBeVisible();

    await page.getByRole("link", { name: "Usuarios" }).click();
    await page.waitForURL("**/admin/users");
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
    await expect(page.getByText(OWNER_USERNAME).first()).toBeVisible();
    await page.close();
  });

  test("alta de un dueño: contraseña temporal una sola vez y cambio obligatorio al entrar", async ({ browser }) => {
    const suffix = Date.now().toString().slice(-6);
    const username = `e2e_nuevo_${suffix}`;

    const page = await adminCtx.newPage();
    await page.goto("/admin/users/new");
    await page.getByLabel("Nombre de usuario").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.com`);
    await page.getByLabel("E2E Propio").check();
    await page.getByRole("button", { name: "Crear usuario" }).click();

    const modal = page.getByRole("dialog");
    await expect(modal.getByText("no se volverá a mostrar")).toBeVisible({ timeout: 15_000 });
    const tempPassword = (await modal.getByTestId("temp-password").textContent())?.trim() ?? "";
    expect(tempPassword.length).toBeGreaterThanOrEqual(12);
    await modal.getByRole("button", { name: "Ya la copié" }).click();
    await page.waitForURL(/\/admin\/users\/[0-9a-f-]+$/);
    await expect(page.getByText(tempPassword)).toHaveCount(0);
    await page.close();

    // El nuevo usuario entra con la clave temporal y queda forzado a cambiarla
    const fresh = await apiLogin(username, tempPassword);
    const ctx = await contextFor(browser, fresh);
    const userPage = await ctx.newPage();
    await userPage.goto("/admin/dashboard");
    await userPage.waitForURL("**/admin/change-password", { timeout: 15_000 });

    const newPassword = `clave-nueva-${suffix}-ok`;
    await userPage.getByLabel("Contraseña actual").fill(tempPassword);
    await userPage.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword);
    await userPage.getByLabel("Confirmar nueva contraseña").fill(newPassword);
    await userPage.getByRole("button", { name: "Guardar contraseña" }).click();

    // Con un solo restaurante asignado aterriza directo en su detalle
    await userPage.waitForURL(/\/admin\/restaurants\/[0-9a-f-]+$/, { timeout: 15_000 });
    await ctx.close();
  });
});
