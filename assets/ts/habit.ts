import { saveData, renderAllHabits, heatmapInstances } from "./main.ts";
import { updateStreakDisplay } from "./streak.ts";
import { formatDateLabel, getDateKey } from "./util.ts";
import { updateWeeklyGoalDisplay } from "./weekly-goal.ts";

export type HabitLogs = { [date: string]: number };

export interface Habit {
  logs: HabitLogs;
  sort?: number | undefined;
  weekly_goal?: number | undefined;
}

export interface HabitMap {
  [habitName: string]: Habit;
}

function updateDayLabel(label: HTMLElement | null, date: Date) {
  if (!label) {
    return;
  }
  label.textContent = formatDateLabel(date);
}

// --- Event Handlers ---
export function logHabit(habitName: string, habitData: HabitMap, date?: Date) {
  const day = getDateKey(date);
  if (!habitData[habitName].logs[day]) {
    habitData[habitName].logs[day] = 0;
  }
  habitData[habitName].logs[day]++;
  saveData(habitData);
  // TODO: put request to /habits/id
  updateHeatmap(habitName, habitData[habitName]);
  updateStreakDisplay(habitName, habitData[habitName].logs);
  updateWeeklyGoalDisplay(habitName, habitData[habitName]);
}

function clearLog(habitName: string, habitData: HabitMap, date?: Date) {
  const day = getDateKey(date);
  if (habitData[habitName].logs[day] < 1) {
    return;
  }
  if (!habitData[habitName].logs[day]) {
    habitData[habitName].logs[day] = 0;
  }
  habitData[habitName].logs[day]--;
  saveData(habitData);
  // TODO: put request to /habits/id
  updateHeatmap(habitName, habitData[habitName]);
  updateStreakDisplay(habitName, habitData[habitName].logs);
  updateWeeklyGoalDisplay(habitName, habitData[habitName]);
}

function editHabit(
  newName: string,
  oldName: string,
  habitData: HabitMap,
  newHabit: Habit
) {
  habitData[newName] = newHabit;
  if (newName != oldName) {
    delete habitData[oldName];
  }
  saveData(habitData);
  // TODO: edit request to /habits/id
  renderAllHabits(habitData); // Re-render the UI
}

function deleteHabit(habitName: string, habitData: HabitMap) {
  console.log(`Deleting habit: ${habitName}`);
  if (
    !confirm(
      `Are you sure you want to delete "${habitName}"? This cannot be undone.`
    )
  ) {
    return;
  }

  delete habitData[habitName]; // Remove habit from data object
  saveData(habitData);
  // TODO: delete request to /habits/id
  renderAllHabits(habitData); // Re-render the UI
}

// --- Heatmap Update ---
function updateHeatmap(habitName: string, habit: Habit) {
  const cal = heatmapInstances[habitName];
  if (!cal) {
    console.error(`Heatmap instance not found for ${habitName}`);
    return;
  }
  const data = Object.entries(habit.logs).map(([date, value]) => ({
    date,
    value,
  }));
  cal.fill(data);
}

// --- Heatmap Initialization ---
function initializeAndConfigureHeatmap(
  habitName: string,
  heatmapSelector: string,
  habit: Habit,
  startDate: Date
): CalHeatmap {
  const cal = new CalHeatmap();
  heatmapInstances[habitName] = cal; // Store instance

  let data = {};
  if (habit.logs) {
    data = Object.entries(habit.logs).map(([date, value]) => ({
      date,
      value,
    }));
  }
  // TODO: set range to latest date + 1 month or 4 for mobile 6 for desktop
  // TODO: set range based on available space
  // TODO: paginate

  cal.paint(
    {
      theme: "dark",
      itemSelector: heatmapSelector,
      range: 6,
      domain: { type: "month" },
      subDomain: { type: "day", radius: 2, width: 16, height: 16 },
      data: { source: data, x: "date", y: "value" },
      date: { start: startDate },
      scale: {
        // color: {
        //   type: "threshold",
        //   range: ["#2E333A", "#3399FF", "#00C2A8", "#00D26A", "#00FF9D"],
        //   domain: [0, 1, 2, 4, 6],
        // },
        color: {
          type: "linear",
          range: ["#2E333A", "#3399FF"],
          domain: [0, 2],
          interpolate: "hsl",
        },
        // opacity: {
        //   baseColor: "#3399FF",
        //   type: "linear",
        //   domain: [0, 6],
        // },
      },
    },
    [
      [
        Tooltip,
        {
          text: function (date, value) {
            if (!date) {
              return;
            }
            const dateString = formatDateLabel(new Date(date));
            if (!value) {
              return `${dateString}`;
            }

            return `${dateString} - ${value}`;
          },
        },
      ],
    ]
  );
  return cal;
}

function getHabitStartDate(logs: HabitLogs) {
  if (!logs) {
    return new Date();
  }
  const days = Object.keys(logs);
  if (days.length > 0) {
    const earliest = days.sort()[0];
    return new Date(earliest);
  }
  return new Date();
}

export function setupHabit(habitName: string, allHabits: HabitMap) {
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) {
    console.error(`Habit section for "${habitName}" not found`);
    return;
  }

  // TODO: hide heatmap by deafult
  // TODO: show heatmap when action is taken on this card
  // TODO: hide all other heatmaps when this heatmap is shown
  const habit = allHabits[habitName];
  if (!habit) {
    return;
  }

  const dayLabel = root.querySelector<HTMLButtonElement>(".day-label");

  let selectedDay = new Date();
  setupHabitEventListeners(
    root,
    habitName,
    allHabits,
    () => selectedDay,
    (date) => {
      selectedDay = date;
      updateDayLabel(dayLabel, date);
    }
  );

  updateStreakDisplay(habitName, allHabits[habitName].logs);
  updateWeeklyGoalDisplay(habitName, allHabits[habitName]);
  // defer heatmap paint
  setTimeout(() => {
    const heatmapSelector = `#cal-${habitName
      .replace(/\s+/g, "-")
      .toLowerCase()}`;
    const cal = initializeAndConfigureHeatmap(
      habitName,
      heatmapSelector,
      habit,
      getHabitStartDate(habit.logs)
    );

    setupHeatmapClickHandler(cal, (date) => {
      selectedDay = date; // Update state when a day is clicked
      updateDayLabel(dayLabel, date);
    });
  }, 0);
}

// --- Event Listener Setup ---
function setupHabitEventListeners(
  root: Element,
  habitName: string,
  allHabits: HabitMap,
  getSelectedDay: () => Date,
  onDaySelect: (day: Date) => void
) {
  $(root)
    .find(".next-day")
    .on("click", () => {
      const currentDate = getSelectedDay();
      if (
        currentDate.toISOString().split("T")[0] >=
        new Date().toISOString().split("T")[0]
      ) {
        // prevent future
        return;
      }

      const nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      onDaySelect(nextDate);
    });

  $(root)
    .find(".previous-day")
    .on("click", () => {
      const currentDate = getSelectedDay();
      const prevDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
      onDaySelect(prevDate);
    });

  root
    .querySelector(".log-habit")
    ?.addEventListener("click", () =>
      logHabit(habitName, allHabits, getSelectedDay())
    );
  root
    .querySelector(".clear-log")
    ?.addEventListener("click", () =>
      clearLog(habitName, allHabits, getSelectedDay())
    );

  $(root)
    .find(".edit-habit")
    .popover({
      html: true,
      placement: "bottom",
      sanitize: false,
    })
    .on("click", () => {
      setTimeout(() => {
        setupEditPopover(habitName, allHabits);
      }, 0);
    });
}

function setupEditPopover(habitName: string, allHabits: HabitMap) {
  const renameInput = $(".rename-habit-input");
  renameInput.val(habitName);
  const sortInput = $(".sort-input");
  const weeklyGoalInput = $(".weekly-goal-input");
  const habit = allHabits[habitName];
  sortInput.val(habit.sort ?? 0);
  weeklyGoalInput.val(habit.weekly_goal ?? 0);
  $(".save-habit")
    .off("click")
    .on("click", function () {
      $('[data-bs-toggle="popover"]').popover("hide");
      const newLog = allHabits[habitName];
      const newGoal = parseInt(weeklyGoalInput.val(), 10);
      if (newGoal) {
        newLog.weekly_goal = newGoal;
      }
      const newSort = parseInt(sortInput.val(), 10);
      if (newSort) {
        newLog.sort = newSort;
      }
      editHabit(renameInput.val(), habitName, allHabits, newLog);
    });

  $(".delete-habit")
    .off("click")
    .on("click", function () {
      $('[data-bs-toggle="popover"]').popover("hide");
      deleteHabit(habitName, allHabits);
    });
}

// --- Heatmap Interaction ---
function setupHeatmapClickHandler(
  cal: CalHeatmap,
  onDaySelect: (day: Date) => void
) {
  cal.on("click", (_, timestamp) => {
    const now = new Date();
    if (timestamp > now) {
      // prevent selecting future
      return;
    }

    onDaySelect(new Date(timestamp));
  });
}
