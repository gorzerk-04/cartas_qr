"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Gift, Loader2, Trash2 } from "lucide-react";
import { useAnonymizeCustomer, useCustomer, useUpdateCustomer } from "../../../../../../hooks/use-customers";
import {
  useLoyaltyProgram,
  useRedeem,
  useRedemptions,
  useVisits,
  useVoidRedemption,
  useVoidVisit,
} from "../../../../../../hooks/use-loyalty";
import { getLoyaltyErrorMessage } from "../../../../../../lib/loyalty-errors";
import { formatDateTime } from "../../../../../../lib/dates";
import { Customer, VisitStatus } from "../../../../../../types";
import ConfirmDialog from "../../../../../../components/admin/confirm-dialog";
import ReasonDialog from "../../../../../../components/admin/reason-dialog";
import ProgressBar from "../../../../../../components/admin/loyalty/progress-bar";

const VISIT_STATUS: Record<VisitStatus, { label: string; style: string }> = {
  valid: { label: "Válida", style: "bg-emerald-500/10 text-emerald-400" },
  redeemed: { label: "Canjeada", style: "bg-indigo-500/10 text-indigo-300" },
  voided: { label: "Anulada", style: "bg-red-500/10 text-red-400" },
  expired: { label: "Vencida", style: "bg-gray-500/10 text-gray-400" },
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]";

function CustomerDetail({ restaurantId, customer }: { restaurantId: string; customer: Customer }) {
  const router = useRouter();
  const customerId = customer.id;
  const { data: program } = useLoyaltyProgram(restaurantId);
  const { data: visits, isLoading: loadingVisits } = useVisits(restaurantId, customerId);
  const { data: redemptions } = useRedemptions(restaurantId, customerId);

  const updateMutation = useUpdateCustomer(restaurantId, customerId);
  const anonymizeMutation = useAnonymizeCustomer(restaurantId);
  const voidVisitMutation = useVoidVisit(restaurantId, customerId);
  const voidRedemptionMutation = useVoidRedemption(restaurantId, customerId);
  const redeemMutation = useRedeem(restaurantId);

  const [fullName, setFullName] = useState(customer.full_name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saved, setSaved] = useState(false);

  const [voidVisitId, setVoidVisitId] = useState<string | null>(null);
  const [voidRedemptionId, setVoidRedemptionId] = useState<string | null>(null);
  const [confirmAnonymize, setConfirmAnonymize] = useState(false);
  const [confirmRedeem, setConfirmRedeem] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      await updateMutation.mutateAsync({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      // El error se muestra desde el estado de la mutation
    }
  };

  const errors = [updateMutation.error, redeemMutation.error, anonymizeMutation.error]
    .filter(Boolean)
    .map((e) => getLoyaltyErrorMessage(e, "No se pudo completar la acción"));

  const required = customer.visits_required ?? program?.visits_required ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/restaurants/${restaurantId}/customers`}
          aria-label="Volver a comensales"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2D3147] text-gray-400 hover:bg-[#1F2234] hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-white">{customer.full_name}</h2>
          <p className="font-mono text-xs text-gray-400">{customer.phone}</p>
        </div>
      </div>

      {saved && (
        <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Datos actualizados.
        </div>
      )}
      {errors.map((message, i) => (
        <div key={i} role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {message}
        </div>
      ))}

      {/* Progreso */}
      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        {required ? (
          <ProgressBar balance={customer.visits_balance} required={required} />
        ) : (
          <p className="text-sm text-gray-400">
            Saldo: <span className="font-semibold text-white">{customer.visits_balance}</span> visitas. El restaurante no
            tiene programa configurado.
          </p>
        )}
        {customer.reward_available && program && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <Gift className="h-4 w-4" />
              Tiene un premio disponible: {program.reward_description}
            </p>
            <button
              type="button"
              onClick={() => setConfirmRedeem(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Canjear
            </button>
          </div>
        )}
      </div>

      {/* Datos */}
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h3 className="text-sm font-medium text-gray-300">Datos del comensal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className="block text-sm font-medium text-gray-300">
              Nombre
            </label>
            <input id="c-name" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="c-phone" className="block text-sm font-medium text-gray-300">
              Celular
            </label>
            <input id="c-phone" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="c-email" className="block text-sm font-medium text-gray-300">
              Email (opcional)
            </label>
            <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="c-notes" className="block text-sm font-medium text-gray-300">
              Notas (opcional)
            </label>
            <input id="c-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Consentimiento aceptado el {formatDateTime(customer.consent_given_at)} (versión {customer.consent_version}).
        </p>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] disabled:opacity-50 transition"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar datos
          </button>
        </div>
      </form>

      {/* Visitas */}
      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h3 className="text-sm font-medium text-gray-300">Historial de visitas</h3>
        {loadingVisits ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#6366F1]" />
        ) : !visits || visits.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Sin visitas registradas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#2D3147]">
            {visits.map((v) => {
              const status = VISIT_STATUS[v.status];
              const canVoid = v.status === "valid" || v.status === "expired";
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="text-gray-200">{formatDateTime(v.visited_at)}</p>
                    <p className="text-xs text-gray-500">
                      {v.registered_by_username ? `Registró: ${v.registered_by_username}` : "Registro sin usuario"}
                      {v.void_reason ? ` · Motivo de anulación: ${v.void_reason}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.style}`}>{status.label}</span>
                    {canVoid && (
                      <button
                        type="button"
                        onClick={() => setVoidVisitId(v.id)}
                        className="text-xs text-red-400 underline hover:text-red-300"
                      >
                        Anular
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Canjes */}
      <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
        <h3 className="text-sm font-medium text-gray-300">Historial de canjes</h3>
        {!redemptions || redemptions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Sin canjes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#2D3147]">
            {redemptions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="text-gray-200">{r.reward_description_snapshot}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(r.redeemed_at)} · {r.visits_consumed} visitas
                    {r.void_reason ? ` · Motivo de anulación: ${r.void_reason}` : ""}
                  </p>
                </div>
                {r.voided_at ? (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Anulado</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVoidRedemptionId(r.id)}
                    className="text-xs text-red-400 underline hover:text-red-300"
                  >
                    Anular canje
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Borrado */}
      <div className="rounded-xl border border-red-500/20 bg-[#1A1D27] p-6">
        <h3 className="text-sm font-medium text-red-400">Eliminar datos del comensal</h3>
        <p className="mt-1 text-xs text-gray-400">
          Borra nombre, celular, email y notas. Las visitas y los canjes se conservan de forma anónima para las
          estadísticas.
        </p>
        <button
          type="button"
          onClick={() => setConfirmAnonymize(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar datos del comensal
        </button>
      </div>

      <ReasonDialog
        isOpen={!!voidVisitId}
        title="Anular visita"
        description="La visita dejará de sumar al saldo. Queda registrado quién la anuló y por qué."
        confirmLabel="Anular visita"
        isConfirming={voidVisitMutation.isPending}
        error={voidVisitMutation.error ? getLoyaltyErrorMessage(voidVisitMutation.error, "No se pudo anular") : null}
        onConfirm={async (reason) => {
          if (!voidVisitId) return;
          try {
            await voidVisitMutation.mutateAsync({ visitId: voidVisitId, reason });
            setVoidVisitId(null);
          } catch {
            // El error se muestra dentro del diálogo
          }
        }}
        onCancel={() => {
          setVoidVisitId(null);
          voidVisitMutation.reset();
        }}
      />
      <ReasonDialog
        isOpen={!!voidRedemptionId}
        title="Anular canje"
        description="Las visitas que consumió vuelven a sumar al saldo del comensal."
        confirmLabel="Anular canje"
        isConfirming={voidRedemptionMutation.isPending}
        error={
          voidRedemptionMutation.error ? getLoyaltyErrorMessage(voidRedemptionMutation.error, "No se pudo anular") : null
        }
        onConfirm={async (reason) => {
          if (!voidRedemptionId) return;
          try {
            await voidRedemptionMutation.mutateAsync({ redemptionId: voidRedemptionId, reason });
            setVoidRedemptionId(null);
          } catch {
            // El error se muestra dentro del diálogo
          }
        }}
        onCancel={() => {
          setVoidRedemptionId(null);
          voidRedemptionMutation.reset();
        }}
      />
      <ConfirmDialog
        isOpen={confirmRedeem}
        title="¿Canjear la recompensa?"
        description={
          program
            ? `Se entregará ${program.reward_description} y se consumirán ${program.visits_required} visitas.`
            : "Se consumirán las visitas del comensal."
        }
        confirmLabel="Canjear"
        isConfirming={redeemMutation.isPending}
        onConfirm={async () => {
          try {
            await redeemMutation.mutateAsync(customerId);
          } catch {
            // El error se muestra arriba
          }
          setConfirmRedeem(false);
        }}
        onCancel={() => setConfirmRedeem(false)}
      />
      <ConfirmDialog
        isOpen={confirmAnonymize}
        title="¿Eliminar los datos del comensal?"
        description="Se borrarán nombre y celular. No se puede deshacer."
        confirmLabel="Eliminar datos"
        isConfirming={anonymizeMutation.isPending}
        onConfirm={async () => {
          try {
            await anonymizeMutation.mutateAsync(customerId);
            router.replace(`/admin/restaurants/${restaurantId}/customers`);
          } catch {
            setConfirmAnonymize(false);
          }
        }}
        onCancel={() => setConfirmAnonymize(false)}
      />
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const restaurantId = params.id as string;
  const customerId = params.customerId as string;
  const { data: customer, isLoading, error } = useCustomer(restaurantId, customerId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
      </div>
    );
  }
  if (error || !customer) {
    return (
      <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        <p>Comensal no encontrado.</p>
        <Link
          href={`/admin/restaurants/${restaurantId}/customers`}
          className="inline-flex items-center gap-2 text-sm text-[#6366F1] underline"
        >
          Volver a comensales
        </Link>
      </div>
    );
  }
  return <CustomerDetail key={customer.id} restaurantId={restaurantId} customer={customer} />;
}
