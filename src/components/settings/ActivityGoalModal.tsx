import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, Target } from "lucide-react";
import { toast } from "sonner";

interface ActivityGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: number;
  onSave: (goal: number) => void | Promise<void>;
}

const PRESET_GOALS = [5000, 7500, 10000, 12500, 15000];

export function ActivityGoalModal({ open, onOpenChange, currentGoal, onSave }: ActivityGoalModalProps) {
  const [goal, setGoal] = useState(currentGoal);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setGoal(currentGoal); }, [open, currentGoal]);

  const adjustGoal = (amount: number) => {
    setGoal((prev) => Math.max(1000, Math.min(50000, prev + amount)));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(goal);
      toast.success("Stegmålet är uppdaterat!", {
        description: `Dagligt stegmål: ${goal.toLocaleString("sv-SE")} steg.`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Kunde inte spara stegmålet. Försök igen.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Ändra dagligt stegmål
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Goal Selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="ghost"
              aria-label="Minska stegmålet"
              disabled={saving}
              onClick={() => adjustGoal(-500)}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
            >
              <Minus className="w-6 h-6" />
            </Button>
            <div className="text-center min-w-[140px]">
              <motion.p
                key={goal}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-4xl font-bold text-primary"
              >
                {goal.toLocaleString("sv-SE")}
              </motion.p>
              <p className="text-sm text-muted-foreground">steg per dag</p>
            </div>
            <Button
              variant="ghost"
              aria-label="Öka stegmålet"
              disabled={saving}
              onClick={() => adjustGoal(500)}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {PRESET_GOALS.map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                disabled={saving}
                onClick={() => setGoal(preset)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  goal === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {preset.toLocaleString("sv-SE")}
              </Button>
            ))}
          </div>

          <Button disabled={saving} onClick={() => void handleSave()} className="w-full gradient-activity">
            {saving ? "Sparar…" : "Spara mål"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
