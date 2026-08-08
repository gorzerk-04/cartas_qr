"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/products";
import { ProductCreate, ProductUpdate, ProductStatus } from "../types";

export function useProducts(
  restaurantId: string,
  params?: { page?: number; limit?: number; search?: string; category_id?: string; status?: ProductStatus }
) {
  return useQuery({
    queryKey: ["products", restaurantId, params],
    queryFn: () => productService.list(restaurantId, params),
    enabled: !!restaurantId,
  });
}

export function useProduct(restaurantId: string, id: string) {
  return useQuery({
    queryKey: ["product", restaurantId, id],
    queryFn: () => productService.getById(restaurantId, id),
    enabled: !!restaurantId && !!id,
  });
}

export function useCreateProduct(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductCreate) => productService.create(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useUpdateProduct(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      productService.update(restaurantId, id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["product", restaurantId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useDeleteProduct(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.delete(restaurantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
    },
  });
}

export function useReorderProducts(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: { id: string; display_order: number }[]) =>
      productService.reorder(restaurantId, orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
    },
  });
}

export function useUpdateProductStatus(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productService.updateStatus(restaurantId, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
    },
  });
}

export function useUploadProductImage(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      productService.uploadImage(restaurantId, id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["product", restaurantId, variables.id] });
    },
  });
}
