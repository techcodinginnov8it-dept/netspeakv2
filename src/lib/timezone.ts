/**
 * Manila, Philippines (UTC+8) Time & Date Utilities
 * Time Zone: Asia/Manila (PHT)
 */

export const MANILA_TIMEZONE = 'Asia/Manila';

/**
 * Returns the current date/time converted to Manila (UTC+8) components.
 */
export function getManilaNow(): Date {
  const now = new Date();
  // Get time string in Manila timezone
  const manilaStr = now.toLocaleString('en-US', { timeZone: MANILA_TIMEZONE });
  return new Date(manilaStr);
}

/**
 * Returns a midnight normalized date for calendar grouping in Manila time.
 */
export function getManilaToday(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  // UTC midnight corresponding to the Manila calendar day
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formats a Date or ISO timestamp into 24-hour HH:MM format strictly in Manila (Asia/Manila) time.
 * E.g. "15:05" or "08:30"
 */
export function fmtManilaTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Formats a Date or ISO timestamp into 12-hour hh:mm AM/PM format strictly in Manila time.
 * E.g. "03:00 PM"
 */
export function fmtManilaTime12(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats a Date into YYYY-MM-DD format strictly in Manila time.
 * E.g. "2026-09-24"
 */
export function fmtManilaDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
}

/**
 * Calculates shift timestamps for a given date in Manila time.
 */
export function getManilaShiftBoundaries(
  baseDate: Date,
  startTimeStr: string,
  endTimeStr: string
) {
  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);

  // Extract current calendar year, month, day in Manila time
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(baseDate);

  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  // Manila is UTC+8. UTC time = Manila time - 8 hours
  const scheduledStart = new Date(Date.UTC(year, month, day, startH - 8, startM, 0, 0));
  let scheduledEnd = new Date(Date.UTC(year, month, day, endH - 8, endM, 0, 0));

  // If shift ends at midnight (e.g. 24:00 or 00:00) or wraps to the next day
  if (scheduledEnd <= scheduledStart) {
    scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  // T-30: 30 minutes before shift start
  const tMinus30 = new Date(scheduledStart.getTime() - 30 * 60 * 1000);

  // T-15 before shift end: allowable logout window
  const tMinus15End = new Date(scheduledEnd.getTime() - 15 * 60 * 1000);

  return {
    scheduledStart,
    scheduledEnd,
    tMinus30,
    tMinus15End,
  };
}
