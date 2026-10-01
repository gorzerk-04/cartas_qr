"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useRestaurant,
  useUpdateRestaurant,
  useUploadRestaurantLogo,
  useUploadRestaurantCover,
  useDeleteRestaurantLogo,
  useDeleteRestaurantCover,
} from "../../../../hooks/use-restaurants";
import { RestaurantUpdate } from "../../../../types";
import {
  Loader2,
  UtensilsCrossed,
  Palette,
  MapPin,
  Phone,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import ImageUploader from "../../../../components/admin/image-uploader";
import OperatingHoursEditor from "../../../../components/admin/operating-hours-editor";
import RestaurantSocialsEditor from "../../../../components/admin/restaurant-socials-editor";
import { getErrorMessage } from "../../../../lib/api-error";
import { blankToNull } from "../../../../lib/forms";
import { useAuth } from "../../../../hooks/use-auth";

// Columnas que aceptan NULL en la base: vaciar su campo en el formulario debe borrarlas.
// El resto (name, country y los tres colores) son NOT NULL, así que se omiten si quedan
// vacías en vez de mandar null. Ver blankToNull().
const NULLABLE_FIELDS = [
  "description",
  "phone",
  "whatsapp",
  "email",
  "website",
  "address",
  "city",
] as const satisfies readonly (keyof RestaurantUpdate)[];

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const COLOR_FIELDS = [
  { key: "primary_color" as const, label: "Color primario" },
  { key: "secondary_color" as const, label: "Color secundario" },
  { key: "accent_color" as const, label: "Color acento" },
];

export default function EditRestaurantPage() {
  const params = useParams();
  const id = params.id as string;
  const { can } = useAuth();
  const canToggleActive = can("toggleActive");
  const canEdit = can("editRestaurantInfo");

  const { data: restaurant, isLoading: isLoadingRestaurant, error } = useRestaurant(id);
  const updateMutation = useUpdateRestaurant();
  const logoMutation = useUploadRestaurantLogo();
  const coverMutation = useUploadRestaurantCover();
  const deleteLogoMutation = useDeleteRestaurantLogo();
  const deleteCoverMutation = useDeleteRestaurantCover();

  const [form, setForm] = useState<RestaurantUpdate>({
    name: "",
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
    is_active: true,
    is_published: false,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con las props/datos cargados
      setForm({
        name: restaurant.name || "",
        description: restaurant.description || "",
        primary_color: restaurant.primary_color || "#FF6B35",
        secondary_color: restaurant.secondary_color || "#2C3E50",
        accent_color: restaurant.accent_color || "#F7C59F",
        phone: restaurant.phone || "",
        whatsapp: restaurant.whatsapp || "",
        email: restaurant.email || "",
        website: restaurant.website || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        country: restaurant.country || "Perú",
        is_active: restaurant.is_active,
        is_published: restaurant.is_published,
      });
    }
  }, [restaurant]);

  const updateField = (
    field: keyof RestaurantUpdate,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setColorError(null);

    // Los colores se inyectan tal cual como CSS custom properties en la carta pública:
    // un valor que no sea hex la deja sin color de marca, en silencio.
    const invalid = COLOR_FIELDS.filter(({ key }) => {
      const value = form[key];
      return !value || !HEX_COLOR_RE.test(value);
    });
    if (invalid.length > 0) {
      setColorError(
        `Revisa ${invalid.map((c) => c.label.toLowerCase()).join(", ")}: usa formato hexadecimal, por ejemplo #FF6B35.`
      );
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: blankToNull(form, NULLABLE_FIELDS),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  const apiError = updateMutation.error
    ? getErrorMessage(updateMutation.error, "Error al actualizar el restaurante")
    : null;

  if (isLoadingRestaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        <p>Restaurante no encontrado o error de conexión.</p>
        <Link
          href="/admin/restaurants"
          className="inline-flex items-center gap-2 text-sm text-[#6366F1] underline"
        >
          Volver a la lista
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          ¡Restaurante actualizado correctamente!
        </div>
      )}

      {apiError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      {colorError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {colorError}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-lg border border-[#2D3147] bg-[#1A1D27] p-3 text-sm text-gray-400">
          La información general es de solo lectura. Para cambiarla, contacta al administrador de la plataforma.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={!canEdit} className="m-0 min-w-0 space-y-6 border-0 p-0">
        {/* Status toggles */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm font-medium text-white">
              {canToggleActive ? "Estado de la cuenta" : "Visibilidad de la carta"}
            </span>
            <p className="text-xs text-gray-400">
              {canToggleActive
                ? "Controla si el restaurante está activo o deshabilitado"
                : "Controla si tu carta está publicada para tus clientes"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {canToggleActive && (
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
                />
                Activo
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => updateField("is_published", e.target.checked)}
                className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#10B981] focus:ring-[#10B981]"
              />
              Publicado
            </label>
          </div>
        </div>

        {/* Images Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <ImageIcon className="h-4 w-4 text-[#6366F1]" />
            Imágenes
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ImageUploader
              label="Logo del restaurante"
              currentImageUrl={restaurant.logo_url}
              aspectRatio="square"
              onUpload={async (file) => {
                await logoMutation.mutateAsync({ id, file });
              }}
              isUploading={logoMutation.isPending}
              onRemove={async () => {
                await deleteLogoMutation.mutateAsync({ id });
              }}
              isRemoving={deleteLogoMutation.isPending}
              helpText="Cuadrado, 512×512px recomendado"
            />
            <ImageUploader
              label="Imagen de portada"
              currentImageUrl={restaurant.cover_url}
              aspectRatio="cover"
              onUpload={async (file) => {
                await coverMutation.mutateAsync({ id, file });
              }}
              isUploading={coverMutation.isPending}
              onRemove={async () => {
                await deleteCoverMutation.mutateAsync({ id });
              }}
              isRemoving={deleteCoverMutation.isPending}
              helpText="Horizontal, 1200×400px recomendado"
            />
          </div>
        </div>

        {/* Operating Hours Section */}
        <OperatingHoursEditor restaurantId={id} slug={restaurant.slug} />

        {/* Social Networks Section */}
        <RestaurantSocialsEditor restaurantId={id} slug={restaurant.slug} />

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
                Nombre del restaurante
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-400">
                Slug (URL fija, inmutable)
              </label>
              <input
                id="slug"
                type="text"
                disabled
                value={restaurant.slug}
                className="mt-1 block w-full cursor-not-allowed rounded-lg border border-[#2D3147] bg-[#0F1117]/50 px-3 py-2.5 text-sm text-gray-500 font-mono"
              />
              {!canToggleActive && (
                <p className="mt-1 text-xs text-gray-500">
                  El slug no se puede cambiar: los códigos QR ya impresos dejarían de funcionar.
                </p>
              )}
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
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`${key}-hex`}
                  className="block text-xs font-medium text-gray-400"
                >
                  {label}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`${label} (selector visual)`}
                    value={HEX_COLOR_RE.test(form[key] || "") ? form[key] : "#000000"}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-[#2D3147] bg-transparent p-0.5"
                  />
                  <input
                    id={`${key}-hex`}
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
        </div>

        {/* Contact Section */}
        <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Phone className="h-4 w-4 text-[#6366F1]" />
            Contacto
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                Teléfono
              </label>
              <input
                id="phone"
                type="text"
                value={form.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300">
                WhatsApp
              </label>
              <input
                id="whatsapp"
                type="text"
                value={form.whatsapp || ""}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-300">
                Sitio web
              </label>
              <input
                id="website"
                type="url"
                value={form.website || ""}
                onChange={(e) => updateField("website", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
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
              <label htmlFor="address" className="block text-sm font-medium text-gray-300">
                Dirección
              </label>
              <input
                id="address"
                type="text"
                value={form.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-300">
                Ciudad
              </label>
              <input
                id="city"
                type="text"
                value={form.city || ""}
                onChange={(e) => updateField("city", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-300">
                País
              </label>
              <input
                id="country"
                type="text"
                value={form.country || ""}
                onChange={(e) => updateField("country", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          </div>
        </div>

        </fieldset>

        {/* Submit */}
        {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/restaurants"
            className="rounded-lg border border-[#2D3147] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Guardar Cambios
          </button>
        </div>
        )}
      </form>
    </div>
  );
}
