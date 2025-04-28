import { getDateKey, HabitLogs } from "./habit.ts";

interface StreakInfo {
  type: "none" | "day" | "week";
  count: number;
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function calculateStreak(logs: HabitLogs): StreakInfo {
  if (logs.length === 0) return { type: "none", count: 0 };
  const dates = Object.keys(logs).sort();

  // check daily streak first
  const dailyStreak = calculateDailyStreak(logs, dates[0]);
  if (dailyStreak > 1) {
    return { type: "day", count: dailyStreak };
  }

  const weeklyStreak = calculateWeeklyStreak(dates);
  if (weeklyStreak > 1) {
    return { type: "week", count: weeklyStreak };
  }

  return { type: "none", count: dailyStreak };
}

function calculateDailyStreak(logs: HabitLogs, start: string): number {
  const currentDate = new Date();
  let streak = 0;
  while (currentDate >= new Date(start)) {
    const dateKey = getDateKey(currentDate);
    if (!logs[dateKey]) {
      return streak;
    }
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return streak;
}

function calculateWeeklyStreak(dates: string[]): number {
  // Group logs by week
  const weeklyLogs = new Map<number, boolean>();
  dates.forEach((date) => {
    const weekNum = getWeekNumber(new Date(date));
    weeklyLogs.set(weekNum, true);
  });
  console.log(weeklyLogs);

  const currentWeek = getWeekNumber(new Date());
  let streak = 0;

  for (let week = currentWeek; week >= 0; week--) {
    if (!weeklyLogs.has(week)) {
      return streak;
    }
    streak++;
  }
  return streak;
}

function getStreakText(streak: StreakInfo): string {
  if (streak.count === 1 && streak.type === "none") {
    return "Good start!";
  }
  if (streak.type === "week") {
    return `${streak.count} week streak 🔥`;
  }
  if (streak.type === "day" && streak.count > 1) {
    return `${streak.count} day streak ❤️‍🔥`;
  }
  return "";
}

export function updateStreakDisplay(habitName: string, logs: HabitLogs) {
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) return;

  const streakElement = root.querySelector(".streak-text");
  if (!streakElement) return;

  const streak = calculateStreak(logs);
  streakElement.textContent = getStreakText(streak);
}
