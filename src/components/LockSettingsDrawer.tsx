import type { ReactNode } from "react";
import { ChevronRight, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { lockModeOf, type LockMode } from "@/lib/screen-time";
import type { ScreenTimeStatus } from "@/services/screenTime";

const MODES: Array<{ mode: LockMode; title: string; text: string }> = [
  { mode: "all", title: "Hela telefonen", text: "Allt utom alltid tillåtna appar är låst." },
  { mode: "selected", title: "Valda appar", text: "Bara apparna du väljer är låsta." },
];

const valda = (count: number) => `${count} ${count === 1 ? "vald" : "valda"}`;

/**
 * "Appar och lås" on Hem: the lock mode and the two app choices, made on the child's iPhone
 * with a parent. Opens Apple's app picker on top of the sheet.
 */
export function LockSettingsDrawer({ status, busy, onSetMode, onSelectAllowed, onSelectBlocked }: {
  status: ScreenTimeStatus;
  busy: boolean;
  onSetMode: (mode: LockMode) => void;
  onSelectAllowed: () => void;
  onSelectBlocked: () => void;
}) {
  const mode = lockModeOf(status);

  return (
    <Drawer>
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
            <DrawerDescription>Gör ändringarna tillsammans med en förälder.</DrawerDescription>
          </DrawerHeader>

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

          {mode === "all" && status.needsAllowedApps && (
            <p role="status" className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Välj GameRun bland alltid tillåtna appar. Tills dess låses bara apparna under Appar som spärras.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
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
