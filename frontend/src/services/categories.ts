import { apiClient } from "../lib/api-client";
import { Category, CategoryCreate, CategoryUpdate } from "../types";

export const categoryService = {
  async list(restaurantId: string, params?: { is_active?: boolean }): Promise<Category[]> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/categories`, { params });
    return response.data;
  },

  async getById(restaurantId: string, id: string): Promise<Category> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/categories/${id}`);
    return response.data;
  },

  async create(restaurantId: string, data: CategoryCreate): Promise<Category> {
    const response = await apiClient.post(`/admin/restaurants/${restaurantId}/categories`, data);
    return response.data;
  },

  async update(restaurantId: string, id: string, data: CategoryUpdate): Promise<Category> {
    const response = await apiClient.put(`/admin/restaurants/${restaurantId}/categories/${id}`, data);
    return response.data;
  },

  async delete(restaurantId: string, id: string): Promise<void> {
    await apiClient.delete(`/admin/restaurants/${restaurantId}/categories/${id}`);
  },

  async reorder(
    restaurantId: string,
    orders: { id: string; display_order: number }[]
  ): Promise<void> {
    await apiClient.patch(`/admin/restaurants/${restaurantId}/categories/reorder`, { orders });
  },

  async uploadImage(restaurantId: string, id: string, file: File): Promise<Category> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/admin/restaurants/${restaurantId}/categories/${id}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },
};
