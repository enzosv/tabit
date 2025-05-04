export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getDateKey(date?: Date): string {
  if (!date) {
    date = new Date();
  }
  return date.toISOString().split("T")[0];
}
