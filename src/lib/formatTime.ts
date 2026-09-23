/**
 * Locale-independent time formatter strictly bound to Manila (Asia/Manila, UTC+8) Time.
 */

import { fmtManilaTime, fmtManilaDate, fmtManilaTime12 } from './timezone';

/** Returns HH:MM in 24-hour format in Manila Time (UTC+8), e.g. "15:05" */
export function fmtTime(value: string | Date | null | undefined): string {
  return fmtManilaTime(value);
}

/** Returns hh:mm AM/PM format in Manila Time, e.g. "03:05 PM" */
export function fmtTime12(value: string | Date | null | undefined): string {
  return fmtManilaTime12(value);
}

/** Returns a short date string in YYYY-MM-DD format in Manila Time, e.g. "2026-09-24" */
export function fmtDate(value: string | Date | null | undefined): string {
  return fmtManilaDate(value);
}
