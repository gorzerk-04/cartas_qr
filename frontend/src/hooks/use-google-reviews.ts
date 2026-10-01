"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { googleReviewService } from "../services/google-reviews";
import { GoogleReviewSettingsInput } from "../types";
import { revalidatePublicMenu } from "../lib/revalidate-public-menu";

export function useResolveGoogleReview() {
  return useMutation({
    mutationFn: (mapsUrl: string) => googleReviewService.resolve(mapsUrl),
  });
}

export function useGoogleReviewSettings(restaurantId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["google-review", restaurantId],
    queryFn: () => googleReviewService.getSettings(restaurantId as string),
    enabled: !!restaurantId && enabled,
    retry: false,
  });
}

// `slug` permite revalidar la carta pública al guardar (el botón de reseña depende del enlace).
export function useSaveGoogleReviewSettings(restaurantId: string | null, slug?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GoogleReviewSettingsInput) =>
      googleReviewService.saveSettings(restaurantId as string, data),
    onSuccess: (settings) => {
      queryClient.setQueryData(["google-review", restaurantId], settings);
      revalidatePublicMenu(slug);
    },
  });
}
