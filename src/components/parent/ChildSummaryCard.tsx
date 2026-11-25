import { ChevronRight, CirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Initial } from "@/components/Initial";
import { UnlockStatus } from "@/components/parent/UnlockStatus";
import { cn } from "@/lib/utils";
import type { LinkedChild } from "@/hooks/useParentOverview";

/** One child on the parent's overview: tap the top to open the child, or give time directly. */
export function ChildSummaryCard({ child, onOpen, onGive }: { child: LinkedChild; onOpen: () => void; onGive: () => void }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-3.5 p-4 pb-3 text-left transition-colors hover:bg-muted/30">
        <span className="flex w-full items-center gap-3">
          <Initial name={child.name} />
          <span className="min-w-0 flex-1 truncate font-display text-lg font-bold">{child.name}</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <UnlockStatus expiresAt={child.unlockExpiresAt} />
        <span className="grid w-full grid-cols-3 gap-2">
          <Stat label="Saldo" value={`${child.balance} min`} tone="primary" />
          <Stat label="Intjänat idag" value={`+${child.earnedToday} min`} tone="reward" />
          <Stat label="Dagens steg" value={child.dailySteps?.toLocaleString("sv-SE") ?? "—"} />
        </span>
        {child.dailySteps === null && <span className="text-xs text-muted-foreground">Dagens steg har inte delats ännu.</span>}
      </button>
      <div className="border-t border-border px-2 py-1">
        <Button variant="ghost" className="h-12 w-full text-primary hover:bg-primary/10 hover:text-primary" onClick={onGive}>
          <CirclePlus className="h-5 w-5" aria-hidden="true" />
          Ge extra tid<span className="sr-only"> till {child.name}</span>
        </Button>
      </div>
    </article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "primary" | "reward" }) {
  return (
    <span className="flex flex-col justify-between rounded-2xl bg-muted px-3 py-2.5">
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
      <span
        className={cn(
          "mt-1 font-display text-lg font-bold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "reward" && "text-reward",
        )}
      >
        {value}
      </span>
    </span>
  );
}
