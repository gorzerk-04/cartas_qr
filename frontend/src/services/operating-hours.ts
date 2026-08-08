import { apiClient } from "../lib/api-client";
import { OperatingHour, OperatingHourInput } from "../types";

export const operatingHoursService = {
  async get(restaurantId: string): Promise<OperatingHour[]> {
    const response = await apiClient.get(
      `/admin/restaurants/${restaurantId}/hours`
    );
    return response.data;
  },

  async update(
    restaurantId: string,
    hours: OperatingHourInput[]
  ): Promise<OperatingHour[]> {
    const response = await apiClient.put(
      `/admin/restaurants/${restaurantId}/hours`,
      { hours }
    );
    return response.data;
  },
};
