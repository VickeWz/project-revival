import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getPassData: vi.fn(),
  query: vi.fn(),
  search: '',
  onData: undefined as undefined | ((data: { steps: number; distance: number; activeMinutes: number }) => void),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: { id: 'child-profile' } }) }));
vi.mock('@/lib/router-compat', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(mocks.search)],
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/BottomNav', () => ({ BottomNav: () => null }));
// The AI summary has its own tests; here it would need the server-function runtime.
vi.mock('@/components/home/ActivitySummary', () => ({ ActivitySummary: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => mocks.query(), rpc: mocks.rpc } }));
vi.mock('@/services/healthKit', () => ({ healthKitService: {
  requestAuthorization: async () => true,
  getPassData: mocks.getPassData,
  calculateScreenTimeEarned: (data: { steps: number }) => Math.floor(data.steps / 200),
  watchData: (_read: unknown, onData: typeof mocks.onData) => { mocks.onData = onData; return () => {}; },
} }));

import Pass from '@/screens/Pass';

vi.mock('@/services/passTracking', () => ({
  watchPassData: (_session: unknown, onData: typeof mocks.onData) => { mocks.onData = onData; return () => {}; },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = '';
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data: [] });
  chain.maybeSingle.mockResolvedValue({ data: { minutes_remaining: 10 } });
  mocks.query.mockReturnValue(chain);
});
afterEach(cleanup);

async function startPass() {
  render(<Pass />);
  fireEvent.click(screen.getByRole('button', { name: 'Starta pass' }));
  return screen.findByRole('button', { name: 'Avsluta pass' });
}

it('starts a pass with one tap from the Rörelse part', async () => {
  expect(await startPass()).toBeEnabled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('lets the child switch to the Uppgifter part', () => {
  render(<Pass />);
  expect(screen.getByRole('tab', { name: /Rörelse/ })).toHaveAttribute('aria-selected', 'true');
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Uppgifter/ }));
  expect(screen.getByText('Uppgifter kommer snart')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Starta pass' })).not.toBeInTheDocument();
});

it('opens the Uppgifter part directly from a ?del=uppgifter link on Hem', () => {
  mocks.search = 'del=uppgifter';
  render(<Pass />);
  expect(screen.getByRole('tab', { name: /Uppgifter/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Uppgifter kommer snart')).toBeInTheDocument();
});

it('updates each received step and earned minute while the pass stays active', async () => {
  await startPass();
  const { act } = await import('@testing-library/react');
  const samples: Array<[number, number]> = [[199, 0], [200, 1], [201, 1], [400, 2]];
  for (const [steps, minutes] of samples) {
    act(() => mocks.onData?.({ steps, distance: 110, activeMinutes: 1 }));
    expect(screen.getByLabelText('Steg under passet')).toHaveTextContent(String(steps));
    expect(screen.getByLabelText('Intjänade minuter')).toHaveTextContent(String(minutes));
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('saves one minute for a 200-step pass and shows the result screen', async () => {
  mocks.getPassData.mockResolvedValue({ steps: 200, distance: 110, activeMinutes: 1 });
  mocks.rpc.mockResolvedValue({ data: { earned_minutes: 1, balance: 11 }, error: null });
  fireEvent.click(await startPass());
  await screen.findByText('Bra jobbat!');
  expect(screen.getByText('+1 min')).toBeInTheDocument();
  expect(screen.getByText('11 min')).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledWith('complete_step_pass', expect.objectContaining({ p_steps: 200 }));
});

it('shows session steps and credits 5 minutes from the final 1000-step read', async () => {
  mocks.getPassData.mockResolvedValue({ steps: 1000, distance: 700, activeMinutes: 10 });
  mocks.rpc.mockResolvedValue({ data: { earned_minutes: 5, balance: 15 }, error: null });
  await startPass();
  const { act } = await import('@testing-library/react');
  act(() => mocks.onData?.({ steps: 999, distance: 700, activeMinutes: 10 }));
  expect(screen.getByText('999')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Avsluta pass' }));
  await screen.findByText('15 min');
  expect(screen.getByText('+5 min')).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith('complete_step_pass', expect.objectContaining({ p_steps: 1000, p_distance: 700 }));
});

it('retains the session identifier on a failed save so retry cannot double-credit', async () => {
  mocks.getPassData.mockResolvedValue({ steps: 2000, distance: 1400, activeMinutes: 20 });
  mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Offline') })
    .mockResolvedValueOnce({ data: { earned_minutes: 10, balance: 20 }, error: null });
  fireEvent.click(await startPass());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Avsluta pass' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Avsluta pass' }));
  await screen.findByText('20 min');
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc.mock.calls[0]?.[1]).toEqual(mocks.rpc.mock.calls[1]?.[1]);
});
