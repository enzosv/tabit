// import { CalHeatmap } from "..//vendor/cal-heatmap.min.js";
import { saveData, renderAllHabits, heatmapInstances } from "./main.ts";

interface HabitLogs {
  [date: string]: number;
}

export interface HabitData {
  [habitName: string]: HabitLogs;
}

// --- Event Handlers ---
function logHabit(habitName: string, habitData: HabitData, day?: string) {
  if (!day) {
    day = new Date().toISOString().split("T")[0];
  }
  if (!habitData[habitName][day]) {
    habitData[habitName][day] = 0;
  }
  habitData[habitName][day]++;
  saveData(habitData);
  updateHeatmap(habitName, habitData[habitName]);
}

function clearLog(habitName: string, habitData: HabitData, day?: string) {
  if (!day) {
    day = new Date().toISOString().split("T")[0];
  }
  habitData[habitName][day] = 0;
  saveData(habitData);
  updateHeatmap(habitName, habitData[habitName]);
}

function deleteHabit(habitName: string, habitData: HabitData) {
  console.log(`Deleting habit: ${habitName}`);
  // Optional: Add a confirmation dialog
  // if (!confirm(`Are you sure you want to delete the habit "${habitName}"? This cannot be undone.`)) {
  //   return;
  // }

  delete habitData[habitName]; // Remove habit from data object
  delete heatmapInstances[habitName]; // Remove heatmap instance
  saveData(habitData);
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
      itemSelector: heatmapSelector,
      range: 10,
      domain: { type: "month" },
      subDomain: { type: "day", radius: 2 },
      data: { source: data, x: "date", y: "value" },
      date: { start: startDate },
      scale: {
        color: {
          type: "threshold",
          range: ["#ededed", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
          domain: [1, 2, 3, 4, 5], // Example scale
        },
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
            const dateString = new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
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

// --- Event Listener Setup ---
function setupHabitEventListeners(
  root: Element,
  habitName: string,
  allHabits: HabitData,
  getSelectedDay: () => string | undefined // Function to get the selected day
) {
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
  root
    .querySelector(".delete-habit")
    ?.addEventListener("click", () => deleteHabit(habitName, allHabits));
}

// --- Heatmap Interaction ---
function setupHeatmapClickHandler(
  cal: CalHeatmap,
  logButton: HTMLButtonElement | null,
  clearButton: HTMLButtonElement | null,
  onDaySelect: (day: string) => void // Callback when a day is selected
) {
  cal.on("click", (event, timestamp, value) => {
    const now = new Date();
    if (timestamp > now) {
      return;
    }
    // Ensure selected date is not in the future
    const clickedDate = new Date(timestamp);
    const day = clickedDate.toISOString().split("T")[0];

    onDaySelect(day); // Inform the caller (enhanceHabit)

    // Update UI feedback (button text)
    if (logButton) {
      logButton.textContent = `Log ${day}`;
    }
    if (clearButton) {
      clearButton.textContent = `Clear ${day}`;
    }
  });
}

export function setupHabit(habitName: string, allHabits: HabitData) {
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) {
    console.error(`Habit section for "${habitName}" not found`);
    return;
  }

  let selectedDay: string | undefined; // State variable for the selected day

  // 2. Initialize heatmap
  const heatmapSelector = `#cal-${habitName
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
  const cal = initializeAndConfigureHeatmap(
    habitName,
    heatmapSelector,
    allHabits[habitName],
    new Date()
  );

  // 3. Setup button listeners (pass getter for selectedDay)
  setupHabitEventListeners(root, habitName, allHabits, () => selectedDay);

  // 4. Setup heatmap click interaction (updates selectedDay via callback)
  const logButton = root.querySelector<HTMLButtonElement>(".log-habit");
  const clearButton = root.querySelector<HTMLButtonElement>(".clear-log");
  setupHeatmapClickHandler(cal, logButton, clearButton, (day) => {
    selectedDay = day; // Update state when a day is clicked
  });
}
