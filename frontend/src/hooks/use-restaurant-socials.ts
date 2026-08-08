"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantSocialService } from "../services/restaurant-socials";
import { RestaurantSocialCreate, RestaurantSocialUpdate } from "../types";

export function useRestaurantSocials(restaurantId: string) {
  return useQuery({
    queryKey: ["restaurant-socials", restaurantId],
    queryFn: () => restaurantSocialService.list(restaurantId),
    enabled: !!restaurantId,
  });
}

export function useCreateRestaurantSocial(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestaurantSocialCreate) => restaurantSocialService.create(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
    },
  });
}

export function useUpdateRestaurantSocial(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RestaurantSocialUpdate }) =>
      restaurantSocialService.update(restaurantId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
    },
  });
}

export function useDeleteRestaurantSocial(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restaurantSocialService.delete(restaurantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-socials", restaurantId] });
    },
  });
}
