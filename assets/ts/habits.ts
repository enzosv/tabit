const HABIT_STORAGE_KEY = "habitData";
interface HabitLog {
  date: Date;
  count: Number;
}

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

function loadData(): Promise<HabitLog[]> {
    const storedData = localStorage.getItem(HABIT_STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : {};
};

// --- Event Handlers ---
function logHabit (habitName: string, habitData) {
  const today = new Date().toISOString().split("T")[0];

  console.log(`Logging habit: ${habitName}`);
  const checkins = habitData[habitName] || [];
  if(checkins.includes(today)){
    console.log(`${habitName} already logged today.`);
    // TODO: add count
    return;
  }
    checkins.push(today);
    habitData[habitName] = checkins;
    saveData(habitData);
    updateHeatmap(habitName, checkins);
}

function undoLog(habitName: string, habitData) {
  console.log(`Undoing last log for: ${habitName}`);
  const checkins = habitData[habitName] || [];
  if(checkins.length < 1){
    return;
  }
    checkins.pop();
    habitData[habitName] = checkins;
    saveData(habitData);
    updateHeatmap(habitName, checkins);
};

function deleteHabit(habitName:string , habitData){
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

function addNewHabit (habitName:string, habitData) {
  // const name = newHabitNameInput.value.trim();
  if (habitName && !habitData[habitName]) {
    habitData[habitName] = []; // Initialize with empty checkins
    saveData(habitData);
    renderHabit(habitName, [], habitData); // Render the new habit immediately
    // newHabitNameInput.value = ""; // Clear input
  } else if (habitData[habitName]) {
    alert("Habit already exists!"); // Or provide other feedback
    // newHabitNameInput.value = ""; // Clear input
    // TODO: add log
  }
}

  // --- Heatmap Update ---
  function updateHeatmap (habitName:string, checkins) {
    const cal = heatmapInstances[habitName];
    if (!cal) {
      console.error(`Heatmap instance not found for ${habitName}`);
      return;
    }
    const heatmapData = checkins.map((acc, date) => {
      return {date: acc, value: 1};
    });
    cal.fill(heatmapData);
    console.log(`Heatmap updated for ${habitName}`);
  }

  // --- Rendering Functions ---
  const renderHabit = (habitName, checkins = [], habitData) => {
    const habitsContainer = document.getElementById("habits-container");
    const habitId = habitName.replace(/\s+/g, "-").toLowerCase(); // Create a unique ID
    const habitElement = document.createElement("div");
    habitElement.classList.add(
      "habit-section",
      "mb-5",
      "border",
      "p-3",
      "rounded"
    );
    habitElement.setAttribute("data-habit-name", habitName); // Store habit name for event handlers

    habitElement.innerHTML = `
      <h3>${habitName}</h3>
      <div id="cal-${habitId}" class="mb-3"></div>
      <button class="btn btn-success btn-sm log-habit me-2">✅ Log Today</button>
      <button class="btn btn-warning btn-sm undo-log">↩️ Undo Last Log</button>
      <button class="btn btn-danger btn-sm delete-habit float-end">🗑️ Delete</button>
    `;

    habitsContainer.appendChild(habitElement);

    // Initialize CalHeatmap for this habit
    const cal = new CalHeatmap();
    heatmapInstances[habitName] = cal; // Store instance
    const data = checkins.map((acc, date) => {
      return {date: acc, value: 1};
    })

    cal.paint({
      itemSelector: `#cal-${habitId}`,
      range: 12,
      domain: { type: "month" },
      subDomain: { type: "day", radius: 2 },
      data: {
        source: data,
        x: "date", // Assuming 'date' is the timestamp key
        y: "value", // Assuming 'value' is the count key
        // type: "json", // Not needed when providing data directly
      },
      date: { start: new Date(new Date().getFullYear(), 0, 1) }, // Start view at the beginning of the year
      scale: {
        // Define a basic color scale
        color: {
          type: "threshold",
          range: ["#ededed", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
          domain: [1, 2, 3, 4, 5], // Example domain, adjust as needed
        },
      },
      legend: {
        // Optional: add a legend
        show: true,
        itemSelector: `#cal-${habitId}-legend`, // ID for a legend element if needed
        label: "Check-ins",
      },
    });

    // Add event listeners using event delegation on the container might be more efficient
    // but for simplicity, adding directly here. Ensure cleanup if elements are removed/re-rendered often.

    habitElement
      .querySelector(".log-habit")
      .addEventListener("click", () => logHabit(habitName, habitData));
    habitElement
      .querySelector(".undo-log")
      .addEventListener("click", () => undoLog(habitName, habitData));
    habitElement
      .querySelector(".delete-habit")
      .addEventListener("click", () => deleteHabit(habitName, habitData));
  };
  

  const renderAllHabits = (habitData) => {
    const habitsContainer = document.getElementById("habits-container");
    habitsContainer.innerHTML = ""; // Clear existing habits before rendering
    heatmapInstances = {}; // Clear old instances
    const habits = habitData || {};
    Object.keys(habits)
      // .sort() // Optional: Sort habits alphabetically
      .forEach((habitName) => {
        renderHabit(habitName, habits[habitName], habitData);
      });
  };

document.addEventListener("DOMContentLoaded", () => {
  
  const addHabitButton = document.getElementById("add-habit");
  const newHabitNameInput = document.getElementById("new-habit-name");

  

  

  // --- Initialization ---
  addHabitButton.addEventListener("click",  () => {
    // Load data before adding to ensure consistency
    addNewHabit(newHabitNameInput.value.trim(), loadData()); 
  });

  newHabitNameInput.addEventListener("keypress",  (e) => {
    if (e.key != "Enter") {
      return;
    }
     // Add with Enter key
    addNewHabit(newHabitNameInput.value.trim(), loadData()); 
  });

  // Load initial data and render
  renderAllHabits(loadData());
});
