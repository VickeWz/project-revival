export function unlockMinutesRemaining(expiresAt: string | null, now = Date.now()): number {
  if (!expiresAt) return 0;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 60000)) : 0;
}