import { apiClient } from "../lib/api-client";
import { GoogleReviewResolveResult, GoogleReviewSettings, GoogleReviewSettingsInput } from "../types";

// Solo admin de plataforma: el backend responde 403 a cualquier otro rol.
export const googleReviewService = {
  async resolve(mapsUrl: string): Promise<GoogleReviewResolveResult> {
    const response = await apiClient.post("/admin/google-review/resolve", { maps_url: mapsUrl });
    return response.data;
  },

  async getSettings(restaurantId: string): Promise<GoogleReviewSettings> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/google-review`);
    return response.data;
  },

  async saveSettings(restaurantId: string, data: GoogleReviewSettingsInput): Promise<GoogleReviewSettings> {
    const response = await apiClient.put(`/admin/restaurants/${restaurantId}/google-review`, data);
    return response.data;
  },
};
