import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getPassData: vi.fn(),
  query: vi.fn(),
  onData: undefined as undefined | ((data: { steps: number; distance: number; activeMinutes: number }) => void),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: { id: 'child-profile' } }) }));
vi.mock('@/lib/router-compat', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('@/components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => mocks.query(), rpc: mocks.rpc } }));
vi.mock('@/services/healthKit', () => ({ healthKitService: {
  requestAuthorization: async () => true,
  getPassData: mocks.getPassData,
  calculateScreenTimeEarned: (data: { steps: number }) => Math.floor(data.steps / 200),
  watchData: (_read: unknown, onData: typeof mocks.onData) => { mocks.onData = onData; return () => {}; },
} }));

import Pass from '@/screens/Pass';

beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data: [] });
  chain.maybeSingle.mockResolvedValue({ data: { minutes_remaining: 10 } });
  mocks.query.mockReturnValue(chain);
});
afterEach(cleanup);

it('shows session steps and credits 5 minutes from the final 1000-step read', async () => {
  mocks.getPassData.mockResolvedValue({ steps: 1000, distance: 700, activeMinutes: 10 });
  mocks.rpc.mockResolvedValue({ data: { earned_minutes: 5, balance: 15 }, error: null });
  render(<Pass />);
  fireEvent.click(screen.getByText('Start Pass'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start Pass' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Start Pass' }));
  await screen.findByRole('button', { name: 'End Pass' });
  const { act } = await import('@testing-library/react');
  act(() => mocks.onData?.({ steps: 999, distance: 700, activeMinutes: 10 }));
  expect(screen.getByText('999')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End Pass' }));
  await screen.findByText('15m');
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith('complete_step_pass', expect.objectContaining({ p_steps: 1000, p_distance: 700 }));
});

it('retains the session identifier on a failed save so retry cannot double-credit', async () => {
  mocks.getPassData.mockResolvedValue({ steps: 2000, distance: 1400, activeMinutes: 20 });
  mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Offline') })
    .mockResolvedValueOnce({ data: { earned_minutes: 10, balance: 20 }, error: null });
  render(<Pass />);
  fireEvent.click(screen.getByText('Start Pass'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start Pass' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Start Pass' }));
  fireEvent.click(await screen.findByRole('button', { name: 'End Pass' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'End Pass' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'End Pass' }));
  await screen.findByText('20m');
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc.mock.calls[0]?.[1]).toEqual(mocks.rpc.mock.calls[1]?.[1]);
});