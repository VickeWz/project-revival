import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppScreen } from "@/components/layout/AppScreen";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pairingCodeSchema, pairingResultSchema, secondsLeft } from "@/lib/pairing-code";

export default function AddChild() {
  const [code, setCode] = useState("");
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const blockedSeconds = blockedUntil ? secondsLeft(blockedUntil, now) : 0;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = pairingCodeSchema.safeParse(code);
    if (!validation.success) {
      setError("Ange en sexsiffrig kod");
      return;
    }

    setLoading(true);

    try {
      const { data, error: failure } = await supabase.rpc("consume_child_pairing_code", { p_code: code });
      if (failure) throw failure;
      const result = pairingResultSchema.parse(data);
      if (result.status === "blocked") {
        setBlockedUntil(result.blockedUntil);
        setNow(Date.now());
        setError(null);
        return;
      }
      if (result.status === "invalid") {
        setError(`Koden är felaktig, utgången eller redan använd. ${result.attemptsRemaining} försök kvar.`);
        return;
      }

      toast.success("Barnets konto är kopplat!", {
        description: `${result.childName} har kopplats till ditt konto.`,
      });

      navigate("/parent");
    } catch (err) {
      setError("Ett oväntat fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen nav={false} back={{ label: "Översikt", onClick: () => navigate("/parent") }} title="Lägg till barn">
      <p className="-mt-4 text-muted-foreground">
        Kopplingskod från barnets Profil → Koppla förälder.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {blockedSeconds > 0 && <p role="alert" className="text-sm text-destructive">Koppling spärrad. Försök igen om {Math.floor(blockedSeconds / 60)}:{String(blockedSeconds % 60).padStart(2, "0")}.</p>}
        {error && (
          <p role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="pairing-code" className="font-semibold text-foreground">Sexsiffrig kod</Label>
          <Input
            id="pairing-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 rounded-2xl border-border bg-card text-base"
            disabled={loading || blockedSeconds > 0}
            autoComplete="off"
          />
        </div>

        <Button type="submit" disabled={loading || code.length !== 6 || blockedSeconds > 0} className="h-14 w-full text-base">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UserPlus className="h-5 w-5" aria-hidden="true" />}
          {loading ? "Kopplar…" : "Koppla konto"}
        </Button>
      </form>

      <ul className="space-y-1.5 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <li>• Koden gäller i 10 minuter och kan bara användas en gång.</li>
        <li>• Efter 5 felaktiga försök spärras koppling i 15 minuter.</li>
        <li>• När kontona är kopplade ser du saldo och sparad aktivitet och kan svara på förfrågningar om tid.</li>
        <li>• Du kan koppla bort barnet när som helst.</li>
      </ul>
    </AppScreen>
  );
}
