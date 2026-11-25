import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ActivityRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
}

export const ActivityRing = ({ 
  progress, 
  size = 200, 
  strokeWidth = 12,
  className = "",
  children
}: ActivityRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Background ring */}
      {/* --muted already holds a full hsl() colour, so it must not be wrapped in hsl() again. */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: "var(--muted)" }}
          strokeWidth={strokeWidth}
        />
      </svg>

      {/* Progress ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} aria-hidden="true">
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#activityGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeOpacity={progress > 0 ? 1 : 0}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="activityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--reward)" }} />
            <stop offset="100%" style={{ stopColor: "var(--primary)" }} />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : (
          <>
            <motion.span 
              className="text-4xl font-display font-bold text-foreground"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              {Math.round(progress)}%
            </motion.span>
            <span className="text-sm text-muted-foreground">Aktivitet</span>
          </>
        )}
      </div>
    </div>
  );
};
