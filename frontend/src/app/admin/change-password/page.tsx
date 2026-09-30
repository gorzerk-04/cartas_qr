"use client";

import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth, useChangePassword } from "../../../hooks/use-auth";
import { getErrorMessage } from "../../../lib/api-error";

const MIN_LENGTH = 10;

export default function ChangePasswordPage() {
  const { user, mustChangePassword } = useAuth();
  const changeMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (newPassword.length < MIN_LENGTH) {
      setLocalError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword === currentPassword) {
      setLocalError("La nueva contraseña debe ser distinta de la actual.");
      return;
    }

    try {
      await changeMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch {
      // El error se muestra desde el estado de la mutation
    }
  };

  const apiError = changeMutation.error
    ? getErrorMessage(changeMutation.error, "No se pudo cambiar la contraseña")
    : null;
  const error = localError || apiError;

  const inputClass =
    "mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1117] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366F1]/10 text-[#6366F1]">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Cambiar contraseña</h1>
          <p className="mt-2 text-sm text-gray-400">
            {mustChangePassword
              ? "Tu contraseña es temporal. Elige una nueva para continuar."
              : `Actualiza la contraseña de ${user?.username ?? "tu cuenta"}.`}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-300">
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-300">
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">Mínimo {MIN_LENGTH} caracteres.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={changeMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
          >
            {changeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
