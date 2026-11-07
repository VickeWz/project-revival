import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ summarize: vi.fn(), available: true, read: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => mocks.summarize }));
vi.mock('@/lib/activity-summary.functions', () => ({ summarizeActivity: vi.fn() }));
vi.mock('@/services/healthKit', () => ({ healthKitService: {
  isAvailable: () => mocks.available,
  requestAuthorization: async () => true,
  getTodayData: mocks.read,
  calculateScreenTimeEarned: (data: { steps: number }) => Math.floor(data.steps / 1000) * 5,
} }));
import { ActivitySummary } from '@/components/home/ActivitySummary';
beforeEach(() => { vi.clearAllMocks(); mocks.available = true; });
afterEach(cleanup);

it('sends only synced steps and displays deterministic minutes and the AI response', async () => {
  const onSync = vi.fn();
  mocks.read.mockResolvedValue({ steps: 1000, distance: 700, activeMinutes: 15 });
  mocks.summarize.mockResolvedValue({ steps: 1000, minutes: 5, stepsToNextReward: 1000, summary: 'Bra jobbat idag!', error: null });
  render(<ActivitySummary onSync={onSync} />);
  fireEvent.click(screen.getByRole('button', { name: 'Synka & sammanfatta' }));
  await screen.findByText('Bra jobbat idag!');
  expect(mocks.summarize).toHaveBeenCalledWith({ data: { steps: 1000 } });
  expect(onSync).toHaveBeenCalledWith({ steps: 1000, distance: 700, activeMinutes: 15 });
  expect(screen.getByText(/5 min skärmtid/)).toBeInTheDocument();
});

it('preserves steps and reward calculation when AI is unavailable', async () => {
  mocks.read.mockResolvedValue({ steps: 2000, distance: 1400, activeMinutes: 20 });
  mocks.summarize.mockRejectedValue(new Error('AI unavailable'));
  render(<ActivitySummary onSync={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Synka & sammanfatta' }));
  await screen.findByRole('alert');
  expect(screen.getByText(/10 min skärmtid/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Synka & sammanfatta' })).toBeEnabled();
});

it('does not send invented HealthKit steps in the web preview', async () => {
  mocks.available = false;
  render(<ActivitySummary onSync={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Synka & sammanfatta' }));
  await screen.findByRole('alert');
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.summarize).not.toHaveBeenCalled();
});