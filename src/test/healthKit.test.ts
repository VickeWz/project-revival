import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  queryAggregated: vi.fn(),
  requestAuthorization: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));
vi.mock('@capgo/capacitor-health', () => ({ Health: native }));

import { healthKitService } from '../services/healthKit';

describe('Capacitor 8 HealthKit adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests read-only steps, walking distance and exercise time', async () => {
    native.requestAuthorization.mockResolvedValue({});
    expect(await healthKitService.requestAuthorization()).toBe(true);
    expect(native.requestAuthorization).toHaveBeenCalledWith({
      read: ['steps', 'distance', 'exerciseTime'], write: [],
    });
  });

  it('reads activity in counts, meters and minutes through the new API', async () => {
    native.queryAggregated.mockImplementation(async ({ dataType }) => ({
      samples: [{ value: { steps: 4200, distance: 1350, exerciseTime: 18 }[dataType as 'steps' | 'distance' | 'exerciseTime'] }],
    }));
    expect(await healthKitService.getTodayData()).toEqual({ steps: 4200, distance: 1350, activeMinutes: 18 });
    expect(native.queryAggregated).toHaveBeenCalledWith(expect.objectContaining({ dataType: 'distance', aggregation: 'sum' }));
  });

  it('reads pass distance from its start time in meters', async () => {
    native.queryAggregated.mockResolvedValue({ samples: [{ value: 123 }, { value: 277 }] });
    const start = new Date('2026-11-04T12:00:00Z');
    expect(await healthKitService.getDistanceSince(start)).toBe(400);
    expect(native.queryAggregated).toHaveBeenCalledWith(expect.objectContaining({ startDate: start.toISOString(), dataType: 'distance' }));
  });

  it('handles permission errors', async () => {
    native.requestAuthorization.mockRejectedValue(new Error('Permission unavailable'));
    expect(await healthKitService.requestAuthorization()).toBe(false);
  });

  it('reads only steps inside the pass start and end window', async () => {
    native.queryAggregated.mockImplementation(async ({ dataType }) => ({
      samples: [{ value: dataType === 'steps' ? 1000 : 750 }],
    }));
    const start = new Date('2026-11-07T12:00:00Z');
    const end = new Date('2026-11-07T12:10:00Z');
    const data = await healthKitService.getPassData(start, end);
    expect(data).toEqual({ steps: 1000, distance: 750, activeMinutes: 10 });
    expect(healthKitService.calculateScreenTimeEarned(data)).toBe(5);
    expect(native.queryAggregated).toHaveBeenCalledWith(expect.objectContaining({
      dataType: 'steps', startDate: start.toISOString(), endDate: end.toISOString(),
    }));
  });
});
describe('screen time rule', () => {
  it('gives 5 minutes per full 1000 steps', () => {
    expect(healthKitService.calculateScreenTimeEarned({ steps: 999, distance: 5000, activeMinutes: 30 })).toBe(0);
    expect(healthKitService.calculateScreenTimeEarned({ steps: 1000, distance: 0, activeMinutes: 0 })).toBe(5);
    expect(healthKitService.calculateScreenTimeEarned({ steps: 12572, distance: 0, activeMinutes: 0 })).toBe(60);
  });
});

describe('foreground HealthKit sync', () => {
  afterEach(() => vi.useRealTimers());

  it('replaces cumulative samples every three seconds without counting them twice', async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockResolvedValue({ steps: 1000, distance: 700, activeMinutes: 10 });
    const received: number[] = [];
    const stop = healthKitService.watchData(read, (data) => received.push(data.steps));
    await vi.advanceTimersByTimeAsync(0);
    read.mockResolvedValue({ steps: 2000, distance: 1400, activeMinutes: 15 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(received).toEqual([1000, 2000]);
    expect(healthKitService.calculateScreenTimeEarned({ steps: received[1] ?? 0, distance: 1400, activeMinutes: 15 })).toBe(10);
    stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('does not overlap reads or update after the watcher stops', async () => {
    vi.useFakeTimers();
    let resolve: (data: { steps: number; distance: number; activeMinutes: number }) => void = () => {};
    const read = vi.fn(() => new Promise<{ steps: number; distance: number; activeMinutes: number }>((done) => { resolve = done; }));
    const onData = vi.fn();
    const stop = healthKitService.watchData(read, onData);
    await vi.advanceTimersByTimeAsync(9000);
    expect(read).toHaveBeenCalledTimes(1);
    stop();
    resolve({ steps: 1000, distance: 700, activeMinutes: 10 });
    await vi.advanceTimersByTimeAsync(0);
    expect(onData).not.toHaveBeenCalled();
  });

  it('keeps the previous total on a failed query and retries on focus', async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValue({ steps: 1000, distance: 700, activeMinutes: 10 });
    const onData = vi.fn();
    const onError = vi.fn();
    const stop = healthKitService.watchData(read, onData, onError);
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(onData).toHaveBeenCalledWith({ steps: 1000, distance: 700, activeMinutes: 10 });
    stop();
  });
});
