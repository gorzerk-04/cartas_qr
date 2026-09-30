"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Power } from "lucide-react";
import {
  useResetUserPassword,
  useSetUserRestaurants,
  useUpdateUser,
  useUser,
} from "../../../../hooks/use-users";
import { getErrorMessage } from "../../../../lib/api-error";
import { ManagedUser, ManagedUserWithTempPassword } from "../../../../types";
import ConfirmDialog from "../../../../components/admin/confirm-dialog";
import RestaurantMultiSelect from "../../../../components/admin/restaurant-multi-select";
import TempPasswordModal from "../../../../components/admin/temp-password-modal";

const ROLE_LABEL = {
  platform_admin: "Administrador de plataforma",
  restaurant_owner: "Dueño de restaurante",
} as const;

// El formulario se monta solo cuando el usuario ya cargó, así el estado inicial sale
// directo de los datos (sin sincronizar con un efecto).
function UserDetail({ user }: { user: ManagedUser }) {
  const updateMutation = useUpdateUser();
  const restaurantsMutation = useSetUserRestaurants();
  const resetMutation = useResetUserPassword();

  const [restaurantIds, setRestaurantIds] = useState<string[]>(user.restaurants.map((r) => r.id));
  const [saved, setSaved] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tempPassword, setTempPassword] = useState<ManagedUserWithTempPassword | null>(null);

  const isAdmin = user.role === "platform_admin";
  const dirty =
    restaurantIds.length !== user.restaurants.length ||
    restaurantIds.some((id) => !user.restaurants.some((r) => r.id === id));

  const errors = [updateMutation.error, restaurantsMutation.error, resetMutation.error]
    .filter(Boolean)
    .map((e) => getErrorMessage(e, "No se pudo completar la acción"));

  const handleSaveRestaurants = async () => {
    setSaved(false);
    try {
      await restaurantsMutation.mutateAsync({ id: user.id, restaurantIds });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      // El error se muestra desde el estado de la mutation
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateMutation.mutateAsync({ id: user.id, data: { is_active: !user.is_active } });
    } catch {
      // Se muestra el 409 de protección contra bloqueo, si aplica
    }
    setConfirmToggle(false);
  };

  const handleReset = async () => {
    try {
      setTempPassword(await resetMutation.mutateAsync(user.id));
    } catch {
      // El error se muestra desde el estado de la mutation
    }
    setConfirmReset(false);
  };

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
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-white">{user.username}</h1>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
        </div>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Restaurantes actualizados. El cambio aplica en la siguiente petición del usuario.
        </div>
      )}
      {errors.map((message, i) => (
        <div key={i} role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {message}
        </div>
      ))}

      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">Rol</dt>
            <dd className="mt-1 text-gray-200">{ROLE_LABEL[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">Estado</dt>
            <dd className="mt-1 text-gray-200">
              {user.is_active ? "Activo" : "Desactivado"}
              {user.must_change_password && user.is_active && (
                <span className="ml-2 text-xs text-amber-400">(clave temporal)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">Último acceso</dt>
            <dd className="mt-1 text-gray-200">
              {user.last_login_at ? new Date(user.last_login_at).toLocaleString("es-PE") : "Nunca"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h2 className="text-sm font-medium text-gray-300">Restaurantes asignados</h2>
        {isAdmin ? (
          <p className="mt-2 text-sm text-gray-500">
            Un administrador de plataforma ve todos los restaurantes: no necesita asignaciones.
          </p>
        ) : (
          <>
            <div className="mt-3">
              <RestaurantMultiSelect
                value={restaurantIds}
                onChange={setRestaurantIds}
                disabled={restaurantsMutation.isPending}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveRestaurants}
                disabled={!dirty || restaurantsMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                {restaurantsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar asignaciones
              </button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h2 className="text-sm font-medium text-gray-300">Acceso</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            <KeyRound className="h-4 w-4" />
            Resetear contraseña
          </button>
          <button
            type="button"
            onClick={() => (user.is_active ? setConfirmToggle(true) : handleToggleActive())}
            disabled={updateMutation.isPending}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
              user.is_active
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <Power className="h-4 w-4" />
            {user.is_active ? "Desactivar usuario" : "Activar usuario"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmToggle}
        title="¿Desactivar usuario?"
        description="No podrá iniciar sesión ni usar su sesión actual. Puedes reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        isConfirming={updateMutation.isPending}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(false)}
      />
      <ConfirmDialog
        isOpen={confirmReset}
        title="¿Resetear contraseña?"
        description="Se generará una contraseña temporal nueva y la actual dejará de funcionar. El usuario deberá cambiarla al entrar."
        confirmLabel="Resetear"
        isConfirming={resetMutation.isPending}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
      <TempPasswordModal
        isOpen={!!tempPassword}
        username={tempPassword?.username ?? ""}
        tempPassword={tempPassword?.temp_password ?? ""}
        onClose={() => setTempPassword(null)}
      />
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: user, isLoading, error } = useUser(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        <p>Usuario no encontrado o error de conexión.</p>
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-[#6366F1] underline">
          Volver a la lista
        </Link>
      </div>
    );
  }

  return <UserDetail key={user.id} user={user} />;
}
