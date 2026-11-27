import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ChildApp } from "@/lib/child-apps";
import { cn } from "@/lib/utils";

interface ChildAppPickerProps {
  apps: ChildApp[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

/** The apps on the child's phone as a searchable checklist, for picking the apps of an app limit. */
export function ChildAppPicker({ apps, selected, onChange, disabled = false }: ChildAppPickerProps) {
  const [query, setQuery] = useState("");
  const chosen = useMemo(() => new Set(selected), [selected]);
  const needle = query.trim().toLocaleLowerCase("sv");
  // Chosen apps first, then the rest in the phone's order.
  const shown = useMemo(() => {
    const matching = needle ? apps.filter((app) => app.name.toLocaleLowerCase("sv").includes(needle)) : apps;
    return [...matching.filter((app) => chosen.has(app.id)), ...matching.filter((app) => !chosen.has(app.id))];
  }, [apps, needle, chosen]);

  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((pkg) => pkg !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      {apps.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök app"
            aria-label="Sök bland barnets appar"
            className="h-12 rounded-2xl border-border bg-muted/40 pl-11 text-base"
          />
        </div>
      )}
      <ul role="group" aria-label="Barnets appar" className="max-h-64 divide-y divide-border overflow-y-auto overscroll-contain rounded-2xl border border-border">
        {shown.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">Ingen app heter så.</li>
        ) : (
          shown.map((app) => {
            const on = chosen.has(app.id);
            return (
              <li key={app.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => toggle(app.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-muted/60 disabled:opacity-50"
                >
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted font-display text-sm font-bold uppercase text-muted-foreground">
                    {app.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{app.name}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

/** "TikTok", "TikTok och YouTube", "TikTok, YouTube och 2 till". */
export function describeApps(ids: readonly string[], apps: readonly ChildApp[]): string {
  const names = ids.map((id) => apps.find((app) => app.id === id)?.name).filter((name): name is string => !!name);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} och ${names[1]}`;
  return `${names[0]}, ${names[1]} och ${names.length - 2} till`;
}
