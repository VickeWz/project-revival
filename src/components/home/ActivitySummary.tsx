import { useState, useEffect, useRef } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCw, Sparkles, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { healthKitService, type HealthData } from '@/services/healthKit';
import { summarizeActivity } from '@/lib/activity-summary.functions';

export function ActivitySummary({ onSync }: { onSync: (data: HealthData) => void }) {
  const summarize = useServerFn(summarizeActivity);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ steps: number; minutes: number; stepsToNextReward: number; summary: string | null; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const sync = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!healthKitService.isAvailable()) throw new Error('Synkning från Hälsa kräver att GameRun körs på en iPhone.');
      if (!await healthKitService.requestAuthorization()) throw new Error('Tillåt GameRun att läsa steg från Hälsa i iPhones inställningar.');
      const data = await healthKitService.getTodayData();
      if (!mounted.current) return;
      onSync(data);
      setResult({ steps: data.steps, minutes: healthKitService.calculateScreenTimeEarned(data), stepsToNextReward: 1000 - data.steps % 1000, summary: null, error: null });
      const summary = await summarize({ data: { steps: data.steps } });
      if (mounted.current) { setResult(summary); setError(summary.error); }
    } catch (error) {
      if (mounted.current) setError(error instanceof Error && error.message.startsWith('Synkning')
        ? error.message : 'Kunde inte synka och sammanfatta. Kontrollera Hälsa-behörigheten och din anslutning.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <section className="mb-6 border-y border-border py-5" aria-labelledby="activity-summary-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-summary-heading" className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Dagens aktivitet
        </h2>
        <Button variant="secondary" onClick={sync} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? 'Synkar…' : 'Synka & sammanfatta'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Vid synkning skickas dagens stegantal till AI för sammanfattning.</p>
      {result && <div className="mt-4" aria-live="polite">
        <p className="text-foreground font-semibold">{result.steps.toLocaleString('sv-SE')} steg · {result.minutes} min skärmtid</p>
        <p className="text-xs text-muted-foreground mt-1">1 000 steg = 5 minuter · Dagens beräkning, inte tillgängligt saldo</p>
        {result.summary && <p className="mt-3 text-sm text-foreground">{result.summary}</p>}
      </div>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}