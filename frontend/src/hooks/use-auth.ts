"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services/auth";
import { UserLogin } from "../types";
import { getAccessToken, setAccessToken } from "../lib/api-client";
import { getErrorMessage } from "../lib/api-error";

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch current user details if token exists
  const {
    data: user,
    isLoading: isUserLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth-user"],
    queryFn: authService.getMe,
    enabled: !!getAccessToken(),
    retry: false,
  });

  // Try to silently refresh token on app mount/initial load
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        // If we don't have an access token, try to call /me or perform request which triggers interceptor refresh
        // But since interceptor refreshes automatically on 401, we can call getMe directly to trigger the refresh loop
        await refetchUser();
      } catch (err) {
        // Silent refresh failed, no active session
      } finally {
        setIsInitializing(false);
      }
    };

    silentRefresh();
  }, [refetchUser]);

  const loginMutation = useMutation({
    mutationFn: (credentials: UserLogin) => authService.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth-user"], data.user);
      router.push("/admin/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      router.push("/admin/login");
    },
  });

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading: isUserLoading || isInitializing,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error ? getErrorMessage(loginMutation.error, "Error al iniciar sesión") : null,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
