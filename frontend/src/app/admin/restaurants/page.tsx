"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useRestaurants,
  useDeleteRestaurant,
} from "../../../hooks/use-restaurants";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  UtensilsCrossed,
  ExternalLink,
} from "lucide-react";
import { Restaurant } from "../../../types";
import ConfirmDialog from "../../../components/admin/confirm-dialog";
import { useEscapeKey } from "../../../hooks/use-escape-key";

function ActionsMenu({
  restaurant,
  openMenu,
  setOpenMenu,
  onDeleteRequest,
}: {
  restaurant: Restaurant;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  onDeleteRequest: () => void;
}) {
  const isOpen = openMenu === restaurant.id;
  useEscapeKey(() => setOpenMenu(null), isOpen);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpenMenu(isOpen ? null : restaurant.id)}
        aria-label={`Acciones para ${restaurant.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="rounded-md p-1 text-gray-400 hover:bg-[#2D3147] hover:text-white transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpenMenu(null)}
          />
          <div role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-[#2D3147] bg-[#1A1D27] py-1 shadow-xl">
            <Link
              href={`/admin/restaurants/${restaurant.id}`}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1F2234] hover:text-white"
              onClick={() => setOpenMenu(null)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <a
              href={`/menu/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1F2234] hover:text-white"
              onClick={() => setOpenMenu(null)}
            >
              <ExternalLink className="h-4 w-4" />
              Ver carta
            </a>
            <button
              role="menuitem"
              onClick={() => {
                onDeleteRequest();
                setOpenMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RestaurantsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data, isLoading, error } = useRestaurants({
    page,
    limit: 20,
    search: search || undefined,
  });

  const deleteMutation = useDeleteRestaurant();

  const restaurants = data?.data || [];
  const meta = data?.meta;

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err) {
      // Error handled by React Query
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Restaurantes
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Gestiona los restaurantes y sus cartas digitales
          </p>
        </div>
        <Link
          href="/admin/restaurants/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Restaurante
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar los restaurantes. Intenta de nuevo.
        </div>
      ) : restaurants.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2D3147] bg-[#1A1D27] py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
            <UtensilsCrossed className="h-8 w-8 text-[#6366F1]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {search ? "Sin resultados" : "No hay restaurantes todavía"}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {search
              ? `No se encontraron restaurantes para "${search}"`
              : "Comienza creando tu primer restaurante"}
          </p>
          {!search && (
            <Link
              href="/admin/restaurants/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] transition"
            >
              <Plus className="h-4 w-4" />
              Crear el primero
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Restaurants Table — desktop/tablet (>=768px) */}
          <div className="hidden rounded-xl border border-[#2D3147] bg-[#1A1D27] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D3147] bg-[#13151E]">
                  <th className="rounded-tl-xl px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Restaurante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Publicado
                  </th>
                  <th className="rounded-tr-xl px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3147]">
                {restaurants.map((restaurant: Restaurant) => (
                  <tr
                    key={restaurant.id}
                    className="transition-colors hover:bg-[#1F2234]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{
                            backgroundColor: restaurant.primary_color,
                          }}
                        >
                          {restaurant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {restaurant.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {restaurant.city || "Sin ciudad"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-[#0F1117] px-2 py-0.5 text-xs text-[#6366F1]">
                        /menu/{restaurant.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          restaurant.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            restaurant.is_active
                              ? "bg-emerald-400"
                              : "bg-red-400"
                          }`}
                        />
                        {restaurant.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {restaurant.is_published ? (
                        <Eye className="mx-auto h-4 w-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="mx-auto h-4 w-4 text-gray-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionsMenu
                        restaurant={restaurant}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        onDeleteRequest={() => setDeleteConfirm(restaurant.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Restaurant Cards — mobile (<768px) */}
          <div className="space-y-3 md:hidden">
            {restaurants.map((restaurant: Restaurant) => (
              <div
                key={restaurant.id}
                className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: restaurant.primary_color }}
                    >
                      {restaurant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{restaurant.name}</p>
                      <code className="text-xs text-[#6366F1]">/menu/{restaurant.slug}</code>
                    </div>
                  </div>
                  <ActionsMenu
                    restaurant={restaurant}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                    onDeleteRequest={() => setDeleteConfirm(restaurant.id)}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      restaurant.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        restaurant.is_active ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    {restaurant.is_active ? "Activo" : "Inactivo"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    {restaurant.is_published ? (
                      <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    {restaurant.is_published ? "Publicado" : "Sin publicar"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Mostrando {restaurants.length} de {meta.total} restaurantes
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!meta.has_prev}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Anterior
                </button>
                <span className="flex items-center px-3 text-sm text-gray-400">
                  {page} / {meta.total_pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!meta.has_next}
                  className="rounded-lg border border-[#2D3147] px-3 py-1.5 text-sm text-gray-400 hover:bg-[#1F2234] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="¿Eliminar restaurante?"
        description="Esta acción no se puede deshacer. El restaurante y su carta digital dejarán de estar disponibles."
        isConfirming={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
