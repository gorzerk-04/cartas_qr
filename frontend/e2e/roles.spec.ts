import { test, expect, request as pwRequest, type Browser, type BrowserContext } from "@playwright/test";

// Requiere backend (localhost:8000) y frontend (localhost:3000) levantados y los datos
// sembrados con `python scripts/seed_e2e.py` (ver README). Variables de entorno:
//   E2E_ADMIN_PASSWORD, E2E_OWNER_PASSWORD (obligatorias)
//   E2E_ADMIN_USERNAME (def. "admin"), E2E_OWNER_USERNAME (def. "e2e_owner")
const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const OWNER_USERNAME = process.env.E2E_OWNER_USERNAME ?? "e2e_owner";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";
if (!ADMIN_PASSWORD || !OWNER_PASSWORD) {
  throw new Error("Define E2E_ADMIN_PASSWORD y E2E_OWNER_PASSWORD (ver README).");
}

// El login tiene rate limit (5/min por IP) y auth.spec.ts ya gasta varios intentos: se
// inicia sesión UNA vez por rol por la API y se reutiliza la cookie de refresh en el
// navegador (el layout refresca el access token en silencio), esperando si hay 429.
async function apiLogin(username: string, password: string) {
  const api = await pwRequest.newContext({ baseURL: `${API_URL.replace(/\/$/, "")}/` });
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await api.post("auth/login", { data: { username, password } });
    if (res.ok()) {
      const body = await res.json();
      return { api, accessToken: body.data.access_token as string, storageState: await api.storageState() };
    }
    if (res.status() !== 429) throw new Error(`Login API falló (${res.status()}): ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 62_000));
  }
  throw new Error("Login API: rate limit persistente");
}

async function contextFor(browser: Browser, storageState: Awaited<ReturnType<typeof apiLogin>>["storageState"]) {
  return browser.newContext({ storageState });
}

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
    adminCtx = await contextFor(browser, admin.storageState);
    ownerCtx = await contextFor(browser, owner.storageState);

    const res = await admin.api.get("admin/restaurants", {
      params: { limit: 100 },
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    });
    const restaurants: { id: string; name: string }[] = (await res.json()).data;
    ownRestaurantId = restaurants.find((r) => r.name === "E2E Propio")?.id ?? "";
    otherRestaurantId = restaurants.find((r) => r.name === "E2E Ajeno")?.id ?? "";
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
    await expect(page.getByLabel(/^Publicado/)).toBeVisible();
    await expect(page.locator("#slug")).toBeDisabled();
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
    const ctx = await browser.newContext({ storageState: fresh.storageState });
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
