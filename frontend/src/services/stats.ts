import { apiClient } from "../lib/api-client";
import { AdminStats } from "../types";

export const statsService = {
  async get(): Promise<AdminStats> {
    const response = await apiClient.get("/admin/stats");
    return response.data;
  },
};
