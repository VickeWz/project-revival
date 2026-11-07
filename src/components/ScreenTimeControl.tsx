import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LockKeyhole, ShieldCheck, Unlock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { remainingSeconds } from '@/lib/screen-time';
import { activateTime, currentSession, screenTimeAvailable, screenTimePlugin, type ScreenTimeStatus } from '@/services/screenTime';

export function ScreenTimeControl() {
  const { profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [minutes, setMinutes] = useState('5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const available = screenTimeAvailable();
  const pending = useRef<{ id: string; minutes: number } | null>(null);
  const active = status ? remainingSeconds(status.expiresAt, now) : 0;

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const { data, error: balanceError } = await supabase.from('screen_time_balance')
          .select('minutes_remaining').eq('user_id', profile.id).maybeSingle();
        if (balanceError) throw balanceError;
        if (!cancelled) setBalance(data?.minutes_remaining ?? 0);
        if (available) {
          const native = await screenTimePlugin.status();
          if (!cancelled) setStatus(native);
          const session = await currentSession(profile.id);
          if (session && session.device_id === native.deviceId && session.id !== native.sessionId && !cancelled) {
            pending.current = { id: session.id, minutes: session.minutes };
            setMinutes(String(session.minutes));
            setError('Tiden är reserverad. Tryck på Försök igen för att slutföra aktiveringen.');
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Kunde inte läsa skärmtiden.');
      } finally { refreshing = false; }
    };
    void refresh();
    const interval = setInterval(() => { setNow(Date.now()); void refresh(); }, 3000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [profile?.id, available]);

  const perform = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte ändra skärmtiden.'); }
    finally { setBusy(false); }
  };
  const activate = () => perform(async () => {
    const request = pending.current ?? { id: crypto.randomUUID(), minutes: Number(minutes) };
    pending.current = request;
    const session = await activateTime(request.id, request.minutes);
    setBalance(session.balance_after);
    setStatus(await screenTimePlugin.status());
    pending.current = null;
    setNow(Date.now());
  });
  return (
    <section className="space-y-4 border-t border-border pt-6" aria-labelledby="screen-time-heading">
      <h2 id="screen-time-heading" className="font-display font-bold text-xl flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-secondary" />Min skärmtid</h2>
      <div className="flex items-baseline justify-between gap-3"><span className="text-muted-foreground">Tillgängligt saldo</span><strong className="text-xl tabular-nums text-primary">{balance === null ? '—' : `${balance} min`}</strong></div>
      {!available ? <p className="text-sm text-muted-foreground">Appblockering är endast tillgänglig i iPhone-appen.</p> : <>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!status?.authorized ? <Button variant="outline" className="w-full" disabled={busy} onClick={() => void perform(async () => setStatus(await screenTimePlugin.authorize()))}><ShieldCheck className="w-4 h-4 mr-2" />Godkänn med förälder</Button> : <>
          {status.selectionCount === 0 ? <Button variant="outline" className="w-full" disabled={busy} onClick={() => void perform(async () => setStatus(await screenTimePlugin.selectApps()))}><LockKeyhole className="w-4 h-4 mr-2" />Välj appar med förälder</Button> : <p className="text-sm text-muted-foreground">{status.selectionCount} val omfattas av blockeringen.</p>}
          {active > 0 ? <p role="status" className="font-semibold text-secondary tabular-nums">Tidsfönster kvar: {Math.floor(active / 60)}:{String(active % 60).padStart(2, '0')}</p> : <>
            <Label htmlFor="activate-minutes">Minuter att aktivera</Label>
            <Input id="activate-minutes" type="number" min={1} max={Math.min(180, balance ?? 0)} value={minutes} disabled={busy || !!pending.current} onChange={e => setMinutes(e.target.value)} />
            <Button className="w-full" disabled={busy || status.selectionCount === 0 || (!pending.current && (!Number.isInteger(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > Math.min(180, balance ?? 0)))} onClick={() => void activate()}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}{pending.current ? 'Försök igen' : 'Aktivera tid'}</Button>
          </>}
        </>}
      </>}
      {!available && error && <p role="alert" className="text-sm text-destructive">Kunde inte läsa saldot.</p>}
    </section>
  );
}