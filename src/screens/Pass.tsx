import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play, Square, MapPin, Clock, Tv, AlertTriangle, Timer, ChevronRight, History, Settings, Info } from "lucide-react";
import { useNavigate, Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { healthKitService } from "@/services/healthKit";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";
import logo from "@/assets/logo.png";

interface PassSession {
  startTime: Date;
  startDistance: number;
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
  const [currentDistance, setCurrentDistance] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [screenTimeBalance, setScreenTimeBalance] = useState(0);
  const [passHistory, setPassHistory] = useState<ActivityLog[]>([]);
  const [customScreenTime, setCustomScreenTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const distanceRef = useRef<NodeJS.Timeout | null>(null);
  
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Calculate earned screen time: 100m = 1 minute
  const distanceTraveled = session ? currentDistance - session.startDistance : 0;
  const earnedMinutes = Math.floor(distanceTraveled / 100);

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
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Poll distance updates
  useEffect(() => {
    if (isActive && session) {
      const updateDistance = async () => {
        const distance = await healthKitService.getDistanceSince(session.startTime);
        setCurrentDistance(session.startDistance + distance);
      };
      updateDistance();
      distanceRef.current = setInterval(updateDistance, 3000);
    }
    return () => {
      if (distanceRef.current) clearInterval(distanceRef.current);
    };
  }, [isActive, session]);

  const handleGoToActive = () => {
    setView("active");
  };

  const handleStart = useCallback(async () => {
    if (!hasPermission) {
      const granted = await healthKitService.requestAuthorization();
      setHasPermission(granted);
      if (!granted) {
        toast.error("Cannot start without HealthKit permission");
        return;
      }
    }

    const data = await healthKitService.getTodayData();
    setSession({
      startTime: new Date(),
      startDistance: data.distance,
    });
    setCurrentDistance(data.distance);
    setElapsedSeconds(0);
    setIsActive(true);
    toast.success("Pass started! Get moving!");
  }, [hasPermission]);

  const handleEnd = useCallback(async () => {
    if (!session || !profile) return;
    
    setIsActive(false);
    setSaving(true);

    const finalDistance = distanceTraveled;
    const finalEarnedMinutes = Math.floor(finalDistance / 100);
    const today = new Date().toISOString().split("T")[0];

    try {
      // Check if there's already an activity log for today
      const { data: existingLog } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", profile.id)
        .eq("logged_at", today)
        .maybeSingle();

      if (existingLog) {
        // Update existing log by adding to it
        const { error: updateError } = await supabase
          .from("activity_logs")
          .update({
            distance_meters: existingLog.distance_meters + finalDistance,
            active_minutes: existingLog.active_minutes + Math.floor(elapsedSeconds / 60),
            screen_time_earned: existingLog.screen_time_earned + finalEarnedMinutes,
          })
          .eq("id", existingLog.id);

        if (updateError) throw updateError;
      } else {
        // Insert new log for today
        const { error: logError } = await supabase.from("activity_logs").insert({
          user_id: profile.id,
          steps: 0,
          distance_meters: finalDistance,
          active_minutes: Math.floor(elapsedSeconds / 60),
          screen_time_earned: finalEarnedMinutes,
          logged_at: today,
        });

        if (logError) throw logError;
      }

      // Update screen time balance
      const { data: balanceData } = await supabase
        .from("screen_time_balance")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();

      const newBalance = (balanceData?.minutes_remaining || 0) + finalEarnedMinutes;

      if (balanceData) {
        await supabase
          .from("screen_time_balance")
          .update({
            minutes_remaining: newBalance,
            last_updated: new Date().toISOString(),
          })
          .eq("user_id", profile.id);
      } else {
        await supabase.from("screen_time_balance").insert({
          user_id: profile.id,
          minutes_remaining: finalEarnedMinutes,
        });
      }

      setScreenTimeBalance(newBalance);
      toast.success(`Pass complete! Earned ${finalEarnedMinutes} minutes`, {
        description: "View your updated balance in Screentime",
      });
      setSession(null);
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
      toast.error("Failed to save pass data");
    } finally {
      setSaving(false);
    }
  }, [session, profile, distanceTraveled, elapsedSeconds]);

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
              Activity Pass
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
                HealthKit access required. Please enable in device Settings.
              </p>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
            <div className="font-display font-bold text-6xl text-foreground mb-2">
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-muted-foreground">{isActive ? "Pass Active" : "Ready to start"}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="font-display font-bold text-2xl text-foreground">
                  {(distanceTraveled / 1000).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">km traveled</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Tv className="w-6 h-6 mx-auto mb-2 text-secondary" />
                <p className="font-display font-bold text-2xl text-foreground">{earnedMinutes}</p>
                <p className="text-xs text-muted-foreground">min earned</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Next minute at</span>
                <span className="font-display font-bold text-foreground">
                  {((earnedMinutes + 1) * 100 - distanceTraveled).toFixed(0)}m
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary" animate={{ width: `${distanceTraveled % 100}%` }} />
              </div>
            </CardContent>
          </Card>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {!isActive ? (
              <Button
                onClick={handleStart}
                disabled={hasPermission === false}
                className="w-full h-16 text-lg font-display font-bold gradient-hero"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Pass
              </Button>
            ) : (
              <Button
                onClick={handleEnd}
                disabled={saving}
                variant="destructive"
                className="w-full h-16 text-lg font-display font-bold"
              >
                <Square className="w-6 h-6 mr-2" />
                {saving ? "Saving..." : "End Pass"}
              </Button>
            )}
          </motion.div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p className="mb-1">100 meters = 1 minute screen time</p>
            <p>Walk or run to earn more!</p>
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
              Screen Time
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
              <p className="text-muted-foreground text-sm mb-2">Available Balance</p>
              <motion.p 
                className="font-display font-bold text-5xl text-primary"
                style={{ textShadow: '0 0 30px hsl(200 100% 50% / 0.5)' }}
              >
                {formatBalance(screenTimeBalance)}
              </motion.p>
            </div>
          </motion.div>

          {/* Custom Use Amount */}
          <div className="mb-6">
            <h3 className="font-display font-semibold text-lg text-foreground mb-3">Use Screen Time</h3>
            <Card className="neon-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="screentime-amount" className="text-muted-foreground text-sm mb-2 block">
                      Enter minutes to use
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="screentime-amount"
                        type="number"
                        min={1}
                        max={screenTimeBalance}
                        placeholder="e.g. 30"
                        value={customScreenTime}
                        onChange={(e) => setCustomScreenTime(e.target.value)}
                        className="flex-1 bg-background/50 border-border/50 text-foreground text-lg font-display"
                      />
                      <span className="flex items-center text-muted-foreground">min</span>
                    </div>
                  </div>
                  <Button
                    className="w-full gradient-hero text-primary-foreground font-semibold"
                    disabled={!customScreenTime || parseInt(customScreenTime) < 1 || parseInt(customScreenTime) > screenTimeBalance}
                    onClick={() => {
                      const mins = parseInt(customScreenTime);
                      if (mins > 0 && mins <= screenTimeBalance) {
                        toast.success(`Activated ${mins} minutes of screen time`);
                        setScreenTimeBalance((prev) => prev - mins);
                        setCustomScreenTime("");
                      }
                    }}
                  >
                    Activate Screen Time
                  </Button>
                  {screenTimeBalance === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      No balance available. Start a Pass to earn more!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
              <p className="font-display font-bold text-foreground">Start Pass</p>
              <p className="text-xs text-muted-foreground mt-1">Track activity & earn time</p>
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
              <p className="font-display font-bold text-foreground">Screentime</p>
              <p className="text-xs text-muted-foreground mt-1">View & use your balance</p>
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
                <h3 className="font-display font-semibold text-foreground">How It Works</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <span className="text-foreground font-medium">5,000 steps = 1 hour</span> of screen time</p>
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
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">Earning Summary</h2>
          <Card className="neon-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">Today</span>
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
                See latest stats
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
          <h2 className="font-display font-semibold text-xl text-foreground mb-4">Spending History</h2>
          <Card className="neon-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Passes</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>
              
              {passHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No pass history yet</p>
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
