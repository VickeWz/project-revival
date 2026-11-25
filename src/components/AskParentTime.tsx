import { useEffect, useState } from "react";
import { Clock, HandHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MinutePicker } from "@/components/MinutePicker";
import { useAuth } from "@/hooks/useAuth";
import { useParentLink } from "@/hooks/useParentLink";
import { supabase } from "@/integrations/supabase/client";

const MIN_REQUEST = 5;
const MAX_REQUEST = 120;

/** "Be om mer tid": lives next to the balance, opens a bottom sheet with the minute picker. */
export function AskParentTime() {
  const { profile } = useAuth();
  const { parent, loading } = useParentLink();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const childId = profile?.id;
    if (!childId) return;
    let cancelled = false;
    void supabase
      .from("screen_time_requests")
      .select("id")
      .eq("child_id", childId)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPending(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const send = async () => {
    if (!profile?.id || !parent?.id || sending) return;
    if (minutes < MIN_REQUEST || minutes > MAX_REQUEST) {
      toast.error(`Välj mellan ${MIN_REQUEST} och ${MAX_REQUEST} minuter`);
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("screen_time_requests").insert({
        child_id: profile.id,
        parent_id: parent.id,
        requested_minutes: minutes,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Förfrågan skickad!", { description: `${parent.name} ser din förfrågan om ${minutes} minuter.` });
      setPending(true);
      setOpen(false);
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Kunde inte skicka förfrågan");
    } finally {
      setSending(false);
    }
  };

  if (pending) {
    return (
      <p role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Väntar på svar från {parent?.name ?? "din förälder"}
      </p>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="h-12 w-full text-primary hover:bg-primary/10 hover:text-primary">
          <HandHeart className="h-5 w-5" aria-hidden="true" />
          Be förälder om mer tid
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-card">
        <div className="mx-auto w-full max-w-lg px-5 bottom-bar-safe">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="font-display text-xl">Be om mer tid</DrawerTitle>
            <DrawerDescription>
              {parent
                ? `${parent.name} får din förfrågan och kan ändra antalet minuter.`
                : "Din förälder behöver koppla ditt konto först."}
            </DrawerDescription>
          </DrawerHeader>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Laddar" />
            </div>
          ) : !parent ? (
            <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Be din förälder lägga till dig i sin GameRun-app. Sedan kan du be om tid här.
            </p>
          ) : (
            <div className="space-y-6 pt-2">
              <MinutePicker
                label="Minuter att be om"
                value={minutes}
                onChange={setMinutes}
                min={MIN_REQUEST}
                max={MAX_REQUEST}
                disabled={sending}
              />
              <Button className="h-14 w-full text-base" onClick={() => void send()} disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Skicka förfrågan om {minutes} min
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
