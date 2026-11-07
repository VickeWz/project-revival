import { NavLink } from "./NavLink";
import { User, Home, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/child", icon: Home, label: "Home" },
  { to: "/pass", icon: Ticket, label: "Pass" },
  { to: "/profile", icon: User, label: "Profile" },
];
export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/30 safe-area-pb z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all text-muted-foreground relative"
            activeClassName="text-primary"
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 gradient-glow rounded-2xl neon-border"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-all", isActive && "text-primary drop-shadow-[0_0_8px_hsl(200,100%,50%)]")} />
                <span className={cn("text-[10px] font-semibold relative z-10", isActive && "text-primary")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
