"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRestaurants } from "../../../hooks/use-restaurants";
import { QrCode, Search, Loader2, UtensilsCrossed, ArrowRight } from "lucide-react";

export default function AdminQrPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useRestaurants({
    page,
    limit: 20,
    search: search || undefined,
  });

  const restaurants = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Códigos QR</h1>
        <p className="mt-1 text-sm text-gray-400">
          Todos los restaurantes y el estado de su código QR
        </p>
      </div>

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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar los restaurantes. Intenta de nuevo.
        </div>
      ) : restaurants.length === 0 ? (
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
              : "Crea un restaurante para poder generar su código QR"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/admin/restaurants/${restaurant.id}/qr`}
                className="group flex items-center gap-4 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-4 transition-all hover:border-[#3D4167] hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#2D3147] bg-white">
                  {restaurant.qr_url ? (
                    <img
                      src={restaurant.qr_url}
                      alt={`QR de ${restaurant.name}`}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <QrCode className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{restaurant.name}</p>
                  <p className="truncate text-xs text-gray-500">/menu/{restaurant.slug}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      restaurant.qr_url
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}
                  >
                    {restaurant.qr_url ? "Generado" : "Sin generar"}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-gray-400" />
              </Link>
            ))}
          </div>

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
    </div>
  );
}
