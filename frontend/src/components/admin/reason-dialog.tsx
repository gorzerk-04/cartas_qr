"use client";

import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useFocusTrap } from "../../hooks/use-focus-trap";

const MIN_REASON = 3;

interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  isConfirming?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// Confirmación que exige un motivo (anular una visita o un canje queda auditado).
// El formulario interno se monta solo al abrir, así el motivo siempre arranca vacío.
export default function ReasonDialog(props: ReasonDialogProps) {
  if (!props.isOpen) return null;
  return <ReasonDialogBody {...props} />;
}

function ReasonDialogBody({
  title,
  description,
  confirmLabel,
  isConfirming = false,
  error,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");

  useEscapeKey(onCancel, true);
  useFocusTrap(dialogRef, true);

  const valid = reason.trim().length >= MIN_REASON;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6 shadow-2xl"
      >
        <h3 id="reason-dialog-title" className="text-lg font-semibold text-white">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-400">{description}</p>

        <label htmlFor="void-reason" className="mt-4 block text-sm font-medium text-gray-300">
          Motivo (obligatorio)
        </label>
        <textarea
          id="void-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 block w-full resize-none rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={!valid || isConfirming}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
          >
            {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
