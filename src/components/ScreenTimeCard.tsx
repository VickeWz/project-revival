import { motion } from "framer-motion";
import { Clock, Zap, Gift, Timer } from "lucide-react";

interface ScreenTimeCardProps {
  minutes: number;
  type: "earned" | "remaining" | "bonus";
  className?: string;
}

export const ScreenTimeCard = ({ minutes, type, className = "" }: ScreenTimeCardProps) => {
  const configs = {
    earned: {
      icon: Zap,
      label: "Earned Today",
      gradient: "gradient-activity",
      glow: "shadow-glow-primary",
    },
    remaining: {
      icon: Timer,
      label: "Time Remaining",
      gradient: "gradient-hero",
      glow: "shadow-glow-secondary",
    },
    bonus: {
      icon: Gift,
      label: "Bonus Time",
      gradient: "gradient-reward",
      glow: "shadow-glow-primary",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={`${config.gradient} ${config.glow} rounded-2xl p-5 text-primary-foreground relative overflow-hidden ${className}`}
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{ 
          opacity: [0, 0.2, 0],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium opacity-90">{config.label}</span>
        </div>
        <motion.div 
          className="text-3xl font-display font-bold"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          {timeDisplay}
        </motion.div>
      </div>
    </motion.div>
  );
};