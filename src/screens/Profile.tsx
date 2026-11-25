import type { ReactNode } from "react";
import { ChevronRight, Loader2, Settings, Target, Users } from "lucide-react";
import { AppScreen } from "@/components/layout/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { useActivityGoal } from "@/hooks/useActivityGoal";
import { useParentLink } from "@/hooks/useParentLink";
import { useNavigate } from "@/lib/router-compat";

/** Who you are and your settings. Asking a parent for time now lives next to the balance on Hem. */
const Profile = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { dailyStepGoal } = useActivityGoal();
  const { parent, loading } = useParentLink();
  const name = profile?.display_name || "Användare";

  return (
    <AppScreen title="Profil">
      <section className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground"
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold">{name}</p>
          <p className="text-sm text-muted-foreground">Barnkonto</p>
        </div>
      </section>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <li>
          <Row icon={<Target className="h-5 w-5 text-primary" />} label="Dagligt stegmål" onClick={() => navigate("/settings")}>
            <span className="font-semibold tabular-nums">{dailyStepGoal.toLocaleString("sv-SE")}</span>
          </Row>
        </li>
        <li>
          <Row icon={<Users className="h-5 w-5 text-primary" />} label="Förälder">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Laddar" />
            ) : (
              <span className="text-muted-foreground">{parent?.name ?? "Inte kopplad"}</span>
            )}
          </Row>
        </li>
        <li>
          <Row icon={<Settings className="h-5 w-5 text-primary" />} label="Inställningar" onClick={() => navigate("/settings")} />
        </li>
      </ul>

      {!loading && !parent && (
        <p className="text-sm text-muted-foreground">Be din förälder lägga till dig i sin GameRun-app.</p>
      )}
    </AppScreen>
  );
};

function Row({ icon, label, children, onClick }: { icon: ReactNode; label: string; children?: ReactNode; onClick?: () => void }) {
  const content = (
    <>
      {icon}
      <span className="flex-1 font-medium">{label}</span>
      {children}
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const className = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} transition-colors hover:bg-muted/50`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default Profile;
