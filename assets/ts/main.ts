import { HabitData, setupHabit } from "./habit.ts";
import { authToken, setupSession } from "./auth.ts";
import { sync } from "./sync.ts";
const HABIT_STORAGE_KEY = "habitData";

export let heatmapInstances = {}; // Store CalHeatmap instances

// --- Data Functions ---
export function saveData(data: HabitData) {
  try {
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
    sync(authToken, data, new Date().getTime());
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
    // TODO: Add user feedback about storage quota exceeded or other errors
  }
}

export function loadData(): HabitData {
  const storedData = localStorage.getItem(HABIT_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : ({} as HabitData);
}

// --- Event Handlers ---
function addNewHabit(habitName: string, habitData: HabitData) {
  if (habitName && !habitData[habitName]) {
    habitData[habitName] = {};
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

// --- Rendering Functions ---

export function renderAllHabits(habitData: HabitData) {
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

    setupHabit(habitName, habitData);
  });
}
document.addEventListener("DOMContentLoaded", () => {
  renderAllHabits(loadData());
  setupSession();

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
    newHabitNameInput.value = "";
  });
});
