import { motion } from "framer-motion";
import { Home, BarChart3 } from "lucide-react";

interface ParentNavProps {
  activeTab: "home" | "screentime";
  onTabChange: (tab: "home" | "screentime") => void;
}

export function ParentNav({ activeTab, onTabChange }: ParentNavProps) {
  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "screentime" as const, label: "Screen Time", icon: BarChart3 },
  ];

  return (
    <div className="flex bg-muted/50 rounded-xl p-1 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
            activeTab === tab.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeParentTab"
              className="absolute inset-0 bg-card rounded-lg shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
