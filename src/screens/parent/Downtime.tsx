import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Clock, 
  Plus,
  Check
} from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Downtime() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get("childId");
  const { profile } = useAuth();
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("07:00");
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (profile?.id && childId) {
      fetchDowntime();
      fetchChildName();
    }
  }, [profile?.id, childId]);

  const fetchChildName = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", childId)
      .maybeSingle();
    
    if (data) setChildName(data.display_name);
  };

  const fetchDowntime = async () => {
    if (!profile?.id || !childId) return;
    
    const { data, error } = await supabase
      .from("downtime_schedules")
      .select("*")
      .eq("parent_id", profile.id)
      .eq("child_id", childId)
      .maybeSingle();

    if (data) {
      setIsEnabled(data.is_enabled);
      setStartTime(data.start_time.slice(0, 5));
      setEndTime(data.end_time.slice(0, 5));
      setSelectedDays(data.days_enabled);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile?.id || !childId) return;
    setSaving(true);

    const { error } = await supabase
      .from("downtime_schedules")
      .upsert({
        parent_id: profile.id,
        child_id: childId,
        start_time: startTime,
        end_time: endTime,
        days_enabled: selectedDays,
        is_enabled: isEnabled,
      }, { onConflict: "parent_id,child_id" });

    setSaving(false);
    if (error) {
      toast.error("Failed to save downtime settings");
    } else {
      toast.success("Downtime settings saved!");
      navigate(-1);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">Downtime</h1>
              {childName && <p className="text-sm text-muted-foreground">{childName}</p>}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Enable Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-foreground">Scheduled</p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled ? `${startTime} to ${endTime}` : "Off"}
                </p>
              </div>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </motion.div>

        {isEnabled && (
          <>
            {/* Time Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 mb-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Schedule</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">From</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-muted px-3 py-2 rounded-lg text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">To</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-muted px-3 py-2 rounded-lg text-foreground"
                  />
                </div>
              </div>
            </motion.div>

            {/* Days Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 mb-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Days</h3>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/30 rounded-2xl p-4"
        >
          <p className="text-sm text-muted-foreground">
            During downtime, only apps in "Always Allowed" and phone calls will be available. 
            This helps establish healthy screen time boundaries.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
