"use client";

import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useRestaurants } from "../../hooks/use-restaurants";

interface RestaurantMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

// Selector múltiple de restaurantes (el admin ve todos: el backend no filtra su lista).
export default function RestaurantMultiSelect({ value, onChange, disabled }: RestaurantMultiSelectProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useRestaurants({ limit: 100, search: search || undefined });
  const restaurants = data?.data ?? [];

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="rounded-lg border border-[#2D3147] bg-[#0F1117]">
      <div className="relative border-b border-[#2D3147]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          aria-label="Buscar restaurante"
          placeholder="Buscar restaurante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
          </div>
        ) : error ? (
          <p className="p-3 text-sm text-red-400">No se pudieron cargar los restaurantes.</p>
        ) : restaurants.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">No hay restaurantes.</p>
        ) : (
          restaurants.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-300 hover:bg-[#1F2234]"
            >
              <input
                type="checkbox"
                checked={value.includes(r.id)}
                disabled={disabled}
                onChange={() => toggle(r.id)}
                className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
              />
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <code className="text-xs text-gray-500">/{r.slug}</code>
            </label>
          ))
        )}
      </div>
      <p className="border-t border-[#2D3147] px-3 py-2 text-xs text-gray-500">
        {value.length} seleccionado{value.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
