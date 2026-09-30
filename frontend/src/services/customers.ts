import { apiClient } from "../lib/api-client";
import { Customer, CustomerUpdateInput } from "../types";

export interface CustomerListResponse {
  data: Customer[];
  meta: {
    page: number;
    size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const customerService = {
  async list(
    restaurantId: string,
    params?: { page?: number; size?: number; search?: string }
  ): Promise<CustomerListResponse> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/customers`, { params });
    return response.data;
  },

  async getById(restaurantId: string, customerId: string): Promise<Customer> {
    const response = await apiClient.get(`/admin/restaurants/${restaurantId}/customers/${customerId}`);
    return response.data;
  },

  async update(restaurantId: string, customerId: string, data: CustomerUpdateInput): Promise<Customer> {
    const response = await apiClient.put(`/admin/restaurants/${restaurantId}/customers/${customerId}`, data);
    return response.data;
  },

  // Anonimiza: borra nombre, celular, email y notas; conserva visitas y canjes anónimos.
  async anonymize(restaurantId: string, customerId: string): Promise<void> {
    await apiClient.delete(`/admin/restaurants/${restaurantId}/customers/${customerId}`);
  },
};
