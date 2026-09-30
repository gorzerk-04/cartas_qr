import { apiClient } from "../lib/api-client";
import {
  CheckInInput,
  CheckInResult,
  LoyaltyProgram,
  LoyaltyProgramInput,
  LoyaltyRedemption,
  LoyaltyVisit,
} from "../types";

const base = (restaurantId: string) => `/admin/restaurants/${restaurantId}`;

export const loyaltyService = {
  // 404 si el restaurante todavía no configuró su programa
  async getProgram(restaurantId: string): Promise<LoyaltyProgram> {
    const response = await apiClient.get(`${base(restaurantId)}/loyalty/program`);
    return response.data;
  },

  async saveProgram(restaurantId: string, data: LoyaltyProgramInput): Promise<LoyaltyProgram> {
    const response = await apiClient.put(`${base(restaurantId)}/loyalty/program`, data);
    return response.data;
  },

  async checkIn(restaurantId: string, data: CheckInInput): Promise<CheckInResult> {
    const response = await apiClient.post(`${base(restaurantId)}/loyalty/check-in`, data);
    return response.data;
  },

  async listVisits(restaurantId: string, customerId: string): Promise<LoyaltyVisit[]> {
    const response = await apiClient.get(`${base(restaurantId)}/customers/${customerId}/visits`);
    return response.data.data;
  },

  async voidVisit(restaurantId: string, visitId: string, reason: string): Promise<LoyaltyVisit> {
    const response = await apiClient.post(`${base(restaurantId)}/loyalty/visits/${visitId}/void`, { reason });
    return response.data;
  },

  async listRedemptions(restaurantId: string, customerId: string): Promise<LoyaltyRedemption[]> {
    const response = await apiClient.get(`${base(restaurantId)}/customers/${customerId}/redemptions`);
    return response.data.data;
  },

  async redeem(restaurantId: string, customerId: string): Promise<LoyaltyRedemption> {
    const response = await apiClient.post(`${base(restaurantId)}/customers/${customerId}/redemptions`);
    return response.data;
  },

  async voidRedemption(restaurantId: string, redemptionId: string, reason: string): Promise<LoyaltyRedemption> {
    const response = await apiClient.post(`${base(restaurantId)}/loyalty/redemptions/${redemptionId}/void`, { reason });
    return response.data;
  },
};
