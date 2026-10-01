"use client";

import React from "react";
import { CheckCircle2, Gift, Loader2, UserPlus } from "lucide-react";
import { CheckInResult } from "../../../types";
import ProgressBar from "./progress-bar";

interface CheckInResultCardProps {
  result: CheckInResult;
  rewardDescription: string;
  canUndo: boolean;
  isUndoing: boolean;
  onUndo: () => void;
  onRedeem: () => void;
  onNext: () => void;
}

// Tarjeta que se muestra tras registrar una visita: nombre, progreso, anulación inmediata
// (solo unos segundos, para corregir errores de caja) y, si corresponde, el canje.
export default function CheckInResultCard({
  result,
  rewardDescription,
  canUndo,
  isUndoing,
  onUndo,
  onRedeem,
  onNext,
}: CheckInResultCardProps) {
  return (
    <div
      data-testid="check-in-result"
      className="space-y-4 rounded-2xl border border-[#2D3147] bg-[#1A1D27] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-400">
            {result.customer_created ? "Comensal nuevo registrado · visita registrada" : "Visita registrada"}
          </p>
          <h2 className="truncate text-xl font-bold text-white">{result.customer.full_name}</h2>
          <p className="font-mono text-xs text-gray-400">{result.customer.phone}</p>
        </div>
      </div>

      <ProgressBar balance={result.balance} required={result.visits_required} />

      {result.reward_available && (
        <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 text-base font-semibold text-emerald-300">
            <Gift className="h-5 w-5" />
            ¡Tiene un plato gratis!
          </p>
          <p className="text-sm text-emerald-200/80">{rewardDescription}</p>
          <button
            type="button"
            onClick={onRedeem}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 transition"
          >
            Canjear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-xl bg-[#6366F1] px-4 py-3 text-base font-semibold text-white hover:bg-[#4F46E5] transition"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UserPlus className="h-5 w-5" />
            Siguiente comensal
          </span>
        </button>
        {canUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={isUndoing}
            className="rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
          >
            {isUndoing ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Anular esta visita"}
          </button>
        )}
      </div>
    </div>
  );
}
