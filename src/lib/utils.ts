import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a time string (HH:mm or HH:mm:ss) into a human-readable 12-hour format (h:mm AM/PM).
 */
export function formatTime(time: string): string {
  if (!time || typeof time !== 'string') return '';

  const parts = time.split(':');
  if (parts.length < 2) return time;

  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];

  if (isNaN(hours)) return time;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  // Ensure we only show HH:mm even if the input had seconds
  return `${hour12}:${minutes.substring(0, 2)} ${ampm}`;
}
