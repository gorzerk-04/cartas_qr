"use client";

import React from "react";

interface ProgressBarProps {
  balance: number;
  required: number;
}

// Barra de progreso "7 / 10". Pasa a verde al completar la meta.
export default function ProgressBar({ balance, required }: ProgressBarProps) {
  const pct = required > 0 ? Math.min(100, Math.round((balance / required) * 100)) : 0;
  const complete = required > 0 && balance >= required;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-gray-400">Progreso</span>
        <span data-testid="progress-label" className="font-semibold text-white">
          {balance} / {required}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={Math.min(balance, required)}
        className="mt-2 h-3 overflow-hidden rounded-full bg-[#0F1117]"
      >
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-[#6366F1]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
