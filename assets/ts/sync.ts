import { HabitMap } from "./habit.ts";

export async function sync(
  token: string | null,
  data: HabitMap,
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
    const payload = JSON.stringify(body);
    console.log(payload);
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: payload,
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
