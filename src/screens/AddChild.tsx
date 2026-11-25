// @ts-nocheck -- imported code written for a looser TypeScript config
import { linkChild } from "@/lib/link-child.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppScreen } from "@/components/layout/AppScreen";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const linkChildSchema = z.object({
  email: z.string().trim().email("Ange en giltig e-postadress"),
  password: z.string().min(1, "Ange lösenord"),
});

export default function AddChild() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = linkChildSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Logga in för att lägga till ett barn");
        return;
      }

      const result = await linkChild({
        data: { childEmail: email.trim().toLowerCase(), childPassword: password },
      });
      const response = { data: result as { error?: string; message?: string; childName?: string } };

      if (response.data?.error) {
        setError("Kunde inte koppla kontot. Kontrollera barnets uppgifter.");
        return;
      }

      toast.success("Barnets konto är kopplat!", {
        description: `${response.data?.childName || "Barnet"} har kopplats till ditt konto.`,
      });

      navigate("/parent");
    } catch (err) {
      console.error("Error linking child:", err);
      setError("Ett oväntat fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  // Linking still verifies the child's own login (link-child server function). A code shown in the
  // child's app would avoid sharing the password, but needs a backend change first.
  return (
    <AppScreen nav={false} back={{ label: "Översikt", onClick: () => navigate("/parent") }} title="Lägg till barn">
      <p className="-mt-4 text-muted-foreground">
        Barnet behöver redan ha ett GameRun-konto. Skriv in barnets inloggning en gång för att koppla ihop kontona.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold text-foreground">Barnets e-post</Label>
          <Input
            id="email"
            type="email"
            placeholder="barn@epost.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl border-border bg-card text-base"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="font-semibold text-foreground">Barnets lösenord</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border-border bg-card text-base"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <Button type="submit" disabled={loading || !email || !password} className="h-14 w-full text-base">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <UserPlus className="h-5 w-5" aria-hidden="true" />}
          {loading ? "Kopplar…" : "Koppla konto"}
        </Button>
      </form>

      <ul className="space-y-1.5 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <li>• Lösenordet används bara för att bekräfta kontot och sparas inte.</li>
        <li>• När kontona är kopplade ser du saldo och sparad aktivitet och kan svara på förfrågningar om tid.</li>
        <li>• Du kan koppla bort barnet när som helst.</li>
      </ul>
    </AppScreen>
  );
}
