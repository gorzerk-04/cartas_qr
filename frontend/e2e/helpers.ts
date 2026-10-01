import { request as pwRequest, type APIRequestContext, type Browser } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";

export function requireEnv(...names: string[]): void {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    throw new Error(`Define ${missing.join(" y ")} (ver README).`);
  }
}

export interface ApiSession {
  api: APIRequestContext;
  accessToken: string;
  storageState: Awaited<ReturnType<APIRequestContext["storageState"]>>;
}

// El login tiene rate limit (5/min por IP) y varias specs inician sesión: se entra UNA vez
// por rol por la API y se reutiliza la cookie de refresh en el navegador (el layout refresca
// el access token en silencio). Si hay un 429, espera a que venza la ventana y reintenta.
export async function apiLogin(username: string, password: string): Promise<ApiSession> {
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

export async function contextFor(browser: Browser, session: ApiSession) {
  return browser.newContext({ storageState: session.storageState });
}

export async function findRestaurantId(session: ApiSession, name: string): Promise<string> {
  const res = await session.api.get("admin/restaurants", {
    params: { limit: 100 },
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const restaurants: { id: string; name: string }[] = (await res.json()).data;
  return restaurants.find((r) => r.name === name)?.id ?? "";
}
