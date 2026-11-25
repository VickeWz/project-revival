import { useEffect, useState } from "react";
import { Unlock } from "lucide-react";
import { unlockMinutesRemaining } from "@/lib/parent-unlock";

export function UnlockStatus({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const minutes = unlockMinutesRemaining(expiresAt, now);
  if (minutes === 0) return null;
  return (
    <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-reward">
      <Unlock className="h-4 w-4 shrink-0" aria-hidden="true" />
      Upplåst · {minutes} min kvar
    </span>
  );
}