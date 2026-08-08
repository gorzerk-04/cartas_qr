import { apiClient } from "../lib/api-client";
import { Restaurant, QRGenerateOptions } from "../types";

export const qrService = {
  async generate(restaurantId: string, options: QRGenerateOptions): Promise<Restaurant> {
    const response = await apiClient.post(`/admin/restaurants/${restaurantId}/qr`, options);
    return response.data;
  },
};
