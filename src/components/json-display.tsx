"use client";

export function JsonDisplay({ value }: { value: string }) {
  let formatted = value;
  try {
    formatted = JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    // keep raw string if not valid JSON
  }
  return <>{formatted}</>;
}
