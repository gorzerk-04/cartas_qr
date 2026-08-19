import { PublicRestaurant } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Etiqueta de cache de la carta de un restaurante. El panel admin la usa para expirar
// esta entrada al guardar (ver actions/refresh-public-menu.ts); sin la etiqueta solo
// quedaba esperar a que venciera el `revalidate` por reloj.
export function publicRestaurantCacheTag(slug: string): string {
  return `public-restaurant-${slug}`;
}

export async function getPublicRestaurant(slug: string): Promise<PublicRestaurant | null> {
  const response = await fetch(`${API_URL}/public/restaurants/${slug}`, {
    next: { revalidate: 60, tags: [publicRestaurantCacheTag(slug)] },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Error al cargar la carta pública (${response.status})`);
  }
  return response.json();
}
