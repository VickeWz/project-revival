import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createDeviceChangeCode } from "@/lib/device-change-code";
import { secondsLeft } from "@/lib/pairing-code";

/** Parent: shows a one-time code that lets the child's iPhone change apps and lock mode. */
export function DeviceChangeCode({ childId, phone, open, onOpenChange }: {
  childId: string;
  /** For example "Elias iPhone". */
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each new code replaces the previous one on the server, so only the latest request may be shown.
  const latest = useRef(0);
  const generate = async () => {
    const request = ++latest.current;
    setBusy(true);
    setError(null);
    try {
      const code = await createDeviceChangeCode(childId);
      if (request !== latest.current) return;
      setIssued(code);
      setNow(Date.now());
    } catch {
      if (request === latest.current) setError("Kunde inte skapa koden. Försök igen.");
    } finally {
      if (request === latest.current) setBusy(false);
    }
  };

  // A fresh code each time the dialog opens; the countdown only runs while it is open.
  useEffect(() => {
    if (!open) return;
    setIssued(null);
    void generate();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, childId]);

  const remaining = issued ? secondsLeft(issued.expiresAt, now) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kod för ändringar</DialogTitle>
          <DialogDescription>
            Skriv koden på {phone} under Hem → Ändra appar och lås. Den gäller i 5 minuter och kan användas en gång.
          </DialogDescription>
        </DialogHeader>
        {issued && remaining > 0 ? (
          <div className="space-y-1 text-center">
            <p aria-label="Kod för ändringar" className="font-display text-4xl font-bold tracking-[0.2em] tabular-nums text-primary">
              {issued.code}
            </p>
            <p className="text-sm text-muted-foreground">
              Giltig i {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </p>
          </div>
        ) : issued ? (
          <p role="status" className="text-center text-sm text-muted-foreground">Koden har gått ut.</p>
        ) : busy ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Skapar kod" />
          </div>
        ) : null}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {(error || (issued && remaining === 0)) && (
          <Button disabled={busy} onClick={() => void generate()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Skapa ny kod
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
