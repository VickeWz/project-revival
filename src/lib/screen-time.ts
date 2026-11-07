// GameRun earning rule: every full 1000 steps = 5 minutes of screen time.
export const STEPS_PER_REWARD = 1000;
export const MINUTES_PER_REWARD = 5;

export function screenTimeFromSteps(steps: number): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return Math.floor(steps / STEPS_PER_REWARD) * MINUTES_PER_REWARD;
}

export function stepsToNextReward(steps: number): number {
  const s = Math.max(0, Math.floor(Number.isFinite(steps) ? steps : 0));
  return STEPS_PER_REWARD - (s % STEPS_PER_REWARD);
}
