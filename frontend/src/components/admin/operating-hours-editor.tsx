"use client";

import React, { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import {
  useOperatingHours,
  useUpdateOperatingHours,
} from "../../hooks/use-operating-hours";
import { OperatingHourInput } from "../../types";
import { getErrorMessage } from "../../lib/api-error";

const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function buildDefaultHours(): OperatingHourInput[] {
  return DAY_LABELS.map((_, day_of_week) => ({
    day_of_week,
    open_time: "09:00",
    close_time: "22:00",
    is_closed: day_of_week === 6, // domingo cerrado por defecto
  }));
}

interface OperatingHoursEditorProps {
  restaurantId: string;
}

export default function OperatingHoursEditor({
  restaurantId,
}: OperatingHoursEditorProps) {
  const { data: hours, isLoading } = useOperatingHours(restaurantId);
  const updateMutation = useUpdateOperatingHours();

  const [rows, setRows] = useState<OperatingHourInput[]>(buildDefaultHours());
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!hours) return;
    if (hours.length === 0) {
      setRows(buildDefaultHours());
      return;
    }
    const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
    setRows(
      DAY_LABELS.map((_, day_of_week) => {
        const existing = byDay.get(day_of_week);
        return {
          day_of_week,
          open_time: existing?.open_time ?? "09:00",
          close_time: existing?.close_time ?? "22:00",
          is_closed: existing?.is_closed ?? false,
        };
      })
    );
  }, [hours]);

  const updateRow = (
    day_of_week: number,
    field: keyof OperatingHourInput,
    value: string | boolean
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.day_of_week === day_of_week ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    try {
      const payload = rows.map((row) =>
        row.is_closed
          ? { ...row, open_time: null, close_time: null }
          : row
      );
      await updateMutation.mutateAsync({ restaurantId, hours: payload });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  const apiError = updateMutation.error
    ? getErrorMessage(updateMutation.error, "Error al guardar los horarios")
    : null;

  return (
    <div className="rounded-xl border border-[#2D3147] bg-[#1A1D27] p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
        <Clock className="h-4 w-4 text-[#6366F1]" />
        Horario de atención
      </div>

      {saveSuccess && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          ¡Horarios actualizados correctamente!
        </div>
      )}

      {apiError && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {apiError}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.day_of_week}
              className="flex flex-col gap-3 rounded-lg border border-[#2D3147] bg-[#0F1117] p-3 sm:flex-row sm:items-center"
            >
              <span className="w-24 shrink-0 text-sm font-medium text-gray-300">
                {DAY_LABELS[row.day_of_week]}
              </span>

              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer sm:w-28 shrink-0">
                <input
                  type="checkbox"
                  checked={row.is_closed}
                  onChange={(e) =>
                    updateRow(row.day_of_week, "is_closed", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-[#2D3147] bg-[#0F1117] text-[#6366F1] focus:ring-[#6366F1]"
                />
                Cerrado
              </label>

              <div className="flex flex-1 items-center gap-2">
                <input
                  type="time"
                  value={row.open_time ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    updateRow(row.day_of_week, "open_time", e.target.value)
                  }
                  className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] px-2.5 py-1.5 text-sm text-white focus:border-[#6366F1] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
                <span className="text-xs text-gray-500">a</span>
                <input
                  type="time"
                  value={row.close_time ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    updateRow(row.day_of_week, "close_time", e.target.value)
                  }
                  className="w-full rounded-lg border border-[#2D3147] bg-[#1A1D27] px-2.5 py-1.5 text-sm text-white focus:border-[#6366F1] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2D3147] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#1F2234] hover:text-white disabled:opacity-50 transition"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Guardar horarios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
