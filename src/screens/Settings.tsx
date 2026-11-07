import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Heart, 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Activity,
  LogOut,
  Target,
  Trophy,
  Clock,
  Zap,
  MapPin
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { healthKitService } from "@/services/healthKit";
import { notificationService } from "@/services/notifications";
import { useAuth } from "@/hooks/useAuth";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { ActivityGoalModal } from "@/components/settings/ActivityGoalModal";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

function SettingItem({ icon, title, description, action, onClick }: SettingItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action || (onClick && <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { dailyStepGoal, updateGoal } = useActivityGoal();
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [isHealthKitAvailable] = useState(healthKitService.isAvailable());
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  
  // Permission states
  const [pushEnabled, setPushEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  
  // Notification states
  const [challengeAlerts, setChallengeAlerts] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [friendActivity, setFriendActivity] = useState(false);
  const [parentRequests, setParentRequests] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const checkHealthKitStatus = async () => {
      if (isHealthKitAvailable) {
        const storedStatus = localStorage.getItem('healthkit_enabled');
        setHealthKitEnabled(storedStatus === 'true');
      }
    };

    const checkNotificationStatus = () => {
      if ('Notification' in window) {
        setPushEnabled(Notification.permission === 'granted');
      }
      // Load saved notification preferences
      setChallengeAlerts(localStorage.getItem('notif_challenges') !== 'false');
      setDailyReminders(localStorage.getItem('notif_reminders') !== 'false');
      setFriendActivity(localStorage.getItem('notif_friends') === 'true');
      setParentRequests(localStorage.getItem('notif_parent') !== 'false');
    };

    const checkLocationStatus = () => {
      const storedLocation = localStorage.getItem('location_enabled');
      setLocationEnabled(storedLocation === 'true');
    };

    checkHealthKitStatus();
    checkNotificationStatus();
    checkLocationStatus();
  }, [isHealthKitAvailable]);

  const handleHealthKitToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const authorized = await healthKitService.requestAuthorization();
        if (authorized) {
          setHealthKitEnabled(true);
          localStorage.setItem('healthkit_enabled', 'true');
          toast.success('Åtkomst till Hälsa begärd!', {
            description: 'Dina hälsouppgifter kan nu hämtas.',
          });
        } else {
          toast.error('Ingen åtkomst till Hälsa', {
            description: 'Tillåt Hälsa i iPhones inställningar.',
          });
        }
      } catch (error) {
        toast.error('Kunde inte ansluta till Hälsa', {
          description: 'Försök igen eller kontrollera iPhones inställningar.',
        });
      }
    } else {
      setHealthKitEnabled(false);
      localStorage.setItem('healthkit_enabled', 'false');
      toast.success('Hälsa är avstängt');
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setPushEnabled(true);
        toast.success('Notifications enabled!');
      } else {
        toast.error('Notification permission denied');
      }
    } else {
      setPushEnabled(false);
      toast.success('Notifications disabled');
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const result = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        setLocationEnabled(true);
        localStorage.setItem('location_enabled', 'true');
        toast.success('Location enabled!', {
          description: 'You can now get location-based challenges.',
        });
      } catch (error) {
        toast.error('Location access denied', {
          description: 'Please enable location in your device settings.',
        });
      }
    } else {
      setLocationEnabled(false);
      localStorage.setItem('location_enabled', 'false');
      toast.success('Location disabled');
    }
  };

  const handleNotificationPref = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, value.toString());
    toast.success(value ? 'Enabled' : 'Disabled');
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-xl text-foreground">Inställningar</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Health & Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Hälsa och aktivitet
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={<Heart className="w-5 h-5" />}
              title="Hälsa"
              description={isHealthKitAvailable ? "Hämta steg, distans och aktivitet" : "Endast tillgängligt på iPhone"}
              action={
                <Switch
                  checked={healthKitEnabled}
                  onCheckedChange={handleHealthKitToggle}
                  disabled={!isHealthKitAvailable}
                />
              }
            />
            <SettingItem
              icon={<Target className="w-5 h-5" />}
              title="Dagligt stegmål"
              description={`${dailyStepGoal.toLocaleString("sv-SE")} steg`}
              onClick={() => setGoalModalOpen(true)}
            />
            <SettingItem icon={<Clock className="w-5 h-5" />} title="Skärmtid från steg" description="200 steg = 1 minut" />
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Support
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={<Shield className="w-5 h-5" />}
              title="Integritet"
              onClick={() => navigate('/privacy-policy')}
            />
            <SettingItem
              icon={<HelpCircle className="w-5 h-5" />}
              title="Hjälp och support"
              onClick={() => navigate('/help-support')}
            />
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Button
            variant="destructive"
            className="w-full h-12 font-display font-semibold"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logga ut
          </Button>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted-foreground text-sm"
        >
          <p>GameRun v1.0.0</p>
        </motion.div>
      </main>

      {/* Activity Goal Modal */}
      <ActivityGoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        currentGoal={dailyStepGoal}
        onSave={updateGoal}
      />
    </div>
  );
}
