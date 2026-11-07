// @ts-nocheck -- imported code written for a looser TypeScript config
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPassDistance, stepsToNextMinute } from "@/lib/pass-metrics";
import { ArrowLeft, Play, Square, Footprints, Ruler, Clock, Tv, AlertTriangle, Timer, ChevronRight, History, Settings, Info } from "lucide-react";
import { useNavigate, Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { healthKitService } from "@/services/healthKit";
import { watchPassData } from "@/services/passTracking";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface PassSession {
  id: string;
  startTime: Date;
}

interface ActivityLog {
  id: string;
  logged_at: string;
  distance_meters: number;
  screen_time_earned: number;
  active_minutes: number;
}

export default function Pass() {
  const [view, setView] = useState<"home" | "active" | "screentime">("home");
  const [isActive, setIsActive] = useState(false);
  const [session, setSession] = useState<PassSession | null>(null);
  const [passData, setPassData] = useState({ steps: 0, distance: 0, activeMinutes: 0 });
  const [syncError, setSyncError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [screenTimeBalance, setScreenTimeBalance] = useState(0);
  const [passHistory, setPassHistory] = useState<ActivityLog[]>([]);
  const [customScreenTime, setCustomScreenTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endingRef = useRef(false);
  const endTimeRef = useRef<Date | null>(null);
  
  const { profile } = useAuth();
  const navigate = useNavigate();

  const earnedMinutes = healthKitService.calculateScreenTimeEarned(passData);

  // Fetch screen time balance and history
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      // Fetch balance
      const { data: balanceData } = await supabase
        .from("screen_time_balance")
        .select("minutes_remaining")
        .eq("user_id", profile.id)
        .maybeSingle();
      
      if (balanceData) {
        setScreenTimeBalance(balanceData.minutes_remaining);
      }

      // Fetch history
      const { data: historyData } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (historyData) {
        setPassHistory(historyData);
      }
    };
    fetchData();
  }, [profile]);

  // Request HealthKit permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      const granted = await healthKitService.requestAuthorization();
      setHasPermission(granted);
    };
    requestPermission();
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (session) setElapsedSeconds(Math.floor((Date.now() - session.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, session]);

  // Replace cumulative session samples; never add a polled total again.
  useEffect(() => {
    if (!isActive || !session || saving) return;
    return watchPassData(
      session,
      (data) => { if (!endingRef.current) { setPassData(data); setSyncError(false); } },
      () => setSyncError(true),
    );
  }, [isActive, session, saving]);

  const handleGoToActive = () => {
    setView("active");
  };

  const handleStart = useCallback(async () => {
    if (starting || session) return;
    setStarting(true);
    try {
    if (!hasPermission) {
      const granted = await healthKitService.requestAuthorization();
      setHasPermission(granted);
      if (!granted) {
        toast.error("Tillåt åtkomst till Hälsa för att starta.");
        return;
      }
    }

    setSession({
      id: crypto.randomUUID(),
      startTime: new Date(),
    });
    endTimeRef.current = null;
    setPassData({ steps: 0, distance: 0, activeMinutes: 0 });
    setSyncError(false);
    setElapsedSeconds(0);
    setIsActive(true);
    toast.success("Passet har startat!");
    } catch {
      toast.error("Kunde inte starta passet. Försök igen.");
    } finally {
      setStarting(false);
    }
  }, [hasPermission, starting, session]);

  const handleEnd = useCallback(async () => {
    if (!session || !profile || endingRef.current) return;
    endingRef.current = true;
    setSaving(true);
    endTimeRef.current ??= new Date();

    try {
      // Read once more at the fixed end time so the last received steps are included.
      const finalData = await healthKitService.getPassData(session.startTime, endTimeRef.current);
      setPassData(finalData);
      const finalDistance = finalData.distance;
      const finalEarnedMinutes = healthKitService.calculateScreenTimeEarned(finalData);
      const today = format(session.startTime, "yyyy-MM-dd");
      const { data: result, error: saveError } = await supabase.rpc("complete_step_pass", {
        p_id: session.id,
        p_started_at: session.startTime.toISOString(),
        p_ended_at: endTimeRef.current.toISOString(),
        p_day: today,
        p_steps: finalData.steps,
        p_distance: finalDistance,
        p_active_minutes: finalData.activeMinutes,
      });
      if (saveError) throw saveError;
      const newBalance = result.balance;

      setScreenTimeBalance(newBalance);
      toast.success(`Passet är klart! Du tjänade ${finalEarnedMinutes} minuter`, {
        description: "Se ditt uppdaterade saldo under Skärmtid",
      });
      setSession(null);
      setIsActive(false);
      setElapsedSeconds(0);
      setView("screentime"); // Go to screentime to show updated balance
      
      // Refresh history
      const { data: historyData } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (historyData) setPassHistory(historyData);
    } catch (error) {
      console.error("Error saving pass:", error);
      toast.error("Kunde inte spara passet");
    } finally {
      endingRef.current = false;
      setSaving(false);
    }
  }, [session, profile]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatBalance = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Active Pass View
  if (view === "active") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
          <div className="max-w-lg mx-auto px-6 py-4 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => !isActive && setView("home")} disabled={isActive}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center font-display font-bold text-xl text-foreground">
              Aktivitetspass
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-6 py-8">
          {hasPermission === false && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">
                Hälsa är endast tillgängligt på iPhone. Tillåt åtkomst till steg i Inställningar.
              </p>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
            <div className="font-display font-bold text-6xl text-foreground mb-2">
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-muted-foreground">{isActive ? "Passet är aktivt" : "Redo att starta"}</p>
          </motion.div>

          {syncError && <p role="status" className="text-sm text-destructive mb-4">Kunde inte synka med Hälsa. Försöker igen…</p>}
          <Tabs defaultValue="steps" className="mb-8">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="steps"><Footprints className="w-4 h-4 mr-2" />Steg</TabsTrigger>
              <TabsTrigger value="distance"><Ruler className="w-4 h-4 mr-2" />Distans</TabsTrigger>
            </TabsList>
          <div className="grid grid-cols-2 gap-4">
            <TabsContent value="steps" className="mt-0">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Footprints className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p aria-label="Steg under passet" className="font-display font-bold text-2xl text-foreground tabular-nums">
                  {passData.steps.toLocaleString("sv-SE")}
                </p>
                <p className="text-xs text-muted-foreground">Steg under passet</p>
              </CardContent>
            </Card>
            </TabsContent>
            <TabsContent value="distance" className="mt-0">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Ruler className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p aria-label="Distans under passet" className="font-display font-bold text-2xl text-foreground tabular-nums">{formatPassDistance(passData.distance)}</p>
                  <p className="text-xs text-muted-foreground">Distans under passet</p>
                </CardContent>
              </Card>
            </TabsContent>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Tv className="w-6 h-6 mx-auto mb-2 text-secondary" />
                <p aria-label="Intjänade minuter" className="font-display font-bold text-2xl text-foreground tabular-nums">{earnedMinutes}</p>
                <p className="text-xs text-muted-foreground">intjänade minuter</p>
              </CardContent>
            </Card>
          </div>
          </Tabs>

          <Card className="mb-8 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Nästa minut om</span>
                <span className="font-display font-bold text-foreground">
                  {stepsToNextMinute(passData.steps)} steg
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary" animate={{ width: `${(passData.steps % 200) / 2}%` }} />
              </div>
            </CardContent>
          </Card>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {!session ? (
              <Button
                onClick={handleStart}
                disabled={hasPermission !== true || starting}
                className="w-full h-16 text-lg font-display font-bold gradient-hero"
              >
                <Play className="w-6 h-6 mr-2" />
                {starting ? "Startar…" : "Starta pass"}
              </Button>
            ) : (
              <Button
                onClick={handleEnd}
                disabled={saving}
                variant="destructive"
                className="w-full h-16 text-lg font-display font-bold"
              >
                <Square className="w-6 h-6 mr-2" />
                {saving ? "Sparar…" : "Avsluta pass"}
              </Button>
            )}
          </motion.div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p className="mb-1">200 steg = 1 minut skärmtid</p>
            <p>Nya steg från Hälsa kan visas med fördröjning.</p>
          </div>
        </main>
      </div>
    );
  }

  // Screentime View
  if (view === "screentime") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
          <div className="max-w-lg mx-auto px-6 py-4 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setView("home")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center font-display font-bold text-xl text-foreground">
              Skärmtid
            </div>
            <div className="w-10" />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-6 py-8">
          {/* Balance Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-card via-card to-card/80 rounded-3xl p-8 neon-border mb-6 text-center relative overflow-hidden"
          >
            <motion.div 
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative">
              <p className="text-muted-foreground text-sm mb-2">Tillgänglig skärmtid</p>
              <motion.p 
                className="font-display font-bold text-5xl text-primary"
                style={{ textShadow: '0 0 30px hsl(200 100% 50% / 0.5)' }}
              >
                {formatBalance(screenTimeBalance)}
              </motion.p>
            </div>
          </motion.div>

        </main>

        <BottomNav />
      </div>
    );
  }

  // Home View (default)
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="relative px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/child" className="hover:opacity-80 transition-opacity">
            <motion.img
              src={logo}
              alt="GameRun"
              className="w-10 h-10 drop-shadow-[0_0_10px_hsl(200,100%,50%)]"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="text-foreground hover:bg-primary/20"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoToActive}
            className="p-6 rounded-2xl bg-card neon-border text-left relative overflow-hidden group"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl gradient-activity flex items-center justify-center mb-3 shadow-glow-primary">
                <Play className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="font-display font-bold text-foreground">Starta pass</p>
              <p className="text-xs text-muted-foreground mt-1">Följ aktivitet och tjäna tid</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("screentime")}
            className="p-6 rounded-2xl bg-card neon-border text-left relative overflow-hidden group"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center mb-3 shadow-glow-secondary">
                <Tv className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="font-display font-bold text-foreground">Skärmtid</p>
              <p className="text-xs text-muted-foreground mt-1">Se ditt saldo</p>
            </div>
          </motion.button>
        </div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="neon-border bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary" />
                <h3 className="font-display font-semibold text-foreground">Steg och skärmtid</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <span className="text-foreground font-medium">200 steg = 1 minut</span> skärmtid</p>
                <p>• A pass tracks your activity until you end it</p>
                <p>• Walk, run, or explore to earn more time</p>
                <p>• Use your balance anytime in Screentime</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Earning Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">Intjänad skärmtid</h2>
          <Card className="neon-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">Idag</span>
                <span className="font-display font-bold text-foreground flex items-center gap-1">
                  <Timer className="w-4 h-4 text-primary" />
                  {passHistory
                    .filter((log) => log.logged_at === new Date().toISOString().split("T")[0])
                    .reduce((sum, log) => sum + log.screen_time_earned, 0)}m
                </span>
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => navigate("/child")}
              >
                Se dagens aktivitet
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pass History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">Sparad aktivitet</h2>
          <Card className="neon-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Aktivitet</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>
              
              {passHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Ingen sparad aktivitet ännu</p>
              ) : (
                <div className="space-y-3">
                  {passHistory.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm text-muted-foreground">{format(new Date(log.logged_at), "MMM d")}</p>
                      </div>
                      <p className="font-display font-bold text-foreground">
                        -{log.screen_time_earned}m
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
