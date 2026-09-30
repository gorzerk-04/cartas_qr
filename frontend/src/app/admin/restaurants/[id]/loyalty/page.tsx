"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";
import { useRestaurant } from "../../../../../hooks/use-restaurants";
import { useLoyaltyProgram, useSaveLoyaltyProgram } from "../../../../../hooks/use-loyalty";
import { useProducts } from "../../../../../hooks/use-products";
import { getLoyaltyErrorMessage } from "../../../../../lib/loyalty-errors";
import { defaultConsentText, rewardPreview } from "../../../../../lib/loyalty";
import { LoyaltyProgram } from "../../../../../types";

const inputClass =
  "mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

interface FormProps {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  program: LoyaltyProgram | null;
}

// Se monta cuando el programa ya cargó (o se sabe que no existe), así el estado inicial
// sale de los datos sin sincronizar con efectos.
function ProgramForm({ restaurantId, restaurantName, slug, program }: FormProps) {
  const saveMutation = useSaveLoyaltyProgram(restaurantId, slug);
  const { data: products } = useProducts(restaurantId, { limit: 100 });

  const [isActive, setIsActive] = useState(program?.is_active ?? false);
  const [visitsRequired, setVisitsRequired] = useState(String(program?.visits_required ?? 10));
  const [minHours, setMinHours] = useState(String(program?.min_hours_between_visits ?? 12));
  const [expires, setExpires] = useState(!!program?.visits_expire_after_days);
  const [expireDays, setExpireDays] = useState(String(program?.visits_expire_after_days ?? 90));
  const [reward, setReward] = useState(program?.reward_description ?? "");
  const [productId, setProductId] = useState(program?.reward_product_id ?? "");
  const [consentText, setConsentText] = useState(program?.consent_text ?? defaultConsentText(restaurantName));
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const visitsNumber = parseInt(visitsRequired, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setLocalError(null);

    const minHoursNumber = parseInt(minHours, 10);
    const expireNumber = parseInt(expireDays, 10);
    if (!Number.isInteger(visitsNumber) || visitsNumber < 2 || visitsNumber > 100) {
      setLocalError("La meta de visitas debe estar entre 2 y 100.");
      return;
    }
    if (!Number.isInteger(minHoursNumber) || minHoursNumber < 0 || minHoursNumber > 168) {
      setLocalError("El tiempo mínimo entre visitas debe estar entre 0 y 168 horas.");
      return;
    }
    if (expires && (!Number.isInteger(expireNumber) || expireNumber < 1)) {
      setLocalError("Los días de vencimiento deben ser un número mayor a 0.");
      return;
    }
    if (!reward.trim()) {
      setLocalError("Describe la recompensa.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        is_active: isActive,
        visits_required: visitsNumber,
        reward_description: reward.trim(),
        reward_product_id: productId || null,
        min_hours_between_visits: minHoursNumber,
        visits_expire_after_days: expires ? expireNumber : null,
        consent_text: consentText.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      // El error se muestra desde el estado de la mutation
    }
  };

  const apiError = saveMutation.error
    ? getLoyaltyErrorMessage(saveMutation.error, "No se pudo guardar el programa")
    : null;
  const error = localError || apiError;
  const consentChanged = !!program && consentText.trim() !== program.consent_text;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {saved && (
        <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Programa guardado. La carta pública se actualiza en segundos.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {!program && (
        <div className="rounded-lg border border-[#2D3147] bg-[#1A1D27] p-3 text-sm text-gray-400">
          Este restaurante todavía no tiene programa. Completa los datos y guárdalos para crearlo.
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-sm font-medium text-white">Programa de fidelización</span>
          <p className="text-xs text-gray-400">
            Activo: se pueden registrar visitas y canjes, y la carta pública muestra el banner.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#10B981] focus:ring-[#10B981]"
          />
          Programa activo
        </label>
      </div>

      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Gift className="h-4 w-4 text-[#6366F1]" />
          Recompensa
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="reward" className="block text-sm font-medium text-gray-300">
              Descripción de la recompensa
            </label>
            <input
              id="reward"
              type="text"
              maxLength={200}
              required
              placeholder="Ej.: Ceviche clásico gratis"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reward-product" className="block text-sm font-medium text-gray-300">
              Producto de la carta (opcional)
            </label>
            <select
              id="reward-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={inputClass}
            >
              <option value="">Ninguno</option>
              {(products?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="visits-required" className="block text-sm font-medium text-gray-300">
              Visitas necesarias (2 a 100)
            </label>
            <input
              id="visits-required"
              type="number"
              min={2}
              max={100}
              value={visitsRequired}
              onChange={(e) => setVisitsRequired(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="min-hours" className="block text-sm font-medium text-gray-300">
              Horas mínimas entre visitas (0 a 168)
            </label>
            <input
              id="min-hours"
              type="number"
              min={0}
              max={168}
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={expires}
                onChange={(e) => setExpires(e.target.checked)}
                className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
              />
              Las visitas vencen
            </label>
            {expires && (
              <div className="mt-2">
                <label htmlFor="expire-days" className="block text-xs font-medium text-gray-400">
                  Días de vigencia de cada visita
                </label>
                <input
                  id="expire-days"
                  type="number"
                  min={1}
                  value={expireDays}
                  onChange={(e) => setExpireDays(e.target.value)}
                  className={`${inputClass} max-w-[12rem]`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-[#2D3147] bg-[#0F1117] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-500">Así lo verá el comensal</p>
          <p data-testid="reward-preview" className="mt-1 text-sm font-medium text-white">
            {rewardPreview(Number.isInteger(visitsNumber) ? visitsNumber : 0, reward)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <label htmlFor="consent" className="block text-sm font-medium text-gray-300">
          Texto de consentimiento
        </label>
        <p className="text-xs text-gray-500">
          Lo acepta el comensal al registrarse (Ley 29733). Si lo cambias, sube su versión; cada comensal conserva
          la versión que aceptó.
        </p>
        <textarea
          id="consent"
          rows={4}
          maxLength={500}
          value={consentText}
          onChange={(e) => setConsentText(e.target.value)}
          className={`${inputClass} resize-none`}
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setConsentText(defaultConsentText(restaurantName))}
            className="text-[#6366F1] underline"
          >
            Restablecer texto por defecto
          </button>
          {consentChanged && <span className="text-amber-400">Guardar subirá la versión del consentimiento.</span>}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar programa
        </button>
      </div>
    </form>
  );
}

export default function LoyaltyProgramPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: restaurant } = useRestaurant(id);
  const { data: program, isLoading, error } = useLoyaltyProgram(id);

  if (isLoading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
        No se pudo cargar el programa de fidelización.
      </div>
    );
  }

  return (
    <ProgramForm
      key={restaurant.id}
      restaurantId={id}
      restaurantName={restaurant.name}
      slug={restaurant.slug}
      program={program ?? null}
    />
  );
}
