import { describe, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
vi.mock('@capgo/capacitor-health', () => ({ Health: {} }));
import { healthKitService } from '../services/healthKit';
describe('no fabricated measurements without iPhone sensors', () => {
  it('returns no fabricated weekly progress', async () => {
    expect(await healthKitService.getWeeklyData()).toEqual([]);
  });
  it('never simulates walked distance from elapsed time', async () => {
    await expect(healthKitService.getDistanceSince(new Date('2026-01-01'))).rejects.toThrow();
  });
});
