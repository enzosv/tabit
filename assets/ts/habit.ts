import { saveData, renderAllHabits, heatmapInstances } from "./main.ts";
import { updateStreakDisplay } from "./streak.ts";
import { formatDateLabel, getDateKey } from "./util.ts";

export interface HabitLogs {
  [date: string]: number;
  sort: number;
  weekly_goal: number;
}

export function getDateKeysFromLogs(logs: {
  [date: string]: number;
}): string[] {
  return Object.keys(logs).filter(
    (key) =>
      key !== "sort" && key !== "weekly_goal" && /^\d{4}-\d{2}-\d{2}$/.test(key) // ensures key matches date format YYYY-MM-DD
  );
}

export interface HabitData {
  [habitName: string]: HabitLogs;
}

function updateDayLabel(label: HTMLElement | null, date: Date) {
  if (!label) {
    return;
  }
  label.textContent = formatDateLabel(date);
}

// --- Event Handlers ---
export function logHabit(habitName: string, habitData: HabitData, date?: Date) {
  const day = getDateKey(date);
  if (!habitData[habitName][day]) {
    habitData[habitName][day] = 0;
  }
  habitData[habitName][day]++;
  saveData(habitData);
  // TODO: put request to /habits/id
  updateHeatmap(habitName, habitData[habitName]);
  updateStreakDisplay(habitName, habitData[habitName]); // Add this line
}

function clearLog(habitName: string, habitData: HabitData, date?: Date) {
  const day = getDateKey(date);
  if (habitData[habitName][day] < 1) {
    return;
  }
  if (!habitData[habitName][day]) {
    habitData[habitName][day] = 0;
  }
  habitData[habitName][day]--;
  saveData(habitData);
  // TODO: put request to /habits/id
  updateHeatmap(habitName, habitData[habitName]);
  updateStreakDisplay(habitName, habitData[habitName]); // Add this line
}

function editHabit(
  newName: string,
  oldName: string,
  habitData: HabitData,
  newLog: HabitLogs
) {
  habitData[newName] = newLog;
  if (newName != oldName) {
    delete habitData[oldName];
  }
  saveData(habitData);
  // TODO: edit request to /habits/id
  renderAllHabits(habitData); // Re-render the UI
}

function deleteHabit(habitName: string, habitData: HabitData) {
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
function updateHeatmap(habitName: string, logs: HabitLogs) {
  const cal = heatmapInstances[habitName];
  if (!cal) {
    console.error(`Heatmap instance not found for ${habitName}`);
    return;
  }
  const data = Object.entries(logs).map(([date, value]) => ({
    date,
    value,
  }));
  cal.fill(data);
}

// --- Heatmap Initialization ---
function initializeAndConfigureHeatmap(
  habitName: string,
  heatmapSelector: string,
  logs: HabitLogs,
  startDate: Date
): CalHeatmap {
  const cal = new CalHeatmap();
  heatmapInstances[habitName] = cal; // Store instance

  const data = Object.entries(logs).map(([date, value]) => ({
    date,
    value,
  }));

  cal.paint(
    {
      theme: "dark",
      itemSelector: heatmapSelector,
      range: 12,
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
  const days = getDateKeysFromLogs(logs);
  if (days.length > 0) {
    const earliest = days.sort()[0];
    return new Date(earliest);
  }
  return new Date();
}

export function setupHabit(habitName: string, allHabits: HabitData) {
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) {
    console.error(`Habit section for "${habitName}" not found`);
    return;
  }

  // TODO: hide heatmap by deafult
  // TODO: show heatmap when action is taken on this card
  // TODO: hide all other heatmaps when this heatmap is shown
  const logs = allHabits[habitName];
  const heatmapSelector = `#cal-${habitName
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  const cal = initializeAndConfigureHeatmap(
    habitName,
    heatmapSelector,
    logs,
    getHabitStartDate(logs)
  );

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

  // 4. Setup heatmap click interaction (updates selectedDay via callback)
  setupHeatmapClickHandler(cal, (date) => {
    selectedDay = date; // Update state when a day is clicked
    updateDayLabel(dayLabel, date);
  });

  updateStreakDisplay(habitName, allHabits[habitName]); // Add this line before setupHabitEventListeners
}

// --- Event Listener Setup ---
function setupHabitEventListeners(
  root: Element,
  habitName: string,
  allHabits: HabitData,
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

function setupEditPopover(habitName: string, allHabits: HabitData) {
  const renameInput = $(".rename-habit-input");
  renameInput.val(habitName);
  const sortInput = $(".sort-input");
  const weeklyGoalInput = $(".weekly-goal-input");
  const habit = allHabits[habitName];
  if (habit.sort) {
    sortInput.val(habit.sort);
  }
  if (habit.weekly_goal) {
    weeklyGoalInput.val(habit.weekly_goal);
  }
  $(".save-habit")
    .off("click")
    .on("click", function () {
      $('[data-bs-toggle="popover"]').popover("hide");
      const newLog = allHabits[habitName];
      const newGoal = weeklyGoalInput.val();
      if (newGoal) {
        newLog.weekly_goal = newGoal;
      }
      const newSort = sortInput.val();
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
