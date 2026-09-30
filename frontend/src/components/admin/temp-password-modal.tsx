"use client";

import React, { useRef, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useFocusTrap } from "../../hooks/use-focus-trap";

interface TempPasswordModalProps {
  isOpen: boolean;
  username: string;
  tempPassword: string;
  onClose: () => void;
}

// La contraseña temporal se muestra UNA sola vez: el backend solo guarda su hash.
// Por eso el modal no se cierra al hacer clic fuera, solo con el botón explícito.
export default function TempPasswordModal({
  isOpen,
  username,
  tempPassword,
  onClose,
}: TempPasswordModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEscapeKey(onClose, isOpen);
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="temp-password-title"
        className="w-full max-w-md rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 id="temp-password-title" className="text-lg font-semibold text-white">
              Contraseña temporal
            </h3>
            <p className="text-xs text-gray-400">Usuario: {username}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <code
            data-testid="temp-password"
            className="block min-w-0 flex-1 select-all break-all rounded-lg border border-[#2D3147] bg-[#0F1117] px-3 py-2.5 font-mono text-sm text-white"
          >
            {tempPassword}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#2D3147] px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-[#1F2234] transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
        {copyFailed && (
          <p className="mt-2 text-xs text-amber-400">
            No se pudo copiar automáticamente. Selecciónala y cópiala a mano.
          </p>
        )}

        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300"
        >
          Esta contraseña <strong>no se volverá a mostrar</strong>. Entrégala al usuario por un canal
          seguro; al iniciar sesión por primera vez se le pedirá que la cambie.
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5] transition"
          >
            Ya la copié
          </button>
        </div>
      </div>
    </div>
  );
}
