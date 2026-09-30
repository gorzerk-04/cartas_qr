"use client";

import React, { useState } from "react";
import {
  MapPin,
  Globe,
  Link2,
  Plus,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  useRestaurantSocials,
  useCreateRestaurantSocial,
  useUpdateRestaurantSocial,
  useDeleteRestaurantSocial,
} from "../../hooks/use-restaurant-socials";
import { SocialPlatform } from "../../types";
import { getErrorMessage } from "../../lib/api-error";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter / X",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tripadvisor: "Tripadvisor",
  google_maps: "Google Maps",
};

// lucide-react 1.x dropped brand/logo icons entirely — generic icons only, the label text next to
// each row is what actually distinguishes the platform.
const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Globe,
  facebook: Globe,
  twitter: Globe,
  tiktok: Globe,
  youtube: Globe,
  linkedin: Globe,
  tripadvisor: Globe,
  google_maps: MapPin,
};

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as SocialPlatform[];

// El <input type="url"> de este componente no dispara la validación nativa del navegador
// porque, a diferencia de un campo dentro de un <form>, aquí no hay submit que validar
// (ver comentario más abajo sobre el <div>). Se valida a mano antes de llamar a la API.
function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const URL_ERROR = "El enlace debe ser una URL válida que empiece con http:// o https://";

interface RestaurantSocialsEditorProps {
  restaurantId: string;
  // Solo para refrescar la carta pública tras cambiar los enlaces.
  slug?: string;
}

export default function RestaurantSocialsEditor({ restaurantId, slug }: RestaurantSocialsEditorProps) {
  const { data: socials, isLoading } = useRestaurantSocials(restaurantId);
  const createMutation = useCreateRestaurantSocial(restaurantId, slug);
  const updateMutation = useUpdateRestaurantSocial(restaurantId, slug);
  const deleteMutation = useDeleteRestaurantSocial(restaurantId, slug);

  const [newPlatform, setNewPlatform] = useState<SocialPlatform | "">("");
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const usedPlatforms = new Set((socials || []).map((s) => s.platform));
  const availablePlatforms = ALL_PLATFORMS.filter((p) => !usedPlatforms.has(p));

  const handleAdd = async () => {
    if (!newPlatform || !newUrl) return;
    setError(null);
    if (!isValidHttpUrl(newUrl)) {
      setError(URL_ERROR);
      return;
    }
    try {
      await createMutation.mutateAsync({ platform: newPlatform, url: newUrl.trim() });
      setNewPlatform("");
      setNewUrl("");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al agregar la red social"));
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editUrl) return;
    setError(null);
    if (!isValidHttpUrl(editUrl)) {
      setError(URL_ERROR);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { url: editUrl.trim() } });
      setEditingId(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al actualizar la red social"));
    }
  };

  return (
    <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
        <Link2 className="h-4 w-4 text-[#6366F1]" />
        Redes Sociales
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
        </div>
      ) : (
        <div className="space-y-2">
          {(socials || []).map((social) => {
            const Icon = PLATFORM_ICONS[social.platform];
            return (
              <div
                key={social.id}
                className="flex items-center gap-3 rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="w-24 shrink-0 text-sm text-gray-300">
                  {PLATFORM_LABELS[social.platform]}
                </span>
                {editingId === social.id ? (
                  <input
                    type="url"
                    autoFocus
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    onBlur={() => handleSaveEdit(social.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit(social.id);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded border border-[#2D3147] bg-[#1A1D27] px-2 py-1 text-xs text-white focus:border-[#6366F1] focus:outline-none"
                  />
                ) : (
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-xs text-gray-500 hover:text-[#6366F1]"
                  >
                    {social.url}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(social.id);
                    setEditUrl(social.url);
                  }}
                  aria-label={`Editar enlace de ${PLATFORM_LABELS[social.platform]}`}
                  className="shrink-0 text-gray-500 hover:text-gray-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(social.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Eliminar enlace de ${PLATFORM_LABELS[social.platform]}`}
                  className="shrink-0 text-gray-500 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {availablePlatforms.length > 0 && (
            // Plain div, not <form>: this component is embedded inside the restaurant edit page's
            // own <form>, and nested <form> elements are invalid HTML (React/Next.js console error).
            <div className="flex items-center gap-2 pt-2">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as SocialPlatform)}
                className="rounded-lg border border-[#2D3147] bg-[#0F1117] px-2.5 py-2 text-xs text-white focus:border-[#6366F1] focus:outline-none"
              >
                <option value="">Plataforma...</option>
                {availablePlatforms.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
              <input
                type="url"
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // Prevent bubbling up to the outer restaurant-edit <form> and submitting it.
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="flex-1 rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-[#6366F1] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newPlatform || !newUrl || createMutation.isPending}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#6366F1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Agregar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
