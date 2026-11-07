import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { healthKitService, type HealthData } from '@/services/healthKit';

interface MotionReading { sessionId: string; steps: number; distance?: number | undefined }
interface MotionPlugin {
  start(options: { sessionId: string; startedAt: number }): Promise<void>;
  stop(options: { sessionId: string }): Promise<void>;
  addListener(event: 'motionUpdate', callback: (data: MotionReading) => void): Promise<PluginListenerHandle>;
  addListener(event: 'motionError', callback: (data: { sessionId: string }) => void): Promise<PluginListenerHandle>;
}
const motion = registerPlugin<MotionPlugin>('GameRunMotion');

// Both sources report cumulative totals over the SAME pass; never sum them.
export function watchPassData(
  session: { id: string; startTime: Date },
  onData: (data: HealthData) => void,
  onError: () => void,
): () => void {
  let stopped = false;
  let live: MotionReading | undefined;
  let health: HealthData = { steps: 0, distance: 0, activeMinutes: 0 };
  const listeners: PluginListenerHandle[] = [];
  const emit = () => {
    if (stopped) return;
    onData({
      steps: live?.steps ?? health.steps,
      distance: live?.distance ?? health.distance,
      activeMinutes: Math.max(0, Math.floor((Date.now() - session.startTime.getTime()) / 60000)),
    });
  };
  const stopHealth = healthKitService.watchData(
    () => healthKitService.getPassData(session.startTime),
    (data) => { health = data; emit(); },
    () => { if (!live && !stopped) onError(); },
    1000,
  );
  const attach = async (handle: PluginListenerHandle) => {
    if (stopped) await handle.remove();
    else listeners.push(handle);
  };
  if (Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('GameRunMotion')) {
    void (async () => {
      try {
        await attach(await motion.addListener('motionUpdate', (data) => {
          if (stopped || data.sessionId !== session.id || !Number.isFinite(data.steps) || data.steps < 0) return;
          if (live && data.steps < live.steps) return;
          live = {
            sessionId: data.sessionId,
            steps: Math.floor(data.steps),
            distance: typeof data.distance === 'number' && Number.isFinite(data.distance) && data.distance >= 0
              ? data.distance : undefined,
          };
          emit();
        }));
        if (stopped) return;
        await attach(await motion.addListener('motionError', (data) => {
          if (stopped || data.sessionId !== session.id) return;
          live = undefined;
          emit();
        }));
        if (stopped) return;
        await motion.start({ sessionId: session.id, startedAt: session.startTime.getTime() });
        if (stopped) await motion.stop({ sessionId: session.id });
      } catch {
        live = undefined;
        // Missing/denied motion must retain real HealthKit reads, never simulated data.
        emit();
      }
    })();
  }
  return () => {
    stopped = true;
    stopHealth();
    for (const listener of listeners) void listener.remove().catch(() => {});
    if (Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('GameRunMotion')) {
      void motion.stop({ sessionId: session.id }).catch(() => {});
    }
  };
}