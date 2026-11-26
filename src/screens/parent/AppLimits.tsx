import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AppScreen } from "@/components/layout/AppScreen";
import { MinutePicker } from "@/components/MinutePicker";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppLimit {
  id: string;
  app_name: string;
  daily_limit_minutes: number;
  is_enabled: boolean;
}

const SUGGESTIONS = ["Sociala medier", "Spel", "Video", "Webben"];
const MIN_MINUTES = 5;
const MAX_MINUTES = 240;
const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`);

/**
 * Appgränser for one child (?childId=): a name and minutes per day. The apps for each limit are
 * chosen on the child's iPhone with a parent code, because Apple's app choices never leave the phone.
 */
export default function AppLimits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get("childId");
  const { profile } = useAuth();

  const [limits, setLimits] = useState<AppLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("");
  const [editing, setEditing] = useState<AppLimit | "new" | null>(null);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const fetchLimits = useCallback(async () => {
    if (!profile?.id || !childId) return;
    const { data } = await supabase
      .from("app_limits")
      .select("id, app_name, daily_limit_minutes, is_enabled")
      .eq("parent_id", profile.id)
      .eq("child_id", childId)
      .order("created_at", { ascending: true });
    setLimits(data ?? []);
    setLoading(false);
  }, [profile?.id, childId]);

  useEffect(() => {
    if (!childId) return;
    void fetchLimits();
    void supabase.from("profiles").select("display_name").eq("id", childId).maybeSingle()
      .then(({ data }) => { if (data) setChildName(data.display_name); });
  }, [childId, fetchLimits]);

  const back = () => navigate(childId ? `/parent?barn=${childId}` : "/parent");
  const phone = childName ? `${genitive(childName)} iPhone` : "barnets iPhone";

  const open = (limit: AppLimit | "new") => {
    setEditing(limit);
    setName(limit === "new" ? "" : limit.app_name);
    setMinutes(limit === "new" ? 30 : limit.daily_limit_minutes);
  };

  const save = async () => {
    if (!profile?.id || !childId || !editing || saving) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 40) {
      toast.error("Ge gränsen ett namn, högst 40 tecken.");
      return;
    }
    setSaving(true);
    const { error } = editing === "new"
      ? await supabase.from("app_limits").insert({
          parent_id: profile.id, child_id: childId, app_name: trimmed, category: "Other", daily_limit_minutes: minutes, is_enabled: true,
        })
      : await supabase.from("app_limits").update({ app_name: trimmed, daily_limit_minutes: minutes }).eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Det finns redan en gräns med det namnet." : "Kunde inte spara gränsen.");
      return;
    }
    toast.success(editing === "new" ? "Gränsen är tillagd" : "Gränsen är ändrad", {
      description: `Välj apparna på ${phone} med en kod från dig.`,
    });
    setEditing(null);
    void fetchLimits();
  };

  const toggle = async (limit: AppLimit, enabled: boolean) => {
    setLimits((prev) => prev.map((l) => (l.id === limit.id ? { ...l, is_enabled: enabled } : l)));
    const { error } = await supabase.from("app_limits").update({ is_enabled: enabled }).eq("id", limit.id);
    if (error) {
      toast.error("Kunde inte ändra gränsen.");
      void fetchLimits();
    }
  };

  const remove = async (limit: AppLimit) => {
    const { error } = await supabase.from("app_limits").delete().eq("id", limit.id);
    if (error) {
      toast.error("Kunde inte ta bort gränsen.");
      return;
    }
    setEditing(null);
    setLimits((prev) => prev.filter((l) => l.id !== limit.id));
    toast.success(`${limit.app_name} är borttagen`);
  };

  return (
    <AppScreen nav={false} back={{ label: childName || "Tillbaka", onClick: back }} title="Appgränser">
      <p className="-mt-4 text-muted-foreground">
        Begränsa till exempel sociala medier till 30 minuter om dagen. Gränsen gäller även när telefonen är upplåst med intjänad tid.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Laddar" />
        </div>
      ) : limits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Inga appgränser ännu.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {limits.map((limit) => (
            <li key={limit.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => open(limit)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Timer className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{limit.app_name}</span>
                  <span className="block text-sm text-muted-foreground">{limit.daily_limit_minutes} min per dag</span>
                </span>
              </button>
              <Switch
                aria-label={`${limit.app_name} på`}
                checked={limit.is_enabled}
                onCheckedChange={(enabled) => void toggle(limit, enabled)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button className="h-14 w-full text-base" onClick={() => open("new")}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        Lägg till gräns
      </Button>

      <ul className="space-y-1.5 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <li>• Apparna för varje gräns väljs på {phone} under Hem → Ändra appar och lås, med en kod från dig. Apple låter inga appval lämna telefonen.</li>
        <li>• När tiden är slut spärras apparna resten av dagen. De öppnas igen vid midnatt.</li>
        <li>• Ändrar du en gräns eller apparna börjar dagens användning räknas från noll.</li>
      </ul>

      <Drawer open={editing !== null} onOpenChange={(next) => { if (!next) setEditing(null); }}>
        <DrawerContent className="border-border bg-card">
          <div className="mx-auto w-full max-w-lg space-y-6 px-5 bottom-bar-safe">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-display text-xl">{editing === "new" ? "Ny appgräns" : "Ändra appgräns"}</DrawerTitle>
              <DrawerDescription>Namnet visas för barnet när apparna väljs på {phone}.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2">
              <Label htmlFor="limit-name" className="font-semibold text-foreground">Namn</Label>
              <Input
                id="limit-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Till exempel Sociala medier"
                className="h-14 rounded-2xl border-border bg-card text-base"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className={cn(
                      "h-9 rounded-full px-3 text-sm font-semibold transition-colors",
                      name === suggestion ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <MinutePicker label="Minuter per dag" value={minutes} onChange={setMinutes} min={MIN_MINUTES} max={MAX_MINUTES} presets={[15, 30, 60, 90]} disabled={saving} />
            <div className="space-y-2">
              <Button className="h-14 w-full text-base" onClick={() => void save()} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editing === "new" ? "Lägg till" : "Spara"}
              </Button>
              {editing && editing !== "new" && (
                <Button variant="ghost" className="h-12 w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void remove(editing)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Ta bort gränsen
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </AppScreen>
  );
}
