export const STEPS_PER_MINUTE = 200;

export function earnedScreenMinutes(steps: number): number {
  return Number.isFinite(steps) ? Math.floor(Math.max(0, steps) / STEPS_PER_MINUTE) : 0;
}

export function stepsToNextMinute(steps: number): number {
  return STEPS_PER_MINUTE - Math.max(0, Math.floor(steps)) % STEPS_PER_MINUTE;
}

export function formatPassDistance(distance: number): string {
  const meters = Number.isFinite(distance) ? Math.max(0, Math.floor(distance)) : 0;
  if (meters <= 100) return `${meters} m`;
  if (meters < 1000) return `${Math.floor(meters / 10) * 10} m`;
  return `${(Math.floor(meters / 100) / 10).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`;
}