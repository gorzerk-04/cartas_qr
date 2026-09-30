"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services/auth";
import { ChangePasswordInput, User, UserLogin } from "../types";
import { getAccessToken, setAccessToken } from "../lib/api-client";
import { getErrorMessage } from "../lib/api-error";
import { can, isPlatformAdmin, landingPath } from "../lib/permissions";

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
  } = useQuery<User>({
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
    onSuccess: async (data) => {
      // La respuesta del login no trae los restaurantes asignados: /me sí.
      let me: User = data.user;
      try {
        me = await authService.getMe();
      } catch {
        // Si /me falla se usa el usuario del login; el layout volverá a consultarlo
      }
      queryClient.setQueryData(["auth-user"], me);
      router.push(landingPath(me));
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

  const currentUser = user || null;

  return {
    user: currentUser,
    isAuthenticated: !!user,
    isLoading: isUserLoading || isInitializing,
    role: currentUser?.role ?? null,
    isPlatformAdmin: isPlatformAdmin(currentUser),
    restaurants: currentUser?.restaurants ?? [],
    mustChangePassword: !!currentUser?.must_change_password,
    can: (action: Parameters<typeof can>[1]) => can(currentUser, action),
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error ? getErrorMessage(loginMutation.error, "Error al iniciar sesión") : null,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: ChangePasswordInput) => authService.changePassword(data),
    onSuccess: async () => {
      // Refresca /me (must_change_password pasa a false) y entra al panel
      const me = await authService.getMe();
      queryClient.setQueryData(["auth-user"], me);
      router.replace(landingPath(me));
    },
  });
}
