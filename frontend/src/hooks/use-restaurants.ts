"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { restaurantService } from "../services/restaurants";
import { Restaurant, RestaurantCreate, RestaurantUpdate } from "../types";
import { revalidatePublicMenu } from "../lib/revalidate-public-menu";

export function useRestaurants(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  is_published?: boolean;
}) {
  return useQuery({
    queryKey: ["restaurants", params],
    queryFn: () => restaurantService.list(params),
  });
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantService.getById(id),
    enabled: !!id,
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RestaurantCreate) => restaurantService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RestaurantUpdate }) =>
      restaurantService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({
        queryKey: ["restaurant", variables.id],
      });
      revalidatePublicMenu(data?.slug);
    },
  });
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restaurantService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });
}

// Las cuatro mutaciones de imagen comparten el mismo post-guardado: refrescar las queries
// del panel y avisar a Next.js que la carta pública quedó obsoleta.
function useRestaurantImageMutation(
  mutationFn: (vars: { id: string; file?: File }) => Promise<Restaurant>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({
        queryKey: ["restaurant", variables.id],
      });
      revalidatePublicMenu(data?.slug);
    },
  });
}

export function useUploadRestaurantLogo() {
  return useRestaurantImageMutation(({ id, file }) =>
    restaurantService.uploadLogo(id, file as File)
  );
}

export function useUploadRestaurantCover() {
  return useRestaurantImageMutation(({ id, file }) =>
    restaurantService.uploadCover(id, file as File)
  );
}

export function useDeleteRestaurantLogo() {
  return useRestaurantImageMutation(({ id }) => restaurantService.deleteLogo(id));
}

export function useDeleteRestaurantCover() {
  return useRestaurantImageMutation(({ id }) => restaurantService.deleteCover(id));
}
