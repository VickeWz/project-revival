// @ts-nocheck -- imported code written for a looser TypeScript config
import { linkChild } from "@/lib/link-child.functions";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Loader2, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/parent")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center font-display font-bold text-xl text-foreground">
            Lägg till barn
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 shadow-card">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center"
              >
                <UserPlus className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <CardTitle className="font-display text-2xl">Koppla barnets konto</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ange barnets inloggningsuppgifter för att koppla kontot
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Barnets e-post
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="barn@epost.se"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Barnets lösenord
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Ange lösenord"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-14 text-lg font-display font-bold gradient-hero"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Kopplar…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Koppla barnets konto
                    </>
                  )}
                </Button>
              </form>

              {/* Info Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/30"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Koppla konto</p>
                    <ul className="space-y-1">
                      <li>• Your child must have an existing account</li>
                      <li>• Enter their login credentials to verify</li>
                      <li>• Once linked, you can monitor their activity</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
