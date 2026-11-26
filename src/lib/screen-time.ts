import { z } from 'zod';

export const activationMinutes = z.number().int().min(1).max(180);
export const screenTimeSession = z.object({
  id: z.string().uuid(), device_id: z.string().uuid(), profile_id: z.string().uuid(),
  minutes: activationMinutes, started_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }), balance_after: z.number().int().nonnegative(),
});
export type ScreenTimeSession = z.infer<typeof screenTimeSession>;

export function remainingSeconds(expiresAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}

/** "all": the whole phone is locked except always-allowed apps. "selected": only chosen apps are locked. */
export type LockMode = 'all' | 'selected';

export interface LockStatus {
  authorized: boolean;
  /** Apps, categories and websites locked in the "selected" mode. */
  selectionCount: number;
  /** Missing on iPhone builds from before lock modes, which only know "selected". */
  lockMode?: LockMode;
  allowedCount?: number;
  needsAllowedApps?: boolean;
}

export const lockModeOf = (status: Pick<LockStatus, 'lockMode'>): LockMode => status.lockMode ?? 'selected';

/** Whether redeeming time can unlock anything on this iPhone. */
export function lockReady(status: LockStatus): boolean {
  if (!status.authorized) return false;
  return lockModeOf(status) === 'all'
    ? status.needsAllowedApps === false && (status.allowedCount ?? 0) > 0
    : status.selectionCount > 0;
}

export interface ActivationBridge {
  status(): Promise<LockStatus & { deviceId: string }>;
  activate(options: { sessionId: string; expiresAt: number }): Promise<unknown>;
}

// Keep the same ID after any failure. The database debit and iOS scheduling
// cannot be one transaction; retries reapply only the original expiry.
export async function activateEarnedTime(
  bridge: ActivationBridge,
  redeem: (id: string, device: string, minutes: number) => Promise<unknown>,
  id: string,
  minutes: number,
): Promise<ScreenTimeSession> {
  activationMinutes.parse(minutes);
  const status = await bridge.status();
  if (!lockReady(status)) {
    throw new Error(status.authorized && lockModeOf(status) === 'all'
      ? 'Välj alltid tillåtna appar med förälder först.'
      : 'Godkänn skärmtid och välj appar först.');
  }
  const session = screenTimeSession.parse(await redeem(id, status.deviceId, minutes));
  if (session.id !== id || session.device_id !== status.deviceId || session.minutes !== minutes) {
    throw new Error('Aktiveringen matchar inte den här iPhonen.');
  }
  if (Date.parse(session.expires_at) <= Date.now()) throw new Error('Tidsfönstret har löpt ut.');
  await bridge.activate({ sessionId: session.id, expiresAt: Date.parse(session.expires_at) });
  return session;
}