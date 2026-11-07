import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});