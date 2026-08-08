"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRestaurant } from "../../../../hooks/use-restaurants";
import { RestaurantCreate } from "../../../../types";
import { getErrorMessage } from "../../../../lib/api-error";
import { omitEmptyStrings } from "../../../../lib/forms";
import {
  ArrowLeft,
  Loader2,
  UtensilsCrossed,
  Palette,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export default function NewRestaurantPage() {
  const router = useRouter();
  const createMutation = useCreateRestaurant();

  const [form, setForm] = useState<RestaurantCreate>({
    name: "",
    slug: "",
    description: "",
    primary_color: "#FF6B35",
    secondary_color: "#2C3E50",
    accent_color: "#F7C59F",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    address: "",
    city: "",
    country: "Perú",
  });

  const [autoSlug, setAutoSlug] = useState(true);

  const updateField = (field: keyof RestaurantCreate, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(omitEmptyStrings(form) as RestaurantCreate);
      router.push("/admin/restaurants");
    } catch (err) {
      // Error handled by mutation
    }
  };

  const apiError = createMutation.error
    ? getErrorMessage(createMutation.error, "Error al crear el restaurante")
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/restaurants"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2D3147] text-gray-400 hover:bg-[#1F2234] hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Nuevo Restaurante
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Completa los datos básicos del restaurante
          </p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <UtensilsCrossed className="h-4 w-4 text-[#6366F1]" />
            Información básica
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300"
              >
                Nombre del restaurante *
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="Ej: La Casona del Sabor"
              />
            </div>
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-300"
              >
                Slug (URL) *
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-500">/menu/</span>
                <input
                  id="slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    updateField("slug", slugify(e.target.value));
                  }}
                  className="block flex-1 rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                  placeholder="la-casona-del-sabor"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Este slug no podrá cambiarse una vez creado
              </p>
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-300"
              >
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] resize-none"
                placeholder="Describe brevemente al restaurante..."
              />
            </div>
          </div>
        </div>

        {/* Brand Colors Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Palette className="h-4 w-4 text-[#6366F1]" />
            Identidad visual
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "primary_color" as const, label: "Color primario" },
              { key: "secondary_color" as const, label: "Color secundario" },
              { key: "accent_color" as const, label: "Color acento" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-400">
                  {label}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={form[key] || "#000000"}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-[#2D3147] bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={form[key] || ""}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-2 py-1.5 text-xs text-white font-mono focus:border-[#6366F1] focus:outline-none"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Preview */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#2D3147] bg-[#0F1117] p-3">
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: form.primary_color }}
            />
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: form.secondary_color }}
            />
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: form.accent_color }}
            />
            <span className="ml-2 text-xs text-gray-500">
              Vista previa de la paleta
            </span>
          </div>
        </div>

        {/* Contact Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Phone className="h-4 w-4 text-[#6366F1]" />
            Contacto
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Teléfono
              </label>
              <input
                type="text"
                value={form.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="+51 999 999 999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                WhatsApp
              </label>
              <input
                type="text"
                value={form.whatsapp || ""}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="+51 999 999 999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="contacto@restaurante.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Sitio web
              </label>
              <input
                type="url"
                value={form.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="https://restaurante.com"
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <MapPin className="h-4 w-4 text-[#6366F1]" />
            Ubicación
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300">
                Dirección
              </label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="Av. Principal 123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Ciudad
              </label>
              <input
                type="text"
                value={form.city || ""}
                onChange={(e) => updateField("city", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="Lima"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                País
              </label>
              <input
                type="text"
                value={form.country || ""}
                onChange={(e) => updateField("country", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                placeholder="Perú"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/restaurants"
            className="rounded-lg border border-[#2D3147] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || !form.name || !form.slug}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Crear Restaurante
          </button>
        </div>
      </form>
    </div>
  );
}
