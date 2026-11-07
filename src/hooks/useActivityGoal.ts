import { useState, useEffect } from "react";

const ACTIVITY_GOAL_KEY = "activity_goal_steps";
const DEFAULT_GOAL = 10000;

export function useActivityGoal() {
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(DEFAULT_GOAL);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVITY_GOAL_KEY);
    if (stored) {
      setDailyStepGoal(parseInt(stored, 10));
    }
  }, []);

  const updateGoal = (newGoal: number) => {
    const clampedGoal = Math.max(1000, Math.min(50000, newGoal));
    setDailyStepGoal(clampedGoal);
    localStorage.setItem(ACTIVITY_GOAL_KEY, clampedGoal.toString());
  };

  return { dailyStepGoal, updateGoal };
}
