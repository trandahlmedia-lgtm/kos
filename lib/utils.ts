import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format raw digit string as a US phone number for display.
 * "6125551234" → "(612) 555-1234"
 * Handles partial input gracefully as the user types.
 */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10)
  if (d.length === 0) return ''
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/**
 * Strip a phone string down to raw digits only.
 * "(612) 555-1234" → "6125551234"
 */
export function parsePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}
