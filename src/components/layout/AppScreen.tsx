import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

interface AppScreenProps {
  title: ReactNode;
  /** Optional control on the right of the title, e.g. an icon button. */
  action?: ReactNode;
  /** Optional back link shown above the title on pushed screens. */
  back?: { label: string; onClick: () => void };
  /** The child's bottom navigation. The parent app has no tab bar. */
  nav?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Shared frame for app screens: a large title below the status bar, one phone-width
 * column, and (for the child) the bottom navigation above the home indicator.
 * Use it for every screen so width, spacing and safe areas stay identical.
 */
export function AppScreen({ title, action, back, nav = true, children, className }: AppScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className={cn("mx-auto max-w-lg px-5 pb-5", back ? "safe-top pt-2" : "header-safe")}>
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className="-ml-2 flex h-11 items-center gap-0.5 rounded-xl px-2 font-semibold text-primary"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            {back.label}
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 font-display text-[1.75rem] font-bold leading-tight text-foreground">{title}</h1>
          {action}
        </div>
      </header>
      <main className={cn("mx-auto max-w-lg space-y-7 px-5", nav ? "nav-safe-pb" : "bottom-bar-safe", className)}>
        {children}
      </main>
      {nav && <BottomNav />}
    </div>
  );
}
