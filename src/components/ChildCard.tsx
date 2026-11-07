import { motion } from "framer-motion";
import { Clock, Activity, Gift, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface ChildCardProps {
  name: string;
  avatar: string;
  screenTimeRemaining: number;
  activityProgress: number;
  isLocked: boolean;
  onGrantTime?: () => void;
  onViewDetails?: () => void;
  onRemove?: () => void;
}

export const ChildCard = ({
  name,
  avatar,
  screenTimeRemaining,
  activityProgress,
  isLocked,
  onGrantTime,
  onRemove,
}: ChildCardProps) => {
  const hours = Math.floor(screenTimeRemaining / 60);
  const mins = screenTimeRemaining % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-14 h-14 rounded-full object-cover ring-4 ring-background"
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
              isLocked ? 'bg-destructive' : 'gradient-activity'
            }`}>
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">{name}</h3>
            <span className={`text-sm font-medium ${isLocked ? 'text-destructive' : 'text-primary'}`}>
              {isLocked ? 'Phone Locked' : 'Phone Active'}
            </span>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will unlink {name} from your account. You can always add them back later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-muted rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Time Left</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">{timeDisplay}</span>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Activity</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">{activityProgress}%</span>
        </div>
      </div>

      <Button variant="reward" className="w-full" onClick={onGrantTime}>
        <Gift className="w-4 h-4" />
        Grant Screen Time
      </Button>
    </motion.div>
  );
};