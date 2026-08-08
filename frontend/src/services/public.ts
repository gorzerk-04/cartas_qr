import { PublicRestaurant } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function getPublicRestaurant(slug: string): Promise<PublicRestaurant | null> {
  const response = await fetch(`${API_URL}/public/restaurants/${slug}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Error al cargar la carta pública (${response.status})`);
  }
  return response.json();
}
