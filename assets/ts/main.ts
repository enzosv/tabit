import { HabitMap, logHabit, setupHabit } from "./habit.ts";
import { authToken, setupSession } from "./auth.ts";
import { sync } from "./sync.ts";
const HABIT_STORAGE_KEY = "habitData";

export let heatmapInstances: Record<string, CalHeatmap> = {};

function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

function filterHabits(searchText: string) {
  const searchWords = searchText.toLowerCase().trim().split(/\s+/);
  if (!searchText.trim()) {
    // Show all habits if search is empty
    document.querySelectorAll(".habit-section").forEach((el) => {
      (el as HTMLElement).style.display = "block";
      (el as HTMLElement).style.order = "0";
    });
    return;
  }

  document.querySelectorAll(".habit-section").forEach((section) => {
    const habitName =
      section.getAttribute("data-habit-name")?.toLowerCase() || "";

    // Check if ALL search words are found in the habit name
    const matches = searchWords.every((searchWord) =>
      habitName.includes(searchWord)
    );

    // Check if habit starts with first search word
    const isPrefixMatch = habitName.startsWith(searchWords[0]);

    if (matches) {
      (section as HTMLElement).style.display = "block";
      // Prefix matches appear first (order: 0), other matches after (order: 1)
      (section as HTMLElement).style.order = isPrefixMatch ? "0" : "1";
    } else {
      (section as HTMLElement).style.display = "none";
      (section as HTMLElement).style.order = "1";
    }
  });
}

const debouncedSync = debounce(
  (token: string, habits: HabitMap, timestamp: number) => {
    sync(token, habits, timestamp);
  },
  300
);

// --- Data Functions ---
export function saveData(data: HabitMap) {
  try {
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
    if (authToken) {
      debouncedSync(authToken, data, new Date().getTime());
    }
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
    // TODO: Add user feedback about storage quota exceeded or other errors
  }
}

export function loadData(): HabitMap {
  const storedData = localStorage.getItem(HABIT_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : ({} as HabitMap);
}

// --- Event Handlers ---
function addNewHabit(habitName: string, habitData: HabitMap) {
  if (habitName && !habitData[habitName]) {
    habitData[habitName] = { logs: {} };
    saveData(habitData);
    // TODO: post request to /habits
    renderAllHabits(habitData);
    return;
  }
  if (habitData[habitName]) {
    // add log
    logHabit(habitName, habitData);
    return;
  }
}

// --- Rendering Functions ---

export function renderAllHabits(habitMap: HabitMap) {
  // TODO: do not repaint if data is the same
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

  const sortedHabits = Object.entries(habitMap)
    .map(([name, data]) => ({
      name,
      sort: data?.sort ?? 0,
    }))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map(({ name }) => name);

  sortedHabits.forEach((habitName) => {
    const clone = template.content.cloneNode(true) as HTMLElement;
    const habitSection = clone.querySelector(".habit-section")!;
    const heatmapDiv = clone.querySelector(".heatmap")!;
    const title = clone.querySelector(".habit-title")!;

    const habitId = habitName.replace(/\s+/g, "-").toLowerCase();
    title.textContent = habitName;
    habitSection.setAttribute("data-habit-name", habitName);
    heatmapDiv.id = `cal-${habitId}`;

    habitsContainer.appendChild(clone);

    setupHabit(habitName, habitMap);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAllHabits(loadData());

  const addHabitButton = document.getElementById("add-habit");
  const newHabitNameInput = document.getElementById(
    "new-habit-name"
  ) as HTMLInputElement;

  if (!addHabitButton || !newHabitNameInput) {
    console.error("Required elements could not be found");
    return;
  }

  // Add debounced search handler
  const debouncedSearch = debounce((searchText: string) => {
    filterHabits(searchText);
  }, 180);

  newHabitNameInput.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    debouncedSearch(target.value);
  });

  // Existing event listeners
  addHabitButton.addEventListener("click", () => {
    addNewHabit(newHabitNameInput.value.trim(), loadData());
    newHabitNameInput.value = "";
    filterHabits("");
  });

  newHabitNameInput.addEventListener("keypress", (e) => {
    if (e.key != "Enter") {
      return;
    }
    addNewHabit(newHabitNameInput.value.trim(), loadData());
    newHabitNameInput.value = "";
    filterHabits("");
  });

  // TODO: ctrl-k placeholder for windows
  // no shortcut for mobile

  $(document).on("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      $("#new-habit-name").focus();
    }
  });

  setupSession();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").then((reg) => {
    console.log("Service worker registered", reg);
  });
}
