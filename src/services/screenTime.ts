import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { activateEarnedTime, screenTimeSession, type ScreenTimeSession } from '@/lib/screen-time';

export interface ScreenTimeStatus {
  authorized: boolean; selectionCount: number; deviceId: string;
  expiresAt: number; sessionId: string; configured: boolean;
}
interface ScreenTimePlugin {
  status(): Promise<ScreenTimeStatus>;
  authorize(): Promise<ScreenTimeStatus>;
  selectApps(): Promise<ScreenTimeStatus>;
  activate(options: { sessionId: string; expiresAt: number }): Promise<ScreenTimeStatus>;
}
export const screenTimePlugin = registerPlugin<ScreenTimePlugin>('GameRunScreenTime');
export const screenTimeAvailable = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('GameRunScreenTime');

export async function redeemTime(id: string, device: string, minutes: number) {
  const { data, error } = await supabase.rpc('redeem_screen_time', { p_id: id, p_device_id: device, p_minutes: minutes });
  if (error) throw new Error('Kunde inte aktivera tiden. Kontrollera saldot och anslutningen.');
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