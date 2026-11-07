import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  available: true,
  healthData: undefined as undefined | ((data: { steps: number; distance: number; activeMinutes: number }) => void),
  events: {} as { motionUpdate?: (data: any) => void; motionError?: (data: any) => void },
  start: vi.fn(), stop: vi.fn(), remove: vi.fn(), stopHealth: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'ios', isPluginAvailable: () => mocks.available },
  registerPlugin: () => ({
    start: mocks.start, stop: mocks.stop,
    addListener: async (event: 'motionUpdate' | 'motionError', callback: (data: any) => void) => {
      mocks.events[event] = callback;
      return { remove: mocks.remove };
    },
  }),
}));
vi.mock('@/services/healthKit', () => ({ healthKitService: {
  getPassData: vi.fn(),
  watchData: (_read: unknown, callback: typeof mocks.healthData) => {
    mocks.healthData = callback;
    return mocks.stopHealth;
  },
} }));
import { watchPassData } from '@/services/passTracking';

const session = { id: 'pass-1', startTime: new Date('2026-11-07T20:00:00Z') };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.events = {};
  mocks.available = true;
  mocks.start.mockResolvedValue({});
  mocks.stop.mockResolvedValue({});
  mocks.remove.mockResolvedValue({});
});
afterEach(() => vi.restoreAllMocks());

it('delivers cumulative Core Motion steps and distance without adding delayed HealthKit totals', async () => {
  const data = vi.fn();
  const stop = watchPassData(session, data, vi.fn());
  await vi.waitFor(() => expect(mocks.start).toHaveBeenCalledWith({ sessionId: 'pass-1', startedAt: session.startTime.getTime() }));
  mocks.healthData?.({ steps: 150, distance: 100, activeMinutes: 1 });
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 200, distance: 110 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 200, distance: 110 }));
  mocks.healthData?.({ steps: 150, distance: 100, activeMinutes: 1 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 200, distance: 110 }));
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 201, distance: 111 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 201, distance: 111 }));
  stop();
  const count = data.mock.calls.length;
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 400, distance: 220 });
  expect(data).toHaveBeenCalledTimes(count);
  expect(mocks.stopHealth).toHaveBeenCalledOnce();
  expect(mocks.remove).toHaveBeenCalledTimes(2);
});

it('retains HealthKit distance when the pedometer does not provide a distance estimate', async () => {
  const data = vi.fn();
  const stop = watchPassData(session, data, vi.fn());
  await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled());
  mocks.healthData?.({ steps: 100, distance: 70, activeMinutes: 0 });
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 200 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 200, distance: 70 }));
  stop();
});

it('uses only real HealthKit totals when Core Motion is unavailable', () => {
  mocks.available = false;
  const data = vi.fn();
  const stop = watchPassData(session, data, vi.fn());
  mocks.healthData?.({ steps: 200, distance: 110, activeMinutes: 0 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 200, distance: 110 }));
  expect(mocks.start).not.toHaveBeenCalled();
  stop();
});

it('falls back to HealthKit if motion access is denied', async () => {
  mocks.start.mockRejectedValue(new Error('Denied'));
  const data = vi.fn();
  const stop = watchPassData(session, data, vi.fn());
  await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled());
  mocks.healthData?.({ steps: 199, distance: 100, activeMinutes: 0 });
  expect(data).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 199, distance: 100 }));
  stop();
});

it('rejects stale sessions, invalid numbers and decreasing readings', async () => {
  const data = vi.fn();
  const stop = watchPassData(session, data, vi.fn());
  await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled());
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 200, distance: 110 });
  const count = data.mock.calls.length;
  mocks.events.motionUpdate?.({ sessionId: 'old', steps: 9999 });
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: NaN });
  mocks.events.motionUpdate?.({ sessionId: 'pass-1', steps: 199 });
  expect(data).toHaveBeenCalledTimes(count);
  stop();
});