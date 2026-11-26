import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { activateEarnedTime, screenTimeSession, type LockMode, type LockStatus, type ScreenTimeSession } from '@/lib/screen-time';

export interface NativeLimitStatus { id: string; minutes: number; selectionCount: number; reached: boolean }

export interface ScreenTimeStatus extends LockStatus {
  deviceId: string; expiresAt: number; sessionId: string; configured: boolean;
  /** Same as selectionCount; present on builds with lock modes. */
  blockedCount?: number;
  /** Downtime fields: timestamps in ms, 0 when there is none. */
  downtimeActive?: boolean;
  downtimeEndsAt?: number;
  nextDowntimeAt?: number;
  limits?: NativeLimitStatus[];
  /** The JSON last sent with setDowntime / setLimits, to skip unchanged rules. */
  downtimeJson?: string;
  limitsJson?: string;
}
interface ScreenTimePlugin {
  status(): Promise<ScreenTimeStatus>;
  authorize(): Promise<ScreenTimeStatus>;
  /** Apps, categories and websites locked in the "selected" mode. */
  selectApps(): Promise<ScreenTimeStatus>;
  /** Apps and websites that stay open in the "all" mode. */
  selectAllowedApps(): Promise<ScreenTimeStatus>;
  setLockMode(options: { mode: LockMode }): Promise<ScreenTimeStatus>;
  /** json: NativeDowntime[] from src/lib/device-rules.ts. Replaces all downtime rules. */
  setDowntime(options: { json: string }): Promise<ScreenTimeStatus>;
  /** json: NativeLimit[]. Restarts today's usage counting, so call it only when limits changed. */
  setLimits(options: { json: string }): Promise<ScreenTimeStatus>;
  selectLimitApps(options: { limitId: string; name: string }): Promise<ScreenTimeStatus>;
  activate(options: { sessionId: string; expiresAt: number }): Promise<ScreenTimeStatus>;
}
export const screenTimePlugin = registerPlugin<ScreenTimePlugin>('GameRunScreenTime');
export const screenTimeAvailable = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('GameRunScreenTime');

export async function redeemTime(id: string, device: string, minutes: number) {
  const { data, error } = await supabase.rpc('redeem_screen_time', { p_id: id, p_device_id: device, p_minutes: minutes });
  if (error) {
    if (/Downtime active/i.test(error.message)) throw new Error('Skärmfri tid pågår. Du kan låsa upp efter den.');
    if (/Ends in downtime/i.test(error.message)) throw new Error('Upplåsningen skulle gå in i skärmfri tid. Välj färre minuter.');
    throw new Error('Kunde inte aktivera tiden. Kontrollera saldot och anslutningen.');
  }
  return data;
}

export function activateTime(id: string, minutes: number) {
  return activateEarnedTime(screenTimePlugin, redeemTime, id, minutes);
}

export async function currentSession(profileId: string): Promise<ScreenTimeSession | null> {
  const { data, error } = await supabase.from('screen_time_sessions').select('*')
    .eq('profile_id', profileId).gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? screenTimeSession.parse(data) : null;
}