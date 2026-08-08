import { apiClient } from "../lib/api-client";
import { Product, ProductCreate, ProductUpdate, ProductStatus } from "../types";
import { PaginatedResponse } from "./restaurants";

export const productService = {
  async list(
    restaurantId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      category_id?: string;
      status?: ProductStatus;
    }
  ): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/products`, { params });
    return response.data;
  },

  async getById(restaurantId: string, id: string): Promise<Product> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/products/${id}`);
    return response.data;
  },

  async create(restaurantId: string, data: ProductCreate): Promise<Product> {
    const response = await apiClient.post(`/admin/restaurants/${restaurantId}/products`, data);
    return response.data;
  },

  async update(restaurantId: string, id: string, data: ProductUpdate): Promise<Product> {
    const response = await apiClient.put(`/admin/restaurants/${restaurantId}/products/${id}`, data);
    return response.data;
  },

  async delete(restaurantId: string, id: string): Promise<void> {
    await apiClient.delete(`/admin/restaurants/${restaurantId}/products/${id}`);
  },

  async reorder(
    restaurantId: string,
    orders: { id: string; display_order: number }[]
  ): Promise<void> {
    await apiClient.patch(`/admin/restaurants/${restaurantId}/products/reorder`, { orders });
  },

  async updateStatus(restaurantId: string, id: string, status: ProductStatus): Promise<Product> {
    const response = await apiClient.patch(`/admin/restaurants/${restaurantId}/products/${id}/status`, {
      status,
    });
    return response.data;
  },

  async uploadImage(restaurantId: string, id: string, file: File): Promise<Product> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/admin/restaurants/${restaurantId}/products/${id}/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },
};
