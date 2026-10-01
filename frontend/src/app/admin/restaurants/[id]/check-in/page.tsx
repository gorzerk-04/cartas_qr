"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCheckIn, useLoyaltyProgram, useRedeem, useVoidVisit } from "../../../../../hooks/use-loyalty";
import { getErrorCode, getErrorMessage } from "../../../../../lib/api-error";
import { getLoyaltyErrorMessage } from "../../../../../lib/loyalty-errors";
import { CheckInResult } from "../../../../../types";
import ConfirmDialog from "../../../../../components/admin/confirm-dialog";
import CheckInResultCard from "../../../../../components/admin/loyalty/check-in-result-card";

// Tiempo durante el que se ofrece "Anular esta visita" para corregir un error de caja
const UNDO_WINDOW_MS = 15_000;

export default function CheckInPage() {
  const params = useParams();
  const id = params.id as string;

  // `program` es null si no existe (404); cualquier otro fallo de la API es `programError`
  const { data: program, isLoading, error: programError, refetch, isFetching } = useLoyaltyProgram(id);
  const checkInMutation = useCheckIn(id);
  const redeemMutation = useRedeem(id);
  const voidMutation = useVoidVisit(id, "");

  const phoneRef = useRef<HTMLInputElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [needsData, setNeedsData] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRedeem, setConfirmRedeem] = useState(false);

  // Limpia el temporizador de anulación al salir de la pantalla
  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const active = !!program?.is_active;

  const resetForNext = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setResult(null);
    setCanUndo(false);
    setPhone("");
    setFullName("");
    setConsent(false);
    setNeedsData(false);
    setError(null);
    setNotice(null);
    setTimeout(() => phoneRef.current?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkInMutation.isPending || !phone.trim()) return;
    setError(null);
    setNotice(null);

    try {
      const res = await checkInMutation.mutateAsync({
        phone: phone.trim(),
        ...(needsData ? { full_name: fullName.trim(), consent } : {}),
      });
      setResult(res);
      setCanUndo(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setCanUndo(false), UNDO_WINDOW_MS);
    } catch (err) {
      if (getErrorCode(err) === "CUSTOMER_DATA_REQUIRED" && !needsData) {
        // Comensal nuevo: pedir nombre y consentimiento antes de crearlo
        setNeedsData(true);
        setNotice("Es un comensal nuevo: ingresa su nombre y confirma su consentimiento.");
      } else {
        setError(getLoyaltyErrorMessage(err, "No se pudo registrar la visita"));
      }
    }
  };

  const handleUndo = async () => {
    if (!result) return;
    try {
      await voidMutation.mutateAsync({ visitId: result.visit.id, reason: "Corregida en caja" });
      const name = result.customer.full_name;
      resetForNext();
      setNotice(`Visita de ${name} anulada.`);
    } catch (err) {
      setError(getLoyaltyErrorMessage(err, "No se pudo anular la visita"));
    }
  };

  const handleRedeem = async () => {
    if (!result) return;
    try {
      const redemption = await redeemMutation.mutateAsync(result.customer.id);
      const balance = Math.max(0, result.balance - redemption.visits_consumed);
      setResult({
        ...result,
        balance,
        reward_available: balance >= result.visits_required,
      });
      setCanUndo(false);
      setNotice(`Canje registrado: ${redemption.reward_description_snapshot}.`);
    } catch (err) {
      setError(getLoyaltyErrorMessage(err, "No se pudo registrar el canje"));
    }
    setConfirmRedeem(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  // Si no se pudo leer el programa (servidor caído, error 500…), no se afirma que "no está
  // configurado": se muestra el error real y se ofrece reintentar.
  if (programError) {
    return (
      <div className="mx-auto max-w-md">
        <div role="alert" className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <p>
              No se pudo cargar el programa de fidelización.{" "}
              {getErrorMessage(programError, "Revisa la conexión con el servidor e inténtalo de nuevo.")}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 font-semibold underline disabled:opacity-50"
            >
              {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-xl border border-[#2D3147] bg-[#0F1117] px-4 py-3 text-base text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

  return (
    <div className="mx-auto max-w-md space-y-5">
      {!active && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            El programa de fidelización no está activo
            {program ? "" : " (todavía no se configuró)"}.{" "}
            <Link href={`/admin/restaurants/${id}/loyalty`} className="font-semibold underline">
              Ir a la configuración
            </Link>
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-3 text-sm text-indigo-200">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && program ? (
        <CheckInResultCard
          result={result}
          rewardDescription={program.reward_description}
          canUndo={canUndo}
          isUndoing={voidMutation.isPending}
          onUndo={handleUndo}
          onRedeem={() => setConfirmRedeem(true)}
          onNext={resetForNext}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#2D3147] bg-[#1A1D27] p-5 sm:p-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
              Celular del comensal
            </label>
            <input
              id="phone"
              ref={phoneRef}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              autoFocus
              disabled={!active || needsData}
              placeholder="987 654 321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputClass} text-2xl tracking-wide`}
            />
          </div>

          {needsData && (
            <>
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-300">
                  Nombre
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoFocus
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2D3147] bg-[#0F1117] p-3 text-sm text-gray-300">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
                />
                <span>{program?.consent_text}</span>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={!active || checkInMutation.isPending || !phone.trim() || (needsData && (!fullName.trim() || !consent))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-4 py-3.5 text-base font-semibold text-white hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50 transition"
          >
            {checkInMutation.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
            {needsData ? "Registrar comensal y visita" : "Registrar visita"}
          </button>

          {needsData && (
            <button
              type="button"
              onClick={resetForNext}
              className="w-full text-center text-sm text-gray-400 underline hover:text-gray-200"
            >
              Cancelar
            </button>
          )}
        </form>
      )}

      <ConfirmDialog
        isOpen={confirmRedeem}
        title="¿Canjear la recompensa?"
        description={
          program && result
            ? `Se entregará ${program.reward_description} y se consumirán ${result.visits_required} visitas.`
            : "Se consumirán las visitas del comensal."
        }
        confirmLabel="Canjear"
        isConfirming={redeemMutation.isPending}
        onConfirm={handleRedeem}
        onCancel={() => setConfirmRedeem(false)}
      />
    </div>
  );
}
