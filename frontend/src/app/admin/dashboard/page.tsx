"use client";

import React from "react";
import { useAuth } from "../../../hooks/use-auth";
import { useAdminStats } from "../../../hooks/use-stats";
import {
  UtensilsCrossed,
  TrendingUp,
  Eye,
  QrCode,
  Users,
  Footprints,
  Gift,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, can, restaurants } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  // Un dueño con un solo restaurante va directo a sus comensales; el resto, a la lista
  const customersHref =
    restaurants.length === 1 ? `/admin/restaurants/${restaurants[0].id}/customers` : "/admin/restaurants";

  const statCards = [
    {
      label: "Restaurantes",
      value: statsLoading ? "…" : String(stats?.total_restaurants ?? 0),
      icon: UtensilsCrossed,
      color: "#6366F1",
      href: "/admin/restaurants",
    },
    {
      label: "Publicados",
      value: statsLoading ? "…" : String(stats?.published_restaurants ?? 0),
      icon: Eye,
      color: "#10B981",
      href: "/admin/restaurants?is_published=true",
    },
    {
      label: "Vistas de la carta (próximamente)",
      value: "—",
      icon: TrendingUp,
      color: "#F59E0B",
      href: "#",
      title: "El análisis de vistas de la carta todavía no está disponible (planeado post-MVP)",
    },
    ...(can("manageQr") ? [{
      label: "QR Generados",
      value: statsLoading ? "…" : String(stats?.qr_generated_count ?? 0),
      icon: QrCode,
      color: "#EC4899",
      href: "/admin/qr",
    }] : []),
    {
      label: "Comensales",
      value: statsLoading ? "…" : String(stats?.customers_total ?? 0),
      icon: Users,
      color: "#06B6D4",
      href: customersHref,
    },
    {
      label: "Visitas al local (mes)",
      value: statsLoading ? "…" : String(stats?.loyalty_visits_month ?? 0),
      icon: Footprints,
      color: "#8B5CF6",
      href: customersHref,
      title: "Visitas registradas en caja este mes (sin las anuladas)",
    },
    {
      label: "Canjes (mes)",
      value: statsLoading ? "…" : String(stats?.loyalty_redemptions_month ?? 0),
      icon: Gift,
      color: "#10B981",
      href: customersHref,
      title: "Recompensas canjeadas este mes (sin las anuladas)",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Bienvenido de vuelta,{" "}
            <span className="text-[#6366F1] font-medium">
              {user?.username || "admin"}
            </span>
          </p>
        </div>
        {can("createRestaurant") && (
          <Link
            href="/admin/restaurants/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4F46E5] transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Restaurante
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            title={stat.title}
            className="group relative overflow-hidden rounded-xl border border-[#2D3147] bg-[#1A1D27] p-5 transition-all hover:border-[#3D4167] hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {stat.value}
                </p>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-gray-500 group-hover:text-gray-300 transition">
              <span>Ver detalle</span>
              <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
            {/* Subtle gradient glow on hover */}
            <div
              className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-20"
              style={{ backgroundColor: stat.color }}
            />
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h2 className="text-lg font-semibold text-white">Acciones rápidas</h2>
        <p className="mt-1 text-sm text-gray-400">
          {can("createRestaurant")
            ? "Comienza creando tu primer restaurante para generar su carta QR."
            : "Gestiona la carta, los comensales y la fidelización de tu restaurante."}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {can("createRestaurant") && (
            <Link
              href="/admin/restaurants/new"
              className="flex items-center gap-3 rounded-lg border border-dashed border-[#2D3147] p-4 text-sm text-gray-400 hover:border-[#6366F1] hover:text-[#6366F1] transition"
            >
              <UtensilsCrossed className="h-5 w-5" />
              <span>Crear restaurante</span>
            </Link>
          )}
          <Link
            href="/admin/restaurants"
            className="flex items-center gap-3 rounded-lg border border-dashed border-[#2D3147] p-4 text-sm text-gray-400 hover:border-[#10B981] hover:text-[#10B981] transition"
          >
            <Eye className="h-5 w-5" />
            <span>Ver restaurantes</span>
          </Link>
          {can("manageQr") && (
            <Link
              href="/admin/qr"
              className="flex items-center gap-3 rounded-lg border border-dashed border-[#2D3147] p-4 text-sm text-gray-400 hover:border-[#EC4899] hover:text-[#EC4899] transition"
            >
              <QrCode className="h-5 w-5" />
              <span>Gestionar QR</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
