import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface Props { children: { id: string; name: string; avatar: string | null }[] }
export function ScreenTimeInsights({ children }: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  const child = children[Math.min(selected, Math.max(0, children.length - 1))];
  useEffect(() => {
    if (!child) return;
    let stopped = false;
    let pending = false;
    setBalance(null);
    const read = async () => {
      if (stopped || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const { data, error } = await supabase.from("screen_time_balance").select("minutes_remaining").eq("user_id", child.id).maybeSingle();
        if (!stopped) {
          if (error) setStatus("Kunde inte hämta skärmtiden.");
          else { setBalance(data?.minutes_remaining ?? null); setStatus(data ? "" : "Ingen sparad skärmtid ännu."); }
        }
      } finally { pending = false; }
    };
    void read();
    const interval = setInterval(() => void read(), 3000);
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    return () => { stopped = true; clearInterval(interval); window.removeEventListener("focus", read); document.removeEventListener("visibilitychange", read); };
  }, [child?.id, retry]);
  if (!child) return <p className="text-muted-foreground py-6">Inga barn är kopplade ännu.</p>;
  return <section className="space-y-6 py-6">
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" size="icon" aria-label="Föregående barn" disabled={selected === 0} onClick={() => setSelected(v => v - 1)}><ChevronLeft className="w-5 h-5" /></Button>
      <h2 className="font-display text-xl font-bold">{child.name}</h2>
      <Button variant="ghost" size="icon" aria-label="Nästa barn" disabled={selected >= children.length - 1} onClick={() => setSelected(v => v + 1)}><ChevronRight className="w-5 h-5" /></Button>
    </div>
    <div className="text-center"><p className="text-muted-foreground">Tillgänglig skärmtid</p><p className="font-display text-3xl font-bold text-primary">{balance === null ? "—" : `${balance} min`}</p><p role="status" className="text-sm text-muted-foreground mt-2">{status}</p></div>
    <Button variant="outline" onClick={() => setRetry(v => v + 1)}><RefreshCw className="w-4 h-4 mr-2" />Synka saldo</Button>
  </section>;
}
