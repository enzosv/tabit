document.addEventListener("DOMContentLoaded", () => {
  const habitsContainer = document.getElementById("habits-container");
  const addHabitButton = document.getElementById("add-habit");
  const newHabitNameInput = document.getElementById("new-habit-name");
  const today = new Date().toISOString().split("T")[0];
  let heatmapInstances = {}; // Store CalHeatmap instances

  // --- Data Functions ---
  const saveData = (data) => {
    try {
      localStorage.setItem("habitData", JSON.stringify(data));
      console.log("Habit data saved to localStorage:", data);
    } catch (error) {
      console.error("Error saving data to localStorage:", error);
      // Optional: Add user feedback about storage quota exceeded or other errors
    }
  };

  const loadData = (callback) => {
    try {
      const storedData = localStorage.getItem("habitData");
      let data = storedData ? JSON.parse(storedData) : {};
      // Ensure data structure is initialized
      if (!data.habits) {
        data.habits = {}; // { "habitName": ["date1", "date2"], ... }
      }
      callback(data);
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      // If parsing fails, start with empty data
      callback({ habits: {} });
    }
  };

  // --- Rendering Functions ---
  const renderHabit = (habitName, checkins = [], habitData) => {
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
    habitsContainer.innerHTML = ""; // Clear existing habits before rendering
    heatmapInstances = {}; // Clear old instances
    const habits = habitData.habits || {};
    Object.keys(habits)
      .sort() // Optional: Sort habits alphabetically
      .forEach((habitName) => {
        renderHabit(habitName, habits[habitName], habitData);
      });
  };

  // --- Event Handlers ---
  const logHabit = (habitName, habitData) => {
    console.log(`Logging habit: ${habitName}`);
    const checkins = habitData.habits[habitName] || [];
    if (!checkins.includes(today)) {
      checkins.push(today);
      checkins.sort(); // Keep dates sorted
      habitData.habits[habitName] = checkins;
      saveData(habitData);
      updateHeatmap(habitName, checkins);
    } else {
      console.log(`${habitName} already logged today.`);
      // Optional: Add visual feedback that it's already logged
    }
  };

  const undoLog = (habitName, habitData) => {
    console.log(`Undoing last log for: ${habitName}`);
    const checkins = habitData.habits[habitName] || [];
    if (checkins.length > 0) {
      checkins.pop(); // Removes the last element (most recent date assuming sorted)
      habitData.habits[habitName] = checkins;
      saveData(habitData);
      updateHeatmap(habitName, checkins);
    } else {
      console.log(`No logs to undo for ${habitName}.`);
      // Optional: Add visual feedback
    }
  };

  const deleteHabit = (habitName, habitData) => {
    console.log(`Deleting habit: ${habitName}`);
    // Optional: Add a confirmation dialog
    // if (!confirm(`Are you sure you want to delete the habit "${habitName}"? This cannot be undone.`)) {
    //   return;
    // }

    delete habitData.habits[habitName]; // Remove habit from data object
    delete heatmapInstances[habitName]; // Remove heatmap instance
    saveData(habitData);
    renderAllHabits(habitData); // Re-render the UI
  };

  const addNewHabit = (habitData) => {
    const name = newHabitNameInput.value.trim();
    if (name && !habitData.habits[name]) {
      habitData.habits[name] = []; // Initialize with empty checkins
      saveData(habitData);
      renderHabit(name, [], habitData); // Render the new habit immediately
      newHabitNameInput.value = ""; // Clear input
    } else if (habitData.habits[name]) {
      alert("Habit already exists!"); // Or provide other feedback
      newHabitNameInput.value = ""; // Clear input
    } else {
      alert("Please enter a habit name."); // Or provide other feedback
    }
  };

  // --- Heatmap Update ---
  const updateHeatmap = (habitName, checkins) => {
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
  };

  // --- Initialization ---
  addHabitButton.addEventListener("click", () => {
    loadData(addNewHabit); // Load data before adding to ensure consistency
  });

  newHabitNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loadData(addNewHabit); // Allow adding with Enter key
    }
  });

  // Load initial data and render
  loadData(renderAllHabits);
});
