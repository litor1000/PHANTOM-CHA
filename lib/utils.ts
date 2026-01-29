import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures a value is a Date object, converting from string if needed.
 * Useful when loading dates from localStorage which serializes them as strings.
 */
export function ensureDate(date: Date | string | undefined): Date | undefined {
  if (!date) return undefined
  if (date instanceof Date) return date
  const parsed = new Date(date)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * Safely gets the time from a date that might be a string (from localStorage)
 */
export function getDateTimeSafe(date: Date | string | undefined): number | undefined {
  const dateObj = ensureDate(date)
  return dateObj?.getTime()
}
