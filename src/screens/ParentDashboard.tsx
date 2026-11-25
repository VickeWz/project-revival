import { useRef, useState } from "react";
import { Loader2, Settings, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppScreen } from "@/components/layout/AppScreen";
import { ChildSummaryCard } from "@/components/parent/ChildSummaryCard";
import { GiveTimeDrawer } from "@/components/parent/GiveTimeDrawer";
import { RequestCard } from "@/components/parent/RequestCard";
import { ChildDetail } from "@/screens/parent/ChildDetail";
import { useAuth } from "@/hooks/useAuth";
import { useParentOverview, type LinkedChild, type TimeRequest } from "@/hooks/useParentOverview";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "@/lib/router-compat";

/**
 * The parent app: one overview (requests first, then each child) with pushed screens for a
 * child (/parent?barn=<id>), adding a child and settings. No tab bar: there is one main job.
 */
export default function ParentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("barn");
  const { children, setChildren, requests, setRequests, loading, refresh } = useParentOverview();
  const [giveTo, setGiveTo] = useState<LinkedChild | null>(null);
  const [busyRequest, setBusyRequest] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Same id for a retry of the same request and amount, so a lost response cannot credit twice.
  const grantIds = useRef<Record<string, string>>({});

  const setBalance = (childId: string, balance: number) =>
    setChildren((prev) => prev.map((child) => (child.id === childId ? { ...child, balance } : child)));

  const approve = async (request: TimeRequest, minutes: number) => {
    if (busyRequest) return;
    setBusyRequest(request.id);
    const key = `request:${request.id}:${minutes}`;
    try {
      grantIds.current[key] ??= crypto.randomUUID();
      const { data, error } = await supabase.rpc("grant_screen_time", {
        p_id: grantIds.current[key],
        p_child_id: request.childId,
        p_minutes: minutes,
        p_request_id: request.id,
      });
      if (error) throw error;
      delete grantIds.current[key];
      toast.success(`${minutes} min har lagts till hos ${request.childName}.`);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (typeof data === "number") setBalance(request.childId, data);
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Kunde inte godkänna förfrågan. Försök igen.");
      void refresh();
    } finally {
      setBusyRequest(null);
    }
  };

  const decline = async (request: TimeRequest) => {
    if (busyRequest) return;
    setBusyRequest(request.id);
    try {
      const { error } = await supabase
        .from("screen_time_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;
      toast(`Förfrågan från ${request.childName} avslogs.`);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Kunde inte avslå förfrågan. Försök igen.");
    } finally {
      setBusyRequest(null);
    }
  };

  const remove = async (child: LinkedChild) => {
    if (!profile?.id) return;
    try {
      const { error } = await supabase
        .from("parent_child_links")
        .delete()
        .eq("parent_id", profile.id)
        .eq("child_id", child.id);
      if (error) throw error;
      toast.success(`${child.name} är bortkopplad.`);
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      setRequests((prev) => prev.filter((r) => r.childId !== child.id));
      navigate("/parent", { replace: true });
    } catch (error) {
      console.error("Error removing child:", error);
      toast.error("Kunde inte koppla bort barnet.");
    }
  };

  const giveDrawer = (
    <GiveTimeDrawer
      child={giveTo}
      onClose={() => setGiveTo(null)}
      onGiven={(childId, balance) => {
        if (balance !== null) setBalance(childId, balance);
        setRefreshKey((key) => key + 1);
      }}
    />
  );

  if (selectedId) {
    const selected = children.find((child) => child.id === selectedId);
    if (selected) {
      return (
        <>
          <ChildDetail
            child={selected}
            refreshKey={refreshKey}
            onBack={() => navigate("/parent")}
            onGive={() => setGiveTo(selected)}
            onRemove={() => void remove(selected)}
          />
          {giveDrawer}
        </>
      );
    }
    return (
      <AppScreen nav={false} back={{ label: "Översikt", onClick: () => navigate("/parent") }} title="Barnet">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Laddar" />
          </div>
        ) : (
          <p className="text-muted-foreground">Barnet är inte kopplat till ditt konto.</p>
        )}
      </AppScreen>
    );
  }

  return (
    <AppScreen
      nav={false}
      title={`Hej${profile?.display_name ? ` ${profile.display_name}` : ""}!`}
      action={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Inställningar"
          className="h-11 w-11 shrink-0 rounded-full bg-card"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      }
    >
      {requests.length > 0 && (
        <section aria-labelledby="requests-heading" className="space-y-3">
          <h2 id="requests-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
            Förfrågningar
            <span className="rounded-full bg-primary px-2 font-body text-sm font-extrabold text-primary-foreground">
              {requests.length}
            </span>
          </h2>
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              busy={busyRequest === request.id}
              onApprove={(minutes) => void approve(request, minutes)}
              onDecline={() => void decline(request)}
            />
          ))}
        </section>
      )}

      <section aria-labelledby="children-heading" className="space-y-3">
        <h2 id="children-heading" className="font-display text-lg font-semibold">Dina barn</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Laddar" />
          </div>
        ) : children.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Inga barn är kopplade ännu. Lägg till ditt barn för att se aktivitet och svara på förfrågningar om tid.
          </p>
        ) : (
          children.map((child) => (
            <ChildSummaryCard
              key={child.id}
              child={child}
              onOpen={() => navigate(`/parent?barn=${child.id}`)}
              onGive={() => setGiveTo(child)}
            />
          ))
        )}
        <button
          type="button"
          onClick={() => navigate("/parent/add-child")}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-muted-foreground/40 font-semibold transition-colors hover:bg-card"
        >
          <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          Lägg till barn
        </button>
      </section>

      {giveDrawer}
    </AppScreen>
  );
}
