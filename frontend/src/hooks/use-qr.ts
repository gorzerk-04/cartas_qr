"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qrService } from "../services/qr";
import { QRGenerateOptions } from "../types";

export function useGenerateQR(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options: QRGenerateOptions) => qrService.generate(restaurantId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
    },
  });
}
