import { apiClient } from "../lib/api-client";
import { Restaurant, RestaurantCreate, RestaurantUpdate } from "../types";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const restaurantService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    is_published?: boolean;
  }): Promise<PaginatedResponse<Restaurant>> {
    const response = await apiClient.get("/admin/restaurants", { params });
    return response.data;
  },

  async getById(id: string): Promise<Restaurant> {
    const response = await apiClient.get(`/admin/restaurants/${id}`);
    return response.data;
  },

  async create(data: RestaurantCreate): Promise<Restaurant> {
    const response = await apiClient.post("/admin/restaurants", data);
    return response.data;
  },

  async update(id: string, data: RestaurantUpdate): Promise<Restaurant> {
    const response = await apiClient.put(`/admin/restaurants/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/admin/restaurants/${id}`);
  },

  async uploadLogo(id: string, file: File): Promise<Restaurant> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(`/admin/restaurants/${id}/logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async uploadCover(id: string, file: File): Promise<Restaurant> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(`/admin/restaurants/${id}/cover`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
