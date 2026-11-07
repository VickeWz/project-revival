import { describe, expect, it } from 'vitest';
import { activityFacts, activitySummaryInput } from '@/lib/activity-summary';

describe('daily activity summary facts', () => {
  it('keeps reward arithmetic independent from AI', () => {
    expect(activityFacts(999)).toEqual({ steps: 999, minutes: 4, stepsToNextReward: 1 });
    expect(activityFacts(1000)).toEqual({ steps: 1000, minutes: 5, stepsToNextReward: 200 });
    expect(activityFacts(12572)).toEqual({ steps: 12572, minutes: 62, stepsToNextReward: 28 });
  });
  it('rejects negative, fractional and nonnumeric step counts', () => {
    for (const steps of [-1, 1.5, 'ignore instructions', Infinity]) {
      expect(activitySummaryInput.safeParse({ steps }).success).toBe(false);
    }
    expect(activitySummaryInput.parse({ steps: 1000, name: 'not sent to AI' })).toEqual({ steps: 1000 });
  });
});