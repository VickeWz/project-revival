import { Home, User, Zap } from "lucide-react";
import { Link, useLocation } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

// Three jobs, three tabs: see and use your time (Hem), earn more (Tjäna), you (Profil).
// `also` lists pushed screens that belong to a tab (Inställningar opens from Profil).
const navItems = [
  { to: "/child", icon: Home, label: "Hem", also: [] as string[] },
  { to: "/pass", icon: Zap, label: "Tjäna", also: [] as string[] },
  { to: "/profile", icon: User, label: "Profil", also: ["/settings"] },
];

export const BottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-xl safe-bottom"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3">
        {navItems.map(({ to, icon: Icon, label, also }) => {
          const isActive = [to, ...also].some((path) => pathname === path || pathname.startsWith(`${path}/`));
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-muted-foreground transition-colors",
                  isActive && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary/15",
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
