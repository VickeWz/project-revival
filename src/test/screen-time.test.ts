import { describe, expect, it, vi } from 'vitest';
import { activateEarnedTime, remainingSeconds } from '@/lib/screen-time';

const id = '11111111-1111-4111-8111-111111111111';
const device = '22222222-2222-4222-8222-222222222222';
const profile = '33333333-3333-4333-8333-333333333333';
function setup() {
  const session = { id, device_id: device, profile_id: profile, minutes: 5,
    started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString(), balance_after: 10 };
  const redeem = vi.fn().mockResolvedValue(session);
  const bridge = { status: vi.fn().mockResolvedValue({ authorized: true, selectionCount: 1, deviceId: device }), activate: vi.fn().mockResolvedValue({}) };
  return { session, redeem, bridge };
}
describe('earned time activation', () => {
  it('opens selected apps for the redeemed amount with the original absolute expiry', async () => {
    const { bridge, redeem, session } = setup();
    const result = await activateEarnedTime(bridge, redeem, id, 5);
    expect(redeem).toHaveBeenCalledWith(id, device, 5);
    expect(bridge.activate).toHaveBeenCalledWith({ sessionId: id, expiresAt: Date.parse(session.expires_at) });
    expect(result.balance_after).toBe(10);
  });
  it('never redeems before authorization and selected apps exist', async () => {
    const { bridge, redeem } = setup();
    bridge.status.mockResolvedValue({ authorized: false, selectionCount: 1, deviceId: device });
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    expect(redeem).not.toHaveBeenCalled();
    bridge.status.mockResolvedValue({ authorized: true, selectionCount: 0, deviceId: device });
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    expect(redeem).not.toHaveBeenCalled();
  });
  it('does not open apps when the balance transaction rejects', async () => {
    const { bridge, redeem } = setup();
    redeem.mockRejectedValue(new Error('Insufficient balance'));
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    expect(bridge.activate).not.toHaveBeenCalled();
  });
  it('retries native failure with the same debit ID and no extended expiry', async () => {
    const { bridge, redeem, session } = setup();
    bridge.activate.mockRejectedValueOnce(new Error('Scheduling failed'));
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    await activateEarnedTime(bridge, redeem, id, 5);
    expect(redeem.mock.calls).toEqual([[id, device, 5], [id, device, 5]]);
    expect(bridge.activate.mock.calls[0]).toEqual(bridge.activate.mock.calls[1]);
    expect(bridge.activate.mock.calls[1]?.[0].expiresAt).toBe(Date.parse(session.expires_at));
  });
  it('rejects a redemption for another iPhone', async () => {
    const { bridge, redeem, session } = setup();
    redeem.mockResolvedValue({ ...session, device_id: profile });
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    expect(bridge.activate).not.toHaveBeenCalled();
  });
  it('never opens an expired window and remaining time reaches zero', async () => {
    const { bridge, redeem, session } = setup();
    redeem.mockResolvedValue({ ...session, expires_at: new Date(Date.now() - 60000).toISOString() });
    await expect(activateEarnedTime(bridge, redeem, id, 5)).rejects.toThrow();
    expect(bridge.activate).not.toHaveBeenCalled();
    expect(remainingSeconds(5000, 5000)).toBe(0);
    expect(remainingSeconds(5000, 6000)).toBe(0);
    expect(remainingSeconds(5000, 2000)).toBe(3);
  });
  it('rejects zero and fractional minute activations before charging', async () => {
    const { bridge, redeem } = setup();
    for (const minutes of [0, -1, 1.5, 181]) await expect(activateEarnedTime(bridge, redeem, id, minutes)).rejects.toThrow();
    expect(redeem).not.toHaveBeenCalled();
  });
});