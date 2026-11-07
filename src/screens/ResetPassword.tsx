import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@/lib/router-compat";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated!");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-card border border-border/50">
        <h1 className="text-center text-xl font-semibold text-foreground mb-6">Choose a new password</h1>
        {ready ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" minLength={6} required value={password}
                onChange={(e) => setPassword(e.target.value)} className="bg-muted border-border" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Saving..." : "Save new password"}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Open this page from the reset link in your email.
          </p>
        )}
      </div>
    </div>
  );
}
