import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface FormatDurationOptions {
  /** Input unit: 'seconds' (default), 'milliseconds', or 'minutes' */
  unit?: 'seconds' | 'milliseconds' | 'minutes';
  /** Include seconds in output (e.g., "1h 23m 45s") */
  showSeconds?: boolean;
}

/**
 * Format duration to human-readable string (e.g., "1h 23m" or "45m 30s")
 * 
 * @param value - Duration value
 * @param options - Formatting options
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(3665) // "1h 1m"
 * formatDuration(3665, { showSeconds: true }) // "1h 1m 5s"
 * formatDuration(3665000, { unit: 'milliseconds' }) // "1h 1m"
 * formatDuration(90, { unit: 'minutes' }) // "1h 30m"
 */
export function formatDuration(value: number, options: FormatDurationOptions = {}): string {
  const { unit = 'seconds', showSeconds = false } = options;
  
  // Convert to seconds
  let seconds: number;
  switch (unit) {
    case 'milliseconds':
      seconds = Math.floor(value / 1000);
      break;
    case 'minutes':
      seconds = value * 60;
      break;
    default:
      seconds = value;
  }
  
  if (seconds <= 0) return showSeconds ? '0s' : '0m';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  // Short durations (< 1 min) - always show seconds
  if (seconds < 60) {
    return `${secs}s`;
  }
  
  // Medium durations (< 1 hour)
  if (hours === 0) {
    return showSeconds ? `${mins}m ${secs}s` : `${mins}m`;
  }
  
  // Long durations (1+ hours)
  return showSeconds ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`;
}

/**
 * Format runtime in minutes to human-readable string (e.g., "1h 23m" or "45m")
 */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
