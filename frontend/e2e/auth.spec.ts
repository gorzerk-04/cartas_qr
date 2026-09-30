import { test, expect } from "@playwright/test";

// Requiere backend (localhost:8000) y frontend (localhost:3000) levantados, y el
// usuario admin ya sembrado (`python seed.py`). Ver README para cómo correr esta suite.
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
if (!ADMIN_PASSWORD) {
  throw new Error("Define E2E_ADMIN_PASSWORD (la contraseña con que se sembró el admin).");
}

test.describe("Autenticación", () => {
  test("login exitoso lleva al dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#username").fill(ADMIN_USERNAME);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    await page.waitForURL("**/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("login con credenciales incorrectas muestra error visible", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#username").fill(ADMIN_USERNAME);
    await page.locator("#password").fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();

    // Se queda en /admin/login (no navega) y muestra el mensaje de error del backend
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("text=/contraseña|incorrect|credenciales/i")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("logout invalida la sesión: una sesión vieja no puede refrescarse", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#username").fill(ADMIN_USERNAME);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Iniciar Sesión" }).click();
    await page.waitForURL("**/admin/dashboard");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/admin/login");

    // El bug original: el logout limpiaba el estado en memoria del cliente pero la
    // cookie httpOnly `refresh_token` seguía siendo válida en el backend, así que
    // recargar una ruta protegida volvía a autenticar silenciosamente. Navegar de
    // nuevo a una ruta admin después del logout debe quedarse en login, no colarse.
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 });
  });

  test("acceder a una ruta admin sin sesión redirige a login sin loop", async ({ page }) => {
    // Next.js/Chrome emiten más de un evento `framenavigated` para la misma URL
    // (ej. al hidratar) — eso no es un loop. Se deduplican consecutivos para
    // quedarse solo con transiciones a una URL realmente distinta.
    const distinctUrls: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (distinctUrls[distinctUrls.length - 1] !== url) distinctUrls.push(url);
    });

    await page.goto("/admin/restaurants");
    await page.waitForURL(/\/admin\/login/, { timeout: 10_000 });

    // Si hubiera un loop de verdad, seguirían apareciendo URLs nuevas (rebotando
    // entre login y la ruta protegida) — se espera un momento y se confirma que
    // la lista de URLs distintas ya no crece.
    const distinctCountAfterSettling = distinctUrls.length;
    await page.waitForTimeout(1500);
    expect(distinctUrls.length).toBe(distinctCountAfterSettling);
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
