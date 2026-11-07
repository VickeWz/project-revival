import { z } from 'zod';
import { earnedScreenMinutes, stepsToNextMinute } from '@/lib/pass-metrics';

export const activitySummaryInput = z.object({
  steps: z.number().int().min(0).max(200000),
});

export function activityFacts(steps: number) {
  const minutes = earnedScreenMinutes(steps);
  return { steps, minutes, stepsToNextReward: stepsToNextMinute(steps) };
}

export function activitySummaryPrompt(steps: number) {
  const facts = activityFacts(steps);
  return `Sammanfatta dagens aktivitet för ett barn på svenska i högst två korta meningar. Var vänlig, saklig och utan press, skuld eller medicinska råd. Använd endast dessa fakta: ${facts.steps} steg har lästs från Apple Hälsa idag. De motsvarar ${facts.minutes} minuter enligt 200 steg = 1 minut per helt tvåhundratal (1000 steg = 5 minuter). ${facts.stepsToNextReward} steg återstår till nästa minut. Hitta inte på aktivitet, sträcka, tider eller andra belöningar. Säg inte att saldot har fyllts på: detta är dagens beräkning, inte en saldoändring.`;
}