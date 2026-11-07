import { motion } from "framer-motion";
import { LucideIcon, Play, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface ChallengeCardProps {
  title: string;
  description: string;
  reward: number;
  icon: LucideIcon;
  progress: number;
  target: number;
  unit: string;
  isCompleted?: boolean;
  onStart?: () => void;
}

export const ChallengeCard = ({
  title,
  description,
  reward,
  icon: Icon,
  progress,
  target,
  unit,
  isCompleted = false,
  onStart,
}: ChallengeCardProps) => {
  const progressPercent = Math.min((progress / target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      className="bg-card rounded-2xl p-5 shadow-card border border-border/50"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${isCompleted ? 'gradient-activity' : 'bg-muted'}`}>
          <Icon className={`w-6 h-6 ${isCompleted ? 'text-primary-foreground' : 'text-foreground'}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
            <span className="text-sm font-bold gradient-reward text-transparent bg-clip-text">
              +{reward}m
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          
          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
            <motion.div
              className="absolute inset-y-0 left-0 gradient-activity rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {progress} / {target} {unit}
            </span>
            
            {isCompleted ? (
              <div className="flex items-center gap-1 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Completed!</span>
              </div>
            ) : (
              <Button size="sm" variant="hero" onClick={onStart}>
                <Play className="w-3 h-3" />
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
