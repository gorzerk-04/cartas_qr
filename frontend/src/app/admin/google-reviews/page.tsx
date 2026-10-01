"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, Star } from "lucide-react";
import { useRestaurants } from "../../../hooks/use-restaurants";
import {
  useGoogleReviewSettings,
  useResolveGoogleReview,
  useSaveGoogleReviewSettings,
} from "../../../hooks/use-google-reviews";
import { getErrorMessage, getFieldErrorMessage } from "../../../lib/api-error";
import { googleReviewTestUrl } from "../../../lib/google-review";

// Solo admin de plataforma: el layout del panel redirige a cualquier otro rol al dashboard
// y el backend responde 403.
const inputClass =
  "block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none";
const secondaryButton =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#2D3147] px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1F2234] hover:text-white transition disabled:opacity-50";
const primaryButton =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#6366F1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] transition disabled:opacity-50";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };

  return (
    <button type="button" onClick={copy} className={secondaryButton} aria-live="polite">
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : failed ? "No se pudo copiar" : "Copiar"}
    </button>
  );
}

function TestLink({ href, label = "Probar" }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
      <ExternalLink className="h-4 w-4" />
      {label}
    </a>
  );
}

function ConverterTool() {
  const [mapsUrl, setMapsUrl] = useState("");
  const resolve = useResolveGoogleReview();
  const result = resolve.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapsUrl.trim()) resolve.mutate(mapsUrl.trim());
  };

  return (
    <section className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
      <h2 className="text-base font-semibold text-white">Convertir enlace de Google Maps</h2>
      <p className="mt-1 text-sm text-gray-400">
        En Google Maps abre la ficha del local, toca <strong>Compartir</strong> y luego{" "}
        <strong>Copiar enlace</strong>. Pégalo aquí para obtener el enlace que abre directamente la
        ventana para dejar una reseña.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <label htmlFor="maps-url" className="block text-sm font-medium text-gray-300">
          Enlace de Google Maps del local
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="maps-url"
            type="text"
            inputMode="url"
            placeholder="https://maps.app.goo.gl/..."
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={!mapsUrl.trim() || resolve.isPending} className={primaryButton}>
            {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Obtener enlace
          </button>
        </div>
      </form>

      {resolve.isError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {getErrorMessage(resolve.error, "No se pudo obtener el enlace de reseñas")}
        </p>
      )}

      {result && (
        <div data-testid="resolve-result" className="mt-4 space-y-2 rounded-lg border border-[#2D3147] bg-[#0F1117] p-4">
          <p className="text-sm text-gray-300">
            Lugar detectado: <span className="font-medium text-white">{result.nombre || "Sin nombre"}</span>
          </p>
          <label htmlFor="review-url-result" className="block text-xs font-medium text-gray-400">
            Enlace para dejar reseña
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="review-url-result" readOnly value={result.review_url} className={`${inputClass} font-mono text-xs`} />
            <div className="flex gap-2">
              <CopyButton value={result.review_url} />
              <TestLink href={result.review_url} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AssignSection() {
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.get("restaurant") ?? "");
  const [mapsUrl, setMapsUrl] = useState("");
  const [override, setOverride] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const { data: restaurantsPage, isLoading: loadingRestaurants } = useRestaurants({ limit: 100 });
  const restaurants = restaurantsPage?.data ?? [];
  const selected = restaurants.find((r) => r.id === restaurantId);

  const settingsQuery = useGoogleReviewSettings(restaurantId || null);
  const settings = settingsQuery.data;
  const save = useSaveGoogleReviewSettings(restaurantId || null, selected?.slug);

  // Al cambiar de restaurante (o al cargar su configuración), el formulario refleja lo guardado
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con los datos cargados
    setMapsUrl(settings?.google_maps_url ?? "");
    setOverride(settings?.google_review_url_override ?? "");
  }, [settings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el aviso al cambiar de restaurante
    setSaved(null);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de restaurante
  }, [restaurantId]);

  const activeUrl = settings?.google_review_url_override || settings?.google_review_url || null;
  const overrideError = getFieldErrorMessage(save.error, "google_review_url_override");
  const overrideTestUrl = googleReviewTestUrl(override);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(null);
    save.mutate(
      { google_maps_url: mapsUrl.trim() || null, google_review_url_override: override.trim() || null },
      { onSuccess: () => setSaved("Enlace guardado. La carta mostrará el botón de reseña.") }
    );
  };

  const remove = () => {
    setSaved(null);
    save.mutate(
      { google_maps_url: null, google_review_url_override: null },
      { onSuccess: () => setSaved("Enlace quitado. La carta ya no muestra el botón de reseña.") }
    );
  };

  return (
    <section className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
      <h2 className="text-base font-semibold text-white">Asignar a un restaurante</h2>
      <p className="mt-1 text-sm text-gray-400">
        El enlace se guarda en el restaurante y su carta muestra el botón &ldquo;Déjanos tu reseña en Google&rdquo;.
      </p>

      <div className="mt-4">
        <label htmlFor="restaurant-select" className="block text-sm font-medium text-gray-300">
          Restaurante
        </label>
        <select
          id="restaurant-select"
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          disabled={loadingRestaurants}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">{loadingRestaurants ? "Cargando…" : "Elige un restaurante"}</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {restaurantId && settingsQuery.isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
        </div>
      )}

      {restaurantId && settingsQuery.isError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {getErrorMessage(settingsQuery.error, "No se pudo cargar la configuración del restaurante")}
        </p>
      )}

      {restaurantId && settings && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div data-testid="current-review-link" className="rounded-lg border border-[#2D3147] bg-[#0F1117] p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enlace que usa la carta</p>
            {activeUrl ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 break-all text-xs text-gray-200">{activeUrl}</code>
                <div className="flex gap-2">
                  <CopyButton value={activeUrl} />
                  <TestLink href={activeUrl} />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-gray-400">Este restaurante todavía no tiene enlace de reseñas.</p>
            )}
            {activeUrl && (
              <p className="mt-2 text-xs text-gray-500">
                {settings.google_review_url_override
                  ? "Se usa el enlace oficial del Perfil de Empresa."
                  : "Se usa el enlace generado desde Google Maps."}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="assign-maps-url" className="block text-sm font-medium text-gray-300">
              Enlace de Google Maps del local
            </label>
            <input
              id="assign-maps-url"
              type="text"
              inputMode="url"
              placeholder="https://maps.app.goo.gl/..."
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Al guardar, el enlace de reseña se genera en el servidor a partir de este enlace.
            </p>
          </div>

          <div>
            <label htmlFor="assign-override" className="block text-sm font-medium text-gray-300">
              Enlace oficial de reseñas (recomendado)
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                id="assign-override"
                type="text"
                inputMode="url"
                placeholder="https://g.page/r/.../review"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                aria-invalid={overrideError ? true : undefined}
                className={`${inputClass} ${overrideError ? "border-red-500/60" : ""}`}
              />
              {overrideTestUrl && <TestLink href={overrideTestUrl} />}
            </div>
            {overrideError && <p className="mt-1 text-xs text-red-400">{overrideError}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Se obtiene en el Perfil de Empresa de Google → &ldquo;Pedir reseñas&rdquo;. Funciona mejor en
              celulares y, si lo pones, la carta usa este en lugar del generado.
            </p>
          </div>

          {save.isError && !overrideError && (
            <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {getErrorMessage(save.error, "No se pudo guardar el enlace")}
            </p>
          )}
          {saved && (
            <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {saved}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={remove}
              disabled={save.isPending || !activeUrl}
              className={secondaryButton}
            >
              Quitar enlace
            </button>
            <button type="submit" disabled={save.isPending} className={primaryButton}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function GoogleReviewsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Star className="h-6 w-6 text-[#6366F1]" />
          Reseñas de Google
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Genera el enlace para que los comensales dejen una reseña y asígnalo a un restaurante.
        </p>
      </div>
      <ConverterTool />
      {/* useSearchParams necesita un límite de Suspense para el prerender */}
      <Suspense fallback={null}>
        <AssignSection />
      </Suspense>
    </div>
  );
}
