import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MinutePicker } from "@/components/MinutePicker";
import { supabase } from "@/integrations/supabase/client";
import type { LinkedChild } from "@/hooks/useParentOverview";

interface GiveTimeDrawerProps {
  child: LinkedChild | null;
  onClose: () => void;
  /** Called after a successful grant with the child's new balance (null if the server did not return one). */
  onGiven: (childId: string, balance: number | null) => void;
}

/** Bottom sheet for giving a child extra minutes through the idempotent grant_screen_time transaction. */
export function GiveTimeDrawer({ child, onClose, onGiven }: GiveTimeDrawerProps) {
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  // Reused on retry of the same amount so a lost response cannot credit twice.
  const grantId = useRef<string | null>(null);

  useEffect(() => {
    if (!child) return;
    setMinutes(15);
    grantId.current = null;
  }, [child?.id]);

  const change = (value: number) => {
    setMinutes(value);
    grantId.current = null;
  };

  const give = async () => {
    if (!child || busy) return;
    setBusy(true);
    try {
      grantId.current ??= crypto.randomUUID();
      const { data, error } = await supabase.rpc("grant_screen_time", {
        p_id: grantId.current,
        p_child_id: child.id,
        p_minutes: minutes,
      });
      if (error) throw error;
      grantId.current = null;
      toast.success(`${minutes} min har lagts till hos ${child.name}.`);
      onGiven(child.id, typeof data === "number" ? data : null);
      onClose();
    } catch (error) {
      console.error("Error granting time:", error);
      toast.error("Kunde inte ge skärmtid. Försök igen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={!!child} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="border-border bg-card">
        <div className="mx-auto w-full max-w-lg px-5 bottom-bar-safe">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-display text-xl">Ge {child?.name} extra tid</DrawerTitle>
            <DrawerDescription>Tiden läggs till saldot direkt.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 pt-2">
            <MinutePicker label="Minuter att ge" value={minutes} onChange={change} min={5} max={120} disabled={busy} />
            <Button className="h-14 w-full text-base" onClick={() => void give()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Ge {minutes} min
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
