import { apiClient } from "../lib/api-client";
import {
  ManagedUser,
  ManagedUserWithTempPassword,
  UserCreateInput,
  UserRole,
  UserUpdateInput,
} from "../types";
import { PaginatedResponse } from "./restaurants";

export const userService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
  }): Promise<PaginatedResponse<ManagedUser>> {
    const response = await apiClient.get("/admin/users", { params });
    return response.data;
  },

  async getById(id: string): Promise<ManagedUser> {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  async create(data: UserCreateInput): Promise<ManagedUserWithTempPassword> {
    const response = await apiClient.post("/admin/users", data);
    return response.data;
  },

  async update(id: string, data: UserUpdateInput): Promise<ManagedUser> {
    const response = await apiClient.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  async setRestaurants(id: string, restaurantIds: string[]): Promise<ManagedUser> {
    const response = await apiClient.put(`/admin/users/${id}/restaurants`, {
      restaurant_ids: restaurantIds,
    });
    return response.data;
  },

  async resetPassword(id: string): Promise<ManagedUserWithTempPassword> {
    const response = await apiClient.post(`/admin/users/${id}/reset-password`);
    return response.data;
  },
};
