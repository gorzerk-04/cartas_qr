import { PublicSchedule } from "../types";

const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

// day_of_week: 0=Lunes...6=Domingo (igual que el backend). Date.getDay() usa 0=Domingo,
// por eso se convierte antes de comparar.
export function getNextOpeningLabel(schedules: PublicSchedule[]): string | null {
  if (!schedules.length) return null;

  const todayIndex = (new Date().getDay() + 6) % 7;

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7;
    const daySchedule = schedules.find((s) => s.day_of_week === dayIndex);
    if (daySchedule && !daySchedule.is_closed && daySchedule.open_time) {
      const dayLabel = offset === 0 ? "hoy" : offset === 1 ? "mañana" : DAY_NAMES[dayIndex];
      return `abre ${dayLabel} a las ${daySchedule.open_time}`;
    }
  }
  return null;
}
