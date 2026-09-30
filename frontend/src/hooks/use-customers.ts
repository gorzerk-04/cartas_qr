"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../services/customers";
import { CustomerUpdateInput } from "../types";

export function useCustomers(restaurantId: string, params?: { page?: number; size?: number; search?: string }) {
  return useQuery({
    queryKey: ["customers", restaurantId, params],
    queryFn: () => customerService.list(restaurantId, params),
    enabled: !!restaurantId,
  });
}

export function useCustomer(restaurantId: string, customerId: string) {
  return useQuery({
    queryKey: ["customer", restaurantId, customerId],
    queryFn: () => customerService.getById(restaurantId, customerId),
    enabled: !!restaurantId && !!customerId,
    retry: false,
  });
}

export function useUpdateCustomer(restaurantId: string, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerUpdateInput) => customerService.update(restaurantId, customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", restaurantId, customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers", restaurantId] });
    },
  });
}

export function useAnonymizeCustomer(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => customerService.anonymize(restaurantId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
