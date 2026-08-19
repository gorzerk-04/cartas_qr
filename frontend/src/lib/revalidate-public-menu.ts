import { refreshPublicMenu } from "../app/actions/refresh-public-menu";

// Avisa al servidor de Next.js que la carta pública de este restaurante quedó obsoleta,
// para que el próximo visitante vea los cambios recién guardados en vez de la copia
// cacheada (ver app/actions/refresh-public-menu.ts).
//
// Es best-effort a propósito: si esta llamada falla, el guardado en sí ya fue exitoso y
// no tiene sentido mostrarle un error al usuario — la cache terminará venciendo sola.
export async function revalidatePublicMenu(slug: string | undefined | null): Promise<void> {
  if (!slug) return;
  try {
    await refreshPublicMenu(slug);
  } catch {
    // Silencioso: no debe romper el flujo de guardado.
  }
}
