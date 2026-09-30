"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../../hooks/use-auth";
import { Eye, EyeOff, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { landingPath } from "../../../lib/permissions";

function LoginForm() {
  const { login, isLoggingIn, loginError, isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con las props/datos cargados
      setSessionExpired(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(landingPath(user));
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      await login({ username, password });
    } catch (err) {
      // Handled by hook error state
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0F1117]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F1117] px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative Blob Gradients */}
      <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[#6366F1] opacity-10 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#F59E0B] opacity-10 blur-3xl" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1]/10 text-[#6366F1]">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            MenuQR
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Panel Administrativo
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#2D3147] bg-[#1A1D27] p-8 shadow-xl backdrop-blur-sm">
          {sessionExpired && (
            <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400 border border-amber-500/20">
              Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
            </div>
          )}

          {loginError && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {loginError}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                Usuario
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] py-2.5 pl-10 pr-3 text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] sm:text-sm"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] py-2.5 pl-10 pr-10 text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] sm:text-sm"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex w-full justify-center rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#0F1117]">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
