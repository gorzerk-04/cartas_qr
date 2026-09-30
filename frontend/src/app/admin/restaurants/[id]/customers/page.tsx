"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Gift, Loader2, Search, Users } from "lucide-react";
import { useCustomers } from "../../../../../hooks/use-customers";
import { formatDateTime } from "../../../../../lib/dates";
import { Customer } from "../../../../../types";

function Balance({ customer }: { customer: Customer }) {
  const required = customer.visits_required;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium text-white">
        {customer.visits_balance}
        {required ? ` / ${required}` : ""}
      </span>
      {customer.reward_available && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <Gift className="h-3 w-3" />
          Premio
        </span>
      )}
    </span>
  );
}

export default function CustomersPage() {
  const params = useParams();
  const id = params.id as string;

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  // Espera a que el usuario termine de escribir antes de consultar
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useCustomers(id, { page, size: 20, search: debounced || undefined });
  const customers = data?.data ?? [];
  const meta = data?.meta;
  const base = `/admin/restaurants/${id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-400">Comensales registrados en el programa de fidelización.</p>
        <Link
          href={`${base}/check-in`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] transition"
        >
          Registrar visita
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          aria-label="Buscar comensal"
          placeholder="Buscar por nombre o celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
          Error al cargar los comensales. Intenta de nuevo.
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2D3147] bg-[#1A1D27] py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366F1]/10">
            <Users className="h-8 w-8 text-[#6366F1]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            {debounced ? "Sin resultados" : "Todavía no hay comensales"}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {debounced
              ? "No hay comensales que coincidan con la búsqueda."
              : "Aparecerán aquí cuando registres su primera visita."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-[#2D3147] bg-[#1A1D27] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D3147] bg-[#13151E]">
                  {["Comensal", "Celular", "Saldo", "Última visita"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3147]">
                {customers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#1F2234]">
                    <td className="px-4 py-3">
                      <Link href={`${base}/customers/${c.id}`} className="font-medium text-white hover:text-[#6366F1]">
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">{c.phone}</td>
                    <td className="px-4 py-3">
                      <Balance customer={c} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(c.last_visit_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`${base}/customers/${c.id}`}
                className="block rounded-xl border border-[#2D3147] bg-[#1A1D27] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.full_name}</p>
                    <p className="font-mono text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <Balance customer={c} />
                </div>
                <p className="mt-2 text-xs text-gray-500">Última visita: {formatDateTime(c.last_visit_at)}</p>
              </Link>
            ))}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Mostrando {customers.length} de {meta.total} comensales
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
