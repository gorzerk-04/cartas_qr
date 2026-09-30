"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { useUsers } from "../../../hooks/use-users";
import { ManagedUser, UserRole } from "../../../types";

const ROLE_LABEL: Record<UserRole, string> = {
  platform_admin: "Administrador",
  restaurant_owner: "Dueño",
};

function StatusBadge({ user }: { user: ManagedUser }) {
  if (!user.is_active) {
    return (
      <span className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        Desactivado
      </span>
    );
  }
  if (user.must_change_password) {
    return (
      <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
        Clave temporal
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
      Activo
    </span>
  );
}

function RestaurantsCell({ user }: { user: ManagedUser }) {
  if (user.role === "platform_admin") return <span className="text-gray-500">Todos</span>;
  if (user.restaurants.length === 0) return <span className="text-gray-500">Ninguno</span>;
  return <span className="text-gray-300">{user.restaurants.map((r) => r.name).join(", ")}</span>;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: role || undefined,
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-400">
            Administra quién puede entrar al panel y qué restaurantes gestiona
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por usuario o email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          />
        </div>
        <select
          aria-label="Filtrar por rol"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole | "");
            setPage(1);
          }}
          className="rounded-lg border border-[#2D3147] bg-[#1A1D27] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
        >
          <option value="">Todos los roles</option>
          <option value="platform_admin">Administradores</option>
          <option value="restaurant_owner">Dueños</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar los usuarios. Intenta de nuevo.
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2D3147] bg-[#1A1D27] py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
            <Users className="h-8 w-8 text-[#6366F1]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Sin resultados</h3>
          <p className="mt-1 text-sm text-gray-400">No hay usuarios que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-[#2D3147] bg-[#1A1D27] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D3147] bg-[#13151E]">
                  {["Usuario", "Rol", "Restaurantes", "Estado"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3147]">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-[#1F2234]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-white hover:text-[#6366F1]">
                        {u.username}
                      </Link>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <RestaurantsCell user={u} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="block rounded-xl border border-[#2D3147] bg-[#1A1D27] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{u.username}</p>
                    <p className="truncate text-xs text-gray-500">{u.email}</p>
                  </div>
                  <StatusBadge user={u} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {ROLE_LABEL[u.role]} · <RestaurantsCell user={u} />
                </p>
              </Link>
            ))}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Mostrando {users.length} de {meta.total} usuarios
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.has_prev}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  Anterior
                </button>
                <span className="flex items-center px-3 text-sm text-gray-400">
                  {page} / {meta.total_pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.has_next}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
