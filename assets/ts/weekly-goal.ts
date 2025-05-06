import { Habit, HabitLogs } from "./habit.ts";
import { getDateKey } from "./util.ts";

export function updateWeeklyGoalDisplay(habitName: string, habit: Habit) {
  if (!habit.weekly_goal) return;
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) return;

  const weekElement = root.querySelector(".weekly-text");
  if (!weekElement) return;

  const count = countWeek(habit.logs);
  weekElement.textContent = `${count}/${habit.weekly_goal}`;
}

function countWeek(logs: HabitLogs): number {
  const currentDate = new Date();
  const monday = new Date();
  // get monday
  monday.setDate(
    monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1)
  );

  let count = 0;
  while (currentDate >= new Date(monday)) {
    const dateKey = getDateKey(currentDate);
    if (logs[dateKey]) {
      count += logs[dateKey];
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return count;
}
