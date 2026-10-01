"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { loyaltyService } from "../services/loyalty";
import { CheckInInput, LoyaltyProgramInput } from "../types";
import { revalidatePublicMenu } from "../lib/revalidate-public-menu";

// Devuelve `null` (no error) cuando el restaurante todavía no tiene programa (404).
export function useLoyaltyProgram(restaurantId: string) {
  return useQuery({
    queryKey: ["loyalty-program", restaurantId],
    queryFn: async () => {
      try {
        return await loyaltyService.getProgram(restaurantId);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!restaurantId,
    retry: false,
  });
}

// `slug` permite revalidar la carta pública al guardar (el botón de fidelidad depende del programa).
export function useSaveLoyaltyProgram(restaurantId: string, slug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoyaltyProgramInput) => loyaltyService.saveProgram(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-program", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["customers", restaurantId] });
      revalidatePublicMenu(slug);
    },
  });
}

function useInvalidateLoyalty(restaurantId: string) {
  const queryClient = useQueryClient();
  return (customerId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["customers", restaurantId] });
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: ["customer", restaurantId, customerId] });
      queryClient.invalidateQueries({ queryKey: ["visits", restaurantId, customerId] });
      queryClient.invalidateQueries({ queryKey: ["redemptions", restaurantId, customerId] });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };
}

export function useCheckIn(restaurantId: string) {
  const invalidate = useInvalidateLoyalty(restaurantId);
  return useMutation({
    mutationFn: (data: CheckInInput) => loyaltyService.checkIn(restaurantId, data),
    onSuccess: (result) => invalidate(result.customer.id),
  });
}

export function useVisits(restaurantId: string, customerId: string) {
  return useQuery({
    queryKey: ["visits", restaurantId, customerId],
    queryFn: () => loyaltyService.listVisits(restaurantId, customerId),
    enabled: !!restaurantId && !!customerId,
  });
}

export function useRedemptions(restaurantId: string, customerId: string) {
  return useQuery({
    queryKey: ["redemptions", restaurantId, customerId],
    queryFn: () => loyaltyService.listRedemptions(restaurantId, customerId),
    enabled: !!restaurantId && !!customerId,
  });
}

export function useVoidVisit(restaurantId: string, customerId: string) {
  const invalidate = useInvalidateLoyalty(restaurantId);
  return useMutation({
    mutationFn: ({ visitId, reason }: { visitId: string; reason: string }) =>
      loyaltyService.voidVisit(restaurantId, visitId, reason),
    onSuccess: () => invalidate(customerId),
  });
}

export function useRedeem(restaurantId: string) {
  const invalidate = useInvalidateLoyalty(restaurantId);
  return useMutation({
    mutationFn: (customerId: string) => loyaltyService.redeem(restaurantId, customerId),
    onSuccess: (_data, customerId) => invalidate(customerId),
  });
}

export function useVoidRedemption(restaurantId: string, customerId: string) {
  const invalidate = useInvalidateLoyalty(restaurantId);
  return useMutation({
    mutationFn: ({ redemptionId, reason }: { redemptionId: string; reason: string }) =>
      loyaltyService.voidRedemption(restaurantId, redemptionId, reason),
    onSuccess: () => invalidate(customerId),
  });
}
