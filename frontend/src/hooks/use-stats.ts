"use client";

import { useQuery } from "@tanstack/react-query";
import { statsService } from "../services/stats";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: statsService.get,
  });
}
