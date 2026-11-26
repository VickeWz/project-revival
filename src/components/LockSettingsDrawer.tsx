import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, KeyRound, Loader2, LockKeyhole, ShieldCheck, Smartphone, Timer } from "lucide-react";
import type { LimitInfo } from "@/hooks/useDeviceRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useAuth } from "@/hooks/useAuth";
import { useParentLink } from "@/hooks/useParentLink";
import { cn } from "@/lib/utils";
import { CHANGE_WINDOW_SECONDS, consumeDeviceChangeCode } from "@/lib/device-change-code";
import { secondsLeft } from "@/lib/pairing-code";
import { lockModeOf, type LockMode } from "@/lib/screen-time";
import type { ScreenTimeStatus } from "@/services/screenTime";

const MODES: Array<{ mode: LockMode; title: string; text: string }> = [
  { mode: "all", title: "Hela telefonen", text: "Allt utom alltid tillåtna appar är låst." },
  { mode: "selected", title: "Valda appar", text: "Bara apparna du väljer är låsta." },
];

const valda = (count: number) => `${count} ${count === 1 ? "vald" : "valda"}`;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * "Appar och lås" on Hem: the lock mode and the two app choices. Every change needs a one-time
 * code from a linked parent; after a valid code the sheet stays open for changes for 10 minutes
 * or until it closes. Apple's app picker opens on top of the sheet.
 */
export function LockSettingsDrawer({ status, busy, error, open, onOpenChange, onSetMode, onSelectAllowed, onSelectBlocked, limits, onSelectLimit }: {
  status: ScreenTimeStatus;
  busy: boolean;
  error: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetMode: (mode: LockMode) => void;
  onSelectAllowed: () => void;
  onSelectBlocked: () => void;
  /** The parents' app limits; the apps for each are chosen here on the iPhone. */
  limits: LimitInfo[];
  onSelectLimit: (limit: LimitInfo) => void;
}) {
  const [approvedUntil, setApprovedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) { setApprovedUntil(null); return; }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  const approvedSeconds = approvedUntil ? Math.max(0, Math.ceil((approvedUntil - now) / 1000)) : 0;
  const mode = lockModeOf(status);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="h-11 w-full text-sm text-muted-foreground hover:text-foreground">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Ändra appar och lås
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <div className="mx-auto w-full max-w-lg space-y-6 px-5 bottom-bar-safe">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-display text-xl">Appar och lås</DrawerTitle>
            <DrawerDescription>
              {approvedSeconds > 0 ? `Ändringar är öppna i ${clock(approvedSeconds)}.` : "Ändringar kräver en kod från din förälder."}
            </DrawerDescription>
          </DrawerHeader>

          {approvedSeconds === 0 ? (
            <ParentCodeForm onApproved={() => { setNow(Date.now()); setApprovedUntil(Date.now() + CHANGE_WINDOW_SECONDS * 1000); }} />
          ) : (
            <>
              <section aria-labelledby="lock-mode-heading" className="space-y-2.5">
                <h3 id="lock-mode-heading" className="font-semibold">Låsläge</h3>
                <div role="radiogroup" aria-labelledby="lock-mode-heading" className="grid gap-2">
                  {MODES.map((option) => {
                    const on = option.mode === mode;
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={busy}
                        onClick={() => { if (!on) onSetMode(option.mode); }}
                        className={cn(
                          "flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors disabled:opacity-60",
                          on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary" : "border-muted-foreground")}
                        >
                          {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </span>
                        <span>
                          <span className="block font-semibold">{option.title}</span>
                          <span className="block text-sm text-muted-foreground">{option.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                <li>
                  <Choice
                    icon={<ShieldCheck className="h-5 w-5 text-reward" />}
                    title="Alltid tillåtna appar"
                    text={mode === "all" ? "Fungerar även när telefonen är låst. GameRun måste vara med." : "Används i läget Hela telefonen."}
                    value={valda(status.allowedCount ?? 0)}
                    disabled={busy}
                    onClick={onSelectAllowed}
                  />
                </li>
                <li>
                  <Choice
                    icon={<Smartphone className="h-5 w-5 text-primary" />}
                    title="Appar som spärras"
                    text={mode === "selected" ? "Låsta utanför din upplåsta tid." : "Används i läget Valda appar."}
                    value={valda(status.selectionCount)}
                    disabled={busy}
                    onClick={onSelectBlocked}
                  />
                </li>
              </ul>

              {limits.length > 0 && (
                <section aria-labelledby="limits-heading" className="space-y-2.5">
                  <h3 id="limits-heading" className="font-semibold">Appgränser</h3>
                  <p className="text-sm text-muted-foreground">
                    Din förälder har satt gränserna. Välj vilka appar varje gräns gäller. De spärras när tiden är slut för dagen, även när telefonen är upplåst.
                  </p>
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                    {limits.map((limit) => (
                      <li key={limit.id}>
                        <Choice
                          icon={<Timer className="h-5 w-5 text-primary" />}
                          title={limit.name}
                          text={`${limit.minutes} min per dag${limit.reached ? " · slut för idag" : ""}`}
                          value={limit.selectionCount ? valda(limit.selectionCount) : "Välj appar"}
                          disabled={busy}
                          onClick={() => onSelectLimit(limit)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {mode === "all" && status.needsAllowedApps && (
                <p role="status" className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                  Välj GameRun bland alltid tillåtna appar. Tills dess låses bara apparna under Appar som spärras.
                </p>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** The child types the parent's six-digit code; failures count towards a 15-minute lock on the account. */
function ParentCodeForm({ onApproved }: { onApproved: () => void }) {
  const { profile } = useAuth();
  const { parent, loading } = useParentLink();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const blockedSeconds = blockedUntil ? secondsLeft(blockedUntil, now) : 0;

  useEffect(() => {
    if (!blockedUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [blockedUntil]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (checking || code.length !== 6 || blockedSeconds > 0) return;
    setChecking(true);
    setMessage(null);
    try {
      const result = await consumeDeviceChangeCode(code);
      if (result.status === "ok") {
        setCode("");
        onApproved();
      } else if (result.status === "blocked") {
        setBlockedUntil(result.blockedUntil);
        setNow(Date.now());
      } else {
        setMessage(`Koden stämmer inte eller har gått ut. ${result.attemptsRemaining} försök kvar.`);
      }
    } catch {
      setMessage("Kunde inte kontrollera koden. Försök igen.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Laddar" />
      </div>
    );
  }
  if (!parent) {
    return (
      <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        En förälder behöver koppla ditt konto först. Gå till Profil → Koppla förälder.
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Be {parent.name} öppna GameRun och trycka på {profile?.display_name ?? "ditt namn"} → Låsta och tillåtna appar → Visa kod.
      </p>
      <div className="space-y-2">
        <Label htmlFor="device-change-code" className="font-semibold text-foreground">Kod från din förälder</Label>
        <Input
          id="device-change-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setMessage(null); }}
          disabled={checking || blockedSeconds > 0}
          className="h-14 rounded-2xl border-border bg-card text-center font-display text-2xl tracking-[0.3em] tabular-nums"
        />
      </div>
      {blockedSeconds > 0 ? (
        <p role="alert" className="text-sm text-destructive">För många försök. Försök igen om {clock(blockedSeconds)}.</p>
      ) : message ? (
        <p role="alert" className="text-sm text-destructive">{message}</p>
      ) : null}
      <Button type="submit" className="h-14 w-full text-base" disabled={checking || code.length !== 6 || blockedSeconds > 0}>
        {checking ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-5 w-5" aria-hidden="true" />}
        {checking ? "Kontrollerar…" : "Fortsätt"}
      </Button>
    </form>
  );
}

function Choice({ icon, title, text, value, disabled, onClick }: {
  icon: ReactNode;
  title: string;
  text: string;
  value: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
    >
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{value}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
