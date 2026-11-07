import { useState, useEffect } from "react";

const STREAK_KEY = "user_streak";
const LAST_LOGIN_KEY = "last_login_date";

export function useStreak() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const storedStreak = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);

    if (lastLogin === today) {
      // Already logged in today, keep the streak
      setStreak(storedStreak);
    } else if (lastLogin) {
      // Check if the last login was yesterday
      const lastDate = new Date(lastLogin);
      const todayDate = new Date(today);
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day, increment streak
        const newStreak = storedStreak + 1;
        setStreak(newStreak);
        localStorage.setItem(STREAK_KEY, newStreak.toString());
        localStorage.setItem(LAST_LOGIN_KEY, today);
      } else if (diffDays > 1) {
        // Streak broken, reset to 1
        setStreak(1);
        localStorage.setItem(STREAK_KEY, "1");
        localStorage.setItem(LAST_LOGIN_KEY, today);
      }
    } else {
      // First time login
      setStreak(1);
      localStorage.setItem(STREAK_KEY, "1");
      localStorage.setItem(LAST_LOGIN_KEY, today);
    }
  }, []);

  return { streak };
}

