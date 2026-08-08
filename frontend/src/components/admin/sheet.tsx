"use client";

import React, { useRef } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useFocusTrap } from "../../hooks/use-focus-trap";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Sheet({ isOpen, onClose, title, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, isOpen);
  useFocusTrap(panelRef, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[#2D3147] bg-[#1A1D27] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#2D3147] px-6 py-4">
          <h2 id="sheet-title" className="text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#1F2234] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#2D3147] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
