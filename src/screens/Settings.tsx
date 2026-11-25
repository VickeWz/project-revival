import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Clock, Heart, HelpCircle, LogOut, Shield, Target, User } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AppScreen } from "@/components/layout/AppScreen";
import { ActivityGoalModal } from "@/components/settings/ActivityGoalModal";
import { useAuth } from "@/hooks/useAuth";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { useNavigate } from "@/lib/router-compat";
import { healthKitService } from "@/services/healthKit";

/**
 * Health permission stays on the phone; the step goal is shared through the child's profile.
 */
export default function Settings() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const isChild = profile?.role === "child";
  const { dailyStepGoal, updateGoal, loading: goalLoading, error: goalError } = useActivityGoal();
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [isHealthKitAvailable] = useState(healthKitService.isAvailable());
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  useEffect(() => {
    if (isHealthKitAvailable) setHealthKitEnabled(localStorage.getItem("healthkit_enabled") === "true");
  }, [isHealthKitAvailable]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleHealthKitToggle = async (enabled: boolean) => {
    if (!enabled) {
      setHealthKitEnabled(false);
      localStorage.setItem("healthkit_enabled", "false");
      toast.success("Hälsa är avstängt");
      return;
    }
    try {
      if (await healthKitService.requestAuthorization()) {
        setHealthKitEnabled(true);
        localStorage.setItem("healthkit_enabled", "true");
        toast.success("Åtkomst till Hälsa begärd!", { description: "Dina steg kan nu hämtas." });
      } else {
        toast.error("Ingen åtkomst till Hälsa", { description: "Tillåt Hälsa i iPhones inställningar." });
      }
    } catch {
      toast.error("Kunde inte ansluta till Hälsa", { description: "Försök igen eller kontrollera iPhones inställningar." });
    }
  };

  return (
    <AppScreen
      nav={isChild}
      back={{ label: isChild ? "Profil" : "Översikt", onClick: () => navigate(isChild ? "/profile" : "/parent") }}
      title="Inställningar"
    >
      {isChild ? (
        <Group title="Hälsa och aktivitet">
          <Row
            icon={<Heart className="h-5 w-5" />}
            title="Hälsa"
            description={isHealthKitAvailable ? "Hämta steg och distans" : "Endast tillgängligt på iPhone"}
            action={
              <Switch
                aria-label="Hälsa"
                checked={healthKitEnabled}
                onCheckedChange={(enabled) => void handleHealthKitToggle(enabled)}
                disabled={!isHealthKitAvailable}
              />
            }
          />
          <Row
            icon={<Target className="h-5 w-5" />}
            title="Dagligt stegmål"
            description={goalLoading ? "Laddar…" : goalError ? "Kunde inte hämta stegmålet" : `${dailyStepGoal.toLocaleString("sv-SE")} steg`}
            {...(!goalLoading && !goalError ? { onClick: () => setGoalModalOpen(true) } : {})}
          />
          <Row icon={<Clock className="h-5 w-5" />} title="Skärmtid från steg" description="200 steg = 1 minut" />
        </Group>
      ) : (
        <Group title="Konto">
          <Row icon={<User className="h-5 w-5" />} title="Namn" description={profile?.display_name ?? ""} />
        </Group>
      )}

      <Group title="Support">
        <Row icon={<Shield className="h-5 w-5" />} title="Integritet" onClick={() => navigate("/privacy-policy")} />
        <Row icon={<HelpCircle className="h-5 w-5" />} title="Hjälp och support" onClick={() => navigate("/help-support")} />
      </Group>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        Logga ut
      </button>
      <p className="text-center text-sm text-muted-foreground">GameRun v1.0.0</p>

      {isChild && (
        <ActivityGoalModal
          open={goalModalOpen}
          onOpenChange={setGoalModalOpen}
          currentGoal={dailyStepGoal}
          onSave={updateGoal}
        />
      )}
    </AppScreen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="ml-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</ul>
    </section>
  );
}

interface RowProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  onClick?: () => void;
}

function Row({ icon, title, description, action, onClick }: RowProps) {
  const content = (
    <>
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{title}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      {action ?? (onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />)}
    </>
  );
  const className = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left";
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={`${className} transition-colors hover:bg-muted/50`}>
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}
