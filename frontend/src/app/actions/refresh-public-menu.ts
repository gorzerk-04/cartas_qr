"use server";

import { updateTag } from "next/cache";
import { publicRestaurantCacheTag } from "../../services/public";

// La carta pública se sirve cacheada para que escanear el QR cargue instantáneo sin
// golpear el backend en cada visita. El efecto secundario era que un cambio hecho en el
// panel (colores, horarios, redes...) no se veía hasta que esa cache vencía por reloj —
// y aun entonces la primera visita seguía recibiendo la copia vieja mientras se
// regeneraba por detrás.
//
// Se usa `updateTag` y no `revalidateTag` a propósito: este es un caso de
// "read-your-own-writes" (el dueño guarda y quiere ver su cambio ya). `revalidateTag`
// aplica stale-while-revalidate, o sea que la siguiente visita todavía recibiría la
// versión vieja; `updateTag` expira la entrada y esa visita espera por los datos frescos.
// Por la misma razón esto es una Server Action y no un Route Handler: `updateTag` solo
// puede llamarse desde Server Actions.
export async function refreshPublicMenu(slug: string): Promise<void> {
  // El slug viene del cliente: se acota antes de construir la etiqueta de cache.
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return;
  updateTag(publicRestaurantCacheTag(slug));
}
