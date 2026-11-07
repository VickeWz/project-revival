import { useState, useEffect } from "react";

const SCREEN_TIME_RATIO_KEY = "screen_time_ratio";
const DEFAULT_RATIO = 100; // 100 meters = 1 minute (default)

export function useScreenTimeSettings() {
  const [metersPerMinute, setMetersPerMinute] = useState(DEFAULT_RATIO);

  useEffect(() => {
    const stored = localStorage.getItem(SCREEN_TIME_RATIO_KEY);
    if (stored) {
      setMetersPerMinute(parseInt(stored, 10));
    }
  }, []);

  const updateRatio = (newRatio: number) => {
    const clampedRatio = Math.max(50, Math.min(500, newRatio));
    setMetersPerMinute(clampedRatio);
    localStorage.setItem(SCREEN_TIME_RATIO_KEY, clampedRatio.toString());
  };

  // Calculate screen time from distance
  const calculateScreenTime = (distanceMeters: number) => {
    return Math.floor(distanceMeters / metersPerMinute);
  };

  return { metersPerMinute, updateRatio, calculateScreenTime };
}
