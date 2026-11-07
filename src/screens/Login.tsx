import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, User, ArrowLeft, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type UserType = 'parent' | 'child' | null;
type AuthMode = 'signup' | 'signin';

export default function Login() {
  const [userType, setUserType] = useState<UserType>(null);
  const [showForm, setShowForm] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp, signIn } = useAuth();

  const handleSelectType = (type: UserType) => {
    setUserType(type);
    setShowForm(true);
  };

  const handleBack = () => {
    if (showForm && authMode === 'signup') {
      setShowForm(false);
      setUserType(null);
    } else if (authMode === 'signin') {
      setAuthMode('signup');
      setShowForm(false);
      setUserType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error("Kunde inte slutföra begäran. Kontrollera uppgifterna och försök igen.");
          setIsLoading(false);
        } else {
          setIsLoading(false);
          toast.success('Välkommen tillbaka till GameRun!');
          // Redirect handled by AuthRedirect in App.tsx
        }
      } else {
        const { error, needsConfirmation } = await signUp(email, password, displayName, userType ?? "child");
        setIsLoading(false);
        if (error) {
          toast.error("Kunde inte slutföra begäran. Kontrollera uppgifterna och försök igen.");
        } else if (needsConfirmation) {
          toast.success('Kontot är skapat! Bekräfta via e-post och logga sedan in.');
          setAuthMode('signin');
        } else {
          toast.success('Kontot är skapat!');
        }
      }
    } catch {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Ange din e-postadress först.');
      return;
    }
    const origin = window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://second-life-project-archive.lovable.app';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) toast.error("Kunde inte slutföra begäran. Kontrollera uppgifterna och försök igen.");
    else toast.success('Kontrollera din e-post för en länk för att återställa lösenordet.');
  };

  const handleSwitchToSignIn = () => {
    setAuthMode('signin');
    setShowForm(true);
  };

  const handleSwitchToSignUp = () => {
    setAuthMode('signup');
    setShowForm(false);
    setUserType(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs - cyan glow */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full gradient-activity opacity-30 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full gradient-hero opacity-20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-activity flex items-center justify-center shadow-glow-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Game<span className="text-primary">Run</span>
          </h1>
          <p className="text-muted-foreground mt-2">Rör dig mer, spela mer</p>
        </motion.div>

        {/* Back button */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </motion.div>
        )}

        {/* Select User Type - only show for signup */}
        {!showForm && authMode === 'signup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-center text-xl font-semibold text-foreground mb-6">
              Vem är du?
            </h2>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectType('parent')}
              className="w-full p-6 rounded-2xl bg-card border border-border/50 shadow-card flex items-center gap-4 text-left hover:border-primary/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center shadow-glow-primary">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Jag är förälder</h3>
                <p className="text-sm text-muted-foreground">Hantera dina barns skärmtid</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectType('child')}
              className="w-full p-6 rounded-2xl bg-card border border-border/50 shadow-card flex items-center gap-4 text-left hover:border-primary/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl gradient-activity flex items-center justify-center shadow-glow-primary">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Jag är barn</h3>
                <p className="text-sm text-muted-foreground">Följ din aktivitet och tjäna skärmtid</p>
              </div>
            </motion.button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <button 
                onClick={handleSwitchToSignIn}
                className="text-primary hover:underline font-medium"
              >
                Logga in
              </button>
            </p>
          </motion.div>
        )}

        {/* Sign In Form */}
        {showForm && authMode === 'signin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
          >
            <h2 className="text-center text-xl font-semibold text-foreground mb-6">
              Välkommen tillbaka
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-glow-primary"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Loggar in…' : 'Logga in'}
              </Button>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-sm text-primary hover:underline"
              >
                Glömt lösenordet?
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <button 
                onClick={handleSwitchToSignUp}
                className="text-primary hover:underline font-medium"
              >
                Skapa konto
              </button>
            </p>
          </motion.div>
        )}

        {/* Signup Form */}
        {showForm && authMode === 'signup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
          >
            <h2 className="text-center text-xl font-semibold text-foreground mb-6">
              Skapa ditt konto
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Namn</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ditt namn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted border-border"
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-glow-primary"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Skapar konto…' : 'Skapa konto'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <button 
                onClick={handleSwitchToSignIn}
                className="text-primary hover:underline font-medium"
              >
                Logga in
              </button>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
