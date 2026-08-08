import { defineConfig, devices } from "@playwright/test";

// Suite manual, no forma parte de `pnpm build`/CI rápido (ver README) — corre un
// Chrome real y ejecuta JS de cliente de verdad, algo que ninguna otra herramienta de
// este proyecto hace (pytest y tsc no detectan bugs de comportamiento del navegador,
// como el bug de logout que motivó este módulo).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Usa el Chrome real ya instalado en la máquina en vez de descargar el
        // Chromium propio de Playwright — coincide con el patrón que ya se usó
        // ad-hoc para depurar el bug de logout de este mismo proyecto.
        channel: "chrome",
      },
    },
  ],
});
