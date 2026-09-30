import { apiClient, setAccessToken } from "../lib/api-client";
import { ChangePasswordInput, UserLogin } from "../types";

export const authService = {
  async login(credentials: UserLogin) {
    const response = await apiClient.post("/auth/login", credentials);
    const accessToken = response.data?.data?.access_token;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return response.data?.data;
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async changePassword(data: ChangePasswordInput) {
    await apiClient.post("/auth/change-password", data);
  },

  async getMe() {
    const response = await apiClient.get("/auth/me");
    return response.data?.data;
  },
};
