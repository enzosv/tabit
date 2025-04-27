import { HabitData } from "./habit.ts";

export async function sync(
  token: string | null,
  data: HabitData,
  last_update: number
) {
  if (!token) {
    return;
  }
  try {
    const body = {
      habit_data: data,
      client_timestamp: last_update,
    };
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}
