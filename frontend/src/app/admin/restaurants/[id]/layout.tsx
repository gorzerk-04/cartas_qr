"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { useRestaurant } from "../../../../hooks/use-restaurants";

export default function RestaurantDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;

  const { data: restaurant } = useRestaurant(id);

  const tabs = [
    { label: "Info General", href: `/admin/restaurants/${id}` },
    { label: "Categorías", href: `/admin/restaurants/${id}/categories` },
    { label: "Productos", href: `/admin/restaurants/${id}/products` },
    { label: "Código QR", href: `/admin/restaurants/${id}/qr` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/restaurants"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2D3147] text-gray-400 hover:bg-[#1F2234] hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {restaurant ? restaurant.name : "Cargando..."}
            </h1>
            {restaurant && (
              <p className="mt-0.5 text-xs text-gray-400 font-mono">
                /menu/{restaurant.slug}
              </p>
            )}
          </div>
        </div>
        {restaurant && (
          <a
            href={`/menu/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#2D3147] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1F2234] hover:text-white transition"
          >
            <Eye className="h-4 w-4 text-[#6366F1]" />
            Ver carta pública
          </a>
        )}
      </div>

      <div className="border-b border-[#2D3147]">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                  isActive
                    ? "border-[#6366F1] text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
