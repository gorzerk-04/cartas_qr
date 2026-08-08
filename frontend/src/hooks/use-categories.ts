"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "../services/categories";
import { CategoryCreate, CategoryUpdate } from "../types";

export function useCategories(restaurantId: string, params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: ["categories", restaurantId, params],
    queryFn: () => categoryService.list(restaurantId, params),
    enabled: !!restaurantId,
  });
}

export function useCategory(restaurantId: string, id: string) {
  return useQuery({
    queryKey: ["category", restaurantId, id],
    queryFn: () => categoryService.getById(restaurantId, id),
    enabled: !!restaurantId && !!id,
  });
}

export function useCreateCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) => categoryService.create(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useUpdateCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) =>
      categoryService.update(restaurantId, id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["category", restaurantId, variables.id] });
    },
  });
}

export function useDeleteCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.delete(restaurantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useReorderCategories(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: { id: string; display_order: number }[]) =>
      categoryService.reorder(restaurantId, orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useUploadCategoryImage(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      categoryService.uploadImage(restaurantId, id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["category", restaurantId, variables.id] });
    },
  });
}
