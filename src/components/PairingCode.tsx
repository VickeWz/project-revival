import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { issuedCodeSchema, secondsLeft } from "@/lib/pairing-code";
import { Loader2, RefreshCw } from "lucide-react";

export function PairingCode({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);
  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: failure } = await supabase.rpc("create_child_pairing_code");
      if (failure) throw failure;
      setIssued(issuedCodeSchema.parse(data));
      setNow(Date.now());
    } catch { setError("Kunde inte skapa koden. Försök igen."); }
    finally { setBusy(false); }
  };
  const remaining = issued ? secondsLeft(issued.expiresAt, now) : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Koppla förälder</DialogTitle></DialogHeader>
        {issued && remaining > 0 ? (
          <div className="space-y-2 text-center">
            <p aria-label="Kopplingskod" className="font-display text-4xl font-bold tabular-nums text-primary">{issued.code}</p>
            <p className="text-sm text-muted-foreground">Giltig i {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
          </div>
        ) : issued ? <p role="status">Koden har gått ut.</p> : null}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} onClick={() => void generate()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? "Skapar…" : issued ? "Skapa ny kod" : "Visa kod"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}