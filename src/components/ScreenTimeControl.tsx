import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AskParentTime } from '@/components/AskParentTime';
import { LockSettingsDrawer } from '@/components/LockSettingsDrawer';
import { MinutePicker } from '@/components/MinutePicker';
import { LockKeyhole, ShieldCheck, Unlock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceRules } from '@/hooks/useDeviceRules';
import { supabase } from '@/integrations/supabase/client';
import { claimDailyScreenTimeOnce } from '@/lib/daily-screen-time';
import { formatClock, minutesUntil } from '@/lib/device-rules';
import { lockModeOf, remainingSeconds } from '@/lib/screen-time';
import { activateTime, currentSession, screenTimeAvailable, screenTimePlugin, type ScreenTimeStatus } from '@/services/screenTime';

const MAX_ACTIVATION = 180;

/**
 * The balance card on Hem: how much time you have, unlocking it on iPhone,
 * and asking a parent for more. Balance logic and native calls are unchanged.
 */
export function ScreenTimeControl() {
  const { profile } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const available = screenTimeAvailable();
  const pending = useRef<{ id: string; minutes: number } | null>(null);
  const active = status ? remainingSeconds(status.expiresAt, now) : 0;
  // An unlock window may not reach into the next downtime (the server refuses it too).
  const nextDowntime = status?.nextDowntimeAt ?? 0;
  const untilDowntime = nextDowntime > 0 ? minutesUntil(nextDowntime, now) : Infinity;
  const maxMinutes = Math.min(MAX_ACTIVATION, balance ?? 0, untilDowntime);
  const { limits, syncError } = useDeviceRules(profile?.id, status, setStatus);
  const chosen = pending.current ? pending.current.minutes : Math.max(1, Math.min(minutes, maxMinutes));

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        // Today's base time from the parent, once per day (the database never gives it twice).
        const daily = await claimDailyScreenTimeOnce(profile.id);
        if (daily && !cancelled) {
          if (daily.expiredMinutes > 0) toast(`${daily.expiredMinutes} min oanvänd grundtid från i går har gått ut`);
          if (daily.grantedMinutes > 0) toast.success(`+${daily.grantedMinutes} min grundtid för i dag`);
        }
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
            setMinutes(session.minutes);
            setError('Tiden är reserverad. Tryck på Försök igen för att slutföra upplåsningen.');
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
    const request = pending.current ?? { id: crypto.randomUUID(), minutes: chosen };
    pending.current = request;
    const session = await activateTime(request.id, request.minutes);
    setBalance(session.balance_after);
    setStatus(await screenTimePlugin.status());
    pending.current = null;
    setNow(Date.now());
  });
  const canActivate = !!pending.current || (Number.isInteger(chosen) && chosen >= 1 && chosen <= maxMinutes);
  const mode = status ? lockModeOf(status) : 'selected';
  const allowed = status?.allowedCount ?? 0;
  // Every change to the lock goes through the sheet, which asks for a parent's code first.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pickAllowed = () => void perform(async () => setStatus(await screenTimePlugin.selectAllowedApps()));
  const pickBlocked = () => void perform(async () => setStatus(await screenTimePlugin.selectApps()));

  return (
    <section aria-labelledby="balance-heading" className="space-y-5 rounded-3xl border border-primary/25 bg-card p-5">
      <div>
        <h2 id="balance-heading" className="text-sm font-semibold text-muted-foreground">Din skärmtid</h2>
        <p className="mt-1 font-display text-5xl font-bold tabular-nums text-primary">
          {balance === null ? '—' : balance}
          <span className="ml-2 text-xl font-semibold text-muted-foreground">min</span>
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{available ? error : 'Kunde inte läsa saldot.'}</p>}

      {!available ? (
        <p className="text-sm text-muted-foreground">Upplåsning av appar fungerar bara i iPhone-appen.</p>
      ) : !status?.authorized ? (
        <div className="space-y-2">
          <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={() => void perform(async () => setStatus(await screenTimePlugin.authorize()))}>
            <ShieldCheck className="h-4 w-4" />Godkänn med förälder
          </Button>
          <p className="text-xs text-muted-foreground">Första gången behöver en förälder godkänna Skärmtid på den här telefonen.</p>
        </div>
      ) : mode === 'all' && status.needsAllowedApps ? (
        <div className="space-y-2">
          <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={() => setSettingsOpen(true)}>
            <ShieldCheck className="h-4 w-4" />Välj alltid tillåtna appar med förälder
          </Button>
          <p className="text-xs text-muted-foreground">
            Telefonen låses utom de appar ni väljer. GameRun måste vara med, annars kan du inte tjäna tid.
          </p>
        </div>
      ) : mode === 'selected' && status.selectionCount === 0 ? (
        <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={() => setSettingsOpen(true)}>
          <LockKeyhole className="h-4 w-4" />Välj appar med förälder
        </Button>
      ) : status.downtimeActive ? (
        <div role="status" className="rounded-2xl bg-muted/60 p-4 text-center">
          <p className="font-semibold">Skärmfri tid</p>
          <p className="text-sm text-muted-foreground">
            {status.downtimeEndsAt
              ? `Telefonen är låst till ${formatClock(status.downtimeEndsAt)}. Du kan låsa upp igen efter det.`
              : 'Telefonen är låst just nu. Du kan låsa upp igen efter skärmfri tid.'}
          </p>
        </div>
      ) : active > 0 ? (
        <div role="status" className="rounded-2xl bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">Apparna är upplåsta</p>
          <p className="font-display text-4xl font-bold tabular-nums text-foreground">
            {Math.floor(active / 60)}:{String(active % 60).padStart(2, '0')}
          </p>
          <p className="text-xs text-muted-foreground">kvar</p>
        </div>
      ) : maxMinutes < 1 && !pending.current ? (
        <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          {(balance ?? 0) >= 1 && untilDowntime < 1
            ? `Skärmfri tid börjar ${formatClock(nextDowntime)}. Du kan låsa upp igen efter den.`
            : 'Du har ingen tid att låsa upp just nu. Rör på dig eller lös uppgifter för att tjäna mer.'}
        </p>
      ) : (
        <div className="space-y-4">
          <MinutePicker
            label="Minuter att låsa upp"
            value={chosen}
            onChange={setMinutes}
            min={1}
            max={Math.max(1, maxMinutes)}
            disabled={busy || !!pending.current}
          />
          <Button className="h-14 w-full text-base" disabled={busy || !canActivate} onClick={() => void activate()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            {pending.current ? 'Försök igen' : `Lås upp ${chosen} min`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {mode === 'all'
              ? `Telefonen är låst utanför tiden, utom ${allowed} alltid ${allowed === 1 ? 'tillåten' : 'tillåtna'}.`
              : `${status.selectionCount} valda appar och kategorier är spärrade utanför tiden.`}
            {untilDowntime <= MAX_ACTIVATION && ` Skärmfri tid börjar ${formatClock(nextDowntime)}.`}
          </p>
        </div>
      )}

      {syncError && available && status?.authorized && <p className="text-xs text-destructive">{syncError}</p>}

      <div className="space-y-1 border-t border-border pt-3">
        <AskParentTime />
        {available && status?.authorized && active === 0 && status.lockMode && (
          <LockSettingsDrawer
            status={status}
            busy={busy}
            error={error}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onSetMode={(next) => void perform(async () => setStatus(await screenTimePlugin.setLockMode({ mode: next })))}
            onSelectAllowed={pickAllowed}
            onSelectBlocked={pickBlocked}
            limits={limits}
            onSelectLimit={(limit) => void perform(async () => setStatus(await screenTimePlugin.selectLimitApps({ limitId: limit.id, name: limit.name })))}
          />
        )}
      </div>
    </section>
  );
}
