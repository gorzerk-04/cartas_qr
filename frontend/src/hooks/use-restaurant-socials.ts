"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantSocialService } from "../services/restaurant-socials";
import { RestaurantSocialCreate, RestaurantSocialUpdate } from "../types";
import { revalidatePublicMenu } from "../lib/revalidate-public-menu";

export function useRestaurantSocials(restaurantId: string) {
  return useQuery({
    queryKey: ["restaurant-socials", restaurantId],
    queryFn: () => restaurantSocialService.list(restaurantId),
    enabled: !!restaurantId,
  });
}

// `slug` es opcional solo para no romper llamadas existentes: cuando se pasa, el enlace
// nuevo/editado/borrado se refleja de inmediato en la carta pública en vez de esperar
// a que venza su cache.
export function useCreateRestaurantSocial(restaurantId: string, slug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestaurantSocialCreate) => restaurantSocialService.create(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
      revalidatePublicMenu(slug);
    },
  });
}

export function useUpdateRestaurantSocial(restaurantId: string, slug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RestaurantSocialUpdate }) =>
      restaurantSocialService.update(restaurantId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
      revalidatePublicMenu(slug);
    },
  });
}

export function useDeleteRestaurantSocial(restaurantId: string, slug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restaurantSocialService.delete(restaurantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
      revalidatePublicMenu(slug);
    },
  });
}
