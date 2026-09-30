"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCreateUser } from "../../../../hooks/use-users";
import { getErrorMessage } from "../../../../lib/api-error";
import { ManagedUserWithTempPassword, UserRole } from "../../../../types";
import RestaurantMultiSelect from "../../../../components/admin/restaurant-multi-select";
import TempPasswordModal from "../../../../components/admin/temp-password-modal";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

export default function NewUserPage() {
  const router = useRouter();
  const createMutation = useCreateUser();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("restaurant_owner");
  const [restaurantIds, setRestaurantIds] = useState<string[]>([]);
  const [created, setCreated] = useState<ManagedUserWithTempPassword | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createMutation.mutateAsync({
        email: email.trim(),
        username: username.trim(),
        role,
        // Un administrador ve todo: no se le asignan restaurantes
        restaurant_ids: role === "restaurant_owner" ? restaurantIds : [],
      });
      setCreated(result);
    } catch {
      // El error se muestra desde el estado de la mutation
    }
  };

  const apiError = createMutation.error
    ? getErrorMessage(createMutation.error, "No se pudo crear el usuario")
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          aria-label="Volver a usuarios"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2D3147] text-gray-400 hover:bg-[#1F2234] hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white">Nuevo usuario</h1>
      </div>

      {apiError && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300">
            Rol
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={inputClass}
          >
            <option value="restaurant_owner">Dueño de restaurante</option>
            <option value="platform_admin">Administrador de plataforma</option>
          </select>
          {role === "platform_admin" && (
            <p className="mt-1 text-xs text-amber-400">
              Un administrador ve y gestiona todos los restaurantes y usuarios.
            </p>
          )}
        </div>

        {role === "restaurant_owner" && (
          <div>
            <span className="block text-sm font-medium text-gray-300">Restaurantes asignados</span>
            <div className="mt-1">
              <RestaurantMultiSelect value={restaurantIds} onChange={setRestaurantIds} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/users"
            className="rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear usuario
          </button>
        </div>
      </form>

      <TempPasswordModal
        isOpen={!!created}
        username={created?.username ?? ""}
        tempPassword={created?.temp_password ?? ""}
        onClose={() => {
          const id = created?.id;
          setCreated(null);
          router.push(id ? `/admin/users/${id}` : "/admin/users");
        }}
      />
    </div>
  );
}
