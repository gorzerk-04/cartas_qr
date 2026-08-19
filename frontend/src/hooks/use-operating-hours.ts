"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operatingHoursService } from "../services/operating-hours";
import { OperatingHourInput } from "../types";
import { revalidatePublicMenu } from "../lib/revalidate-public-menu";

export function useOperatingHours(restaurantId: string) {
  return useQuery({
    queryKey: ["operating-hours", restaurantId],
    queryFn: () => operatingHoursService.get(restaurantId),
    enabled: !!restaurantId,
  });
}

export function useUpdateOperatingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      hours,
    }: {
      restaurantId: string;
      // El slug se recibe solo para invalidar la cache de la carta pública, donde el
      // horario decide si se muestra "Abierto ahora".
      slug?: string;
      hours: OperatingHourInput[];
    }) => operatingHoursService.update(restaurantId, hours),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["operating-hours", variables.restaurantId],
      });
      revalidatePublicMenu(variables.slug);
    },
  });
}
