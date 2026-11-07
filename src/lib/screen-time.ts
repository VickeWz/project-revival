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

export interface ActivationBridge {
  status(): Promise<{ authorized: boolean; selectionCount: number; deviceId: string }>;
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
  if (!status.authorized || status.selectionCount < 1) throw new Error('Godkänn skärmtid och välj appar först.');
  const session = screenTimeSession.parse(await redeem(id, status.deviceId, minutes));
  if (session.id !== id || session.device_id !== status.deviceId || session.minutes !== minutes) {
    throw new Error('Aktiveringen matchar inte den här iPhonen.');
  }
  if (Date.parse(session.expires_at) <= Date.now()) throw new Error('Tidsfönstret har löpt ut.');
  await bridge.activate({ sessionId: session.id, expiresAt: Date.parse(session.expires_at) });
  return session;
}