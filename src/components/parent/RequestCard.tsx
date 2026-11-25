import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Initial } from "@/components/Initial";
import { MinutePicker } from "@/components/MinutePicker";
import type { TimeRequest } from "@/hooks/useParentOverview";

interface RequestCardProps {
  request: TimeRequest;
  busy: boolean;
  onApprove: (minutes: number) => void;
  onDecline: () => void;
}

/** A child's request for more time: adjust the minutes, then approve or decline. */
export function RequestCard({ request, busy, onApprove, onDecline }: RequestCardProps) {
  const [minutes, setMinutes] = useState(request.requestedMinutes);
  const changed = minutes !== request.requestedMinutes;

  return (
    <article className="space-y-4 rounded-3xl border border-primary/30 bg-card p-5">
      <div className="flex items-center gap-3">
        <Initial name={request.childName} />
        <div className="min-w-0">
          <p className="font-bold">
            {request.childName} vill ha {request.requestedMinutes} min
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: sv })}
          </p>
        </div>
      </div>
      <MinutePicker
        label={`Minuter att ge ${request.childName}`}
        value={minutes}
        onChange={setMinutes}
        min={5}
        max={120}
        presets={[]}
        disabled={busy}
      />
      {changed && <p className="-mt-1 text-center text-sm text-primary">Ändrat från {request.requestedMinutes} min</p>}
      <div className="flex gap-2">
        <Button variant="secondary" className="h-12 flex-1" disabled={busy} onClick={onDecline}>
          Avslå
        </Button>
        <Button className="h-12 flex-[2]" disabled={busy} onClick={() => onApprove(minutes)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          Godkänn {minutes} min
        </Button>
      </div>
    </article>
  );
}
