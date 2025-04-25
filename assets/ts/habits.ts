const HABIT_STORAGE_KEY = "habitData";

let heatmapInstances = {}; // Store CalHeatmap instances

// --- Data Functions ---
function saveData(data: any) {
  try {
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
    // TODO: Add user feedback about storage quota exceeded or other errors
  }
}

function loadData(): Record<string, string[]> {
  const storedData = localStorage.getItem(HABIT_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : ({} as Record<string, string[]>);
}

// --- Event Handlers ---
function logHabit(habitName: string, habitData, day?: string) {
  if (!day) {
    day = new Date().toISOString().split("T")[0];
  }
  console.log("logging", day);
  const checkins = habitData[habitName] || [];
  checkins.push(day);
  habitData[habitName] = checkins;
  saveData(habitData);
  // renderAllHabits(habitData);
  updateHeatmap(habitName, checkins);
}

function undoLog(habitName: string, habitData) {
  console.log(`Undoing last log for: ${habitName}`);
  const checkins = habitData[habitName] || [];
  if (checkins.length < 1) {
    return;
  }
  checkins.pop();
  habitData[habitName] = checkins;
  saveData(habitData);
  updateHeatmap(habitName, checkins);
}

function clearLog(habitName: string, habitData, day?: string) {
  if (!day) {
    day = new Date().toISOString().split("T")[0];
  }
  console.log("clearing", day);
  let checkins = habitData[habitName] || [];
  if (checkins.length < 1) {
    return;
  }
  checkins = checkins.filter((date) => date != day);
  habitData[habitName] = checkins;
  saveData(habitData);
  updateHeatmap(habitName, checkins);
}

function deleteHabit(habitName: string, habitData) {
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

function addNewHabit(habitName: string, habitData) {
  if (habitName && !habitData[habitName]) {
    habitData[habitName] = []; // Initialize with empty checkins
    saveData(habitData);
    renderAllHabits(habitData);
    return;
  }
  if (habitData[habitName]) {
    alert("Habit already exists!"); // Or provide other feedback
    // TODO: add log
    return;
  }
}

// --- Heatmap Update ---
function updateHeatmap(habitName: string, checkins: string[]) {
  const cal = heatmapInstances[habitName];
  if (!cal) {
    console.error(`Heatmap instance not found for ${habitName}`);
    return;
  }
  const counted = Object.entries(
    checkins.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {})
  ).map(([date, value]) => ({ date, value }));
  cal.fill(counted);
}

// --- Rendering Functions ---

function renderAllHabits(habitData: Record<string, string[]>) {
  const habitsContainer = document.getElementById("habits-container");
  const template = document.getElementById(
    "habit-template"
  ) as HTMLTemplateElement;

  if (!habitsContainer || !template) {
    console.error("Missing habits container or template");
    return;
  }

  habitsContainer.innerHTML = "";
  heatmapInstances = {};

  Object.keys(habitData).forEach((habitName) => {
    const clone = template.content.cloneNode(true) as HTMLElement;
    const habitSection = clone.querySelector(".habit-section")!;
    const heatmapDiv = clone.querySelector(".heatmap")!;
    const title = clone.querySelector(".habit-title")!;

    const habitId = habitName.replace(/\s+/g, "-").toLowerCase();
    title.textContent = habitName;
    habitSection.setAttribute("data-habit-name", habitName);
    heatmapDiv.id = `cal-${habitId}`;

    habitsContainer.appendChild(clone);

    enhanceHabit(habitName, habitData);
  });
}

function enhanceHabit(habitName: string, allHabits: Record<string, string[]>) {
  const root = document.querySelector(`[data-habit-name="${habitName}"]`);
  if (!root) {
    console.error(habitName, "component not found");
    return;
  }

  let day: string | undefined;
  const logButton = root.querySelector(".log-habit");
  const clearButton = root.querySelector(".clear-log");
  logButton?.addEventListener("click", () =>
    logHabit(habitName, allHabits, day)
  );
  clearButton?.addEventListener("click", () =>
    clearLog(habitName, allHabits, day)
  );
  root
    .querySelector(".undo-log")
    ?.addEventListener("click", () => undoLog(habitName, allHabits));
  root
    .querySelector(".delete-habit")
    ?.addEventListener("click", () => deleteHabit(habitName, allHabits));

  let earliest = new Date().toISOString().split("T")[0];
  const counts: Record<string, number> = {};
  for (const date of allHabits[habitName]) {
    counts[date] = (counts[date] || 0) + 1;

    if (date < earliest) {
      earliest = date;
    }
  }

  const counted = Object.entries(counts).map(([date, value]) => ({
    date,
    value,
  }));

  // const habitInfo = allHabits[habitName];
  const cal = new CalHeatmap();
  heatmapInstances[habitName] = cal;
  cal.paint({
    itemSelector: `#cal-${habitName.replace(/\s+/g, "-").toLowerCase()}`,
    range: 10,
    domain: { type: "month" },
    subDomain: { type: "day", radius: 2 },
    data: {
      source: counted,
      x: "date",
      y: "value",
    },
    date: { start: new Date(earliest) },
    scale: {
      color: {
        type: "threshold",
        range: ["#ededed", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
        domain: [1, 2, 3, 4, 5],
      },
    },
  });

  cal.on("click", (event, timestamp, value) => {
    const now = new Date();
    if (timestamp > now) {
      // can't select future days
      timestamp = now;
    }
    day = new Date(timestamp).toISOString().split("T")[0];
    if (logButton) {
      logButton.innerHTML = `Log ${day}`;
    }
    if (clearButton) {
      clearButton.innerHTML = `Clear ${day}`;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addHabitButton = document.getElementById("add-habit");
  if (!addHabitButton) {
    console.error("add button could not be found");
    return;
  }
  const newHabitNameInput = document.getElementById(
    "new-habit-name"
  ) as HTMLInputElement;
  if (!newHabitNameInput) {
    console.error("input could not be found");
    return;
  }

  // --- Initialization ---
  addHabitButton.addEventListener("click", () => {
    addNewHabit(newHabitNameInput.value.trim(), loadData());
    newHabitNameInput.value = "";
  });

  newHabitNameInput.addEventListener("keypress", (e) => {
    if (e.key != "Enter") {
      return;
    }
    // Add with Enter key
    addNewHabit(newHabitNameInput.value.trim(), loadData());
  });

  // Load initial data and render
  renderAllHabits(loadData());
});
