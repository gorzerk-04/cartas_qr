import { apiClient } from "../lib/api-client";
import { RestaurantSocial, RestaurantSocialCreate, RestaurantSocialUpdate } from "../types";

export const restaurantSocialService = {
  async list(restaurantId: string): Promise<RestaurantSocial[]> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/socials`);
    return response.data;
  },

  async create(restaurantId: string, data: RestaurantSocialCreate): Promise<RestaurantSocial> {
    const response = await apiClient.post(`/admin/restaurants/${restaurantId}/socials`, data);
    return response.data;
  },

  async update(
    restaurantId: string,
    id: string,
    data: RestaurantSocialUpdate
  ): Promise<RestaurantSocial> {
    const response = await apiClient.put(`/admin/restaurants/${restaurantId}/socials/${id}`, data);
    return response.data;
  },

  async delete(restaurantId: string, id: string): Promise<void> {
    await apiClient.delete(`/admin/restaurants/${restaurantId}/socials/${id}`);
  },
};
