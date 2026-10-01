import { test, expect } from "@playwright/test";

// Fase 5: fila de acciones de la carta pública. No inicia sesión (carta pública).
// Requiere `python scripts/seed_e2e.py`: "E2E Propio" tiene programa activo y `review_url`
// (generado desde su enlace de Maps); "E2E Ajeno" no tiene ninguno de los dos.
const OWN_SLUG = "e2e-propio";
const OTHER_SLUG = "e2e-ajeno";
const REVIEW_URL = "https://www.google.com/search?q=Chifa+Taiwan#lrd=0x91a7c3749150a1f7:0xb61bbbe27d37f437,3,,,,";

test.describe("Botones de la carta", () => {
  test("con enlace, el botón de reseña abre Google en una pestaña nueva", async ({ page }) => {
    await page.goto(`/menu/${OWN_SLUG}`);
    const review = page.getByRole("link", { name: /Déjanos tu reseña/ });
    await expect(review).toBeVisible({ timeout: 15_000 });
    await expect(review).toHaveAttribute("href", REVIEW_URL);
    await expect(review).toHaveAttribute("target", "_blank");
    await expect(review).toHaveAttribute("rel", /noopener/);
  });

  test("con el programa activo, el botón de fidelidad abre el modal con la meta y la recompensa", async ({ page }) => {
    await page.goto(`/menu/${OWN_SLUG}`);
    await page.getByRole("button", { name: /programa de fidelidad/i }).click();

    const modal = page.getByRole("dialog", { name: "Programa de fidelidad" });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("2 visitas");
    await expect(modal).toContainText("Postre e2e gratis");
    await expect(modal).toContainText("Da tu número de celular en caja en cada visita");
    // El seed no pone tiempo mínimo entre visitas: no se muestra la línea de horas
    await expect(modal).not.toContainText("Una visita cada");

    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);

    // También se cierra tocando fuera del modal
    await page.getByRole("button", { name: /programa de fidelidad/i }).click();
    await expect(modal).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(modal).toHaveCount(0);
  });

  test("sin enlace y con el programa inactivo, la fila no aparece", async ({ page }) => {
    await page.goto(`/menu/${OTHER_SLUG}`);
    await expect(page.getByRole("heading", { name: "E2E Ajeno" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("menu-actions")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Déjanos tu reseña/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /programa de fidelidad/i })).toHaveCount(0);
  });
});
