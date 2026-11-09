import type { UnavailableRange } from '@/types/booking';

/**
 * Returns today's calendar date string in YYYY-MM-DD UTC format.
 */
export function getTodayUtcString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object into YYYY-MM-DD UTC format.
 */
export function formatUtcDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a UTC Date object.
 */
export function parseUtcDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats YYYY-MM-DD string into a friendly localized display string (e.g., "15 Oct 2026").
 */
export function formatDateDisplay(
  dateStr: string,
  options?: { month?: 'short' | 'long'; includeYear?: boolean; weekday?: 'short' | 'long' },
): string {
  if (!dateStr) return '';
  const date = parseUtcDate(dateStr);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: options?.weekday,
    day: 'numeric',
    month: options?.month ?? 'short',
    year: options?.includeYear !== false ? 'numeric' : undefined,
  });
}

/**
 * Calculates total nights between checkIn and checkOut (half-open [checkIn, checkOut)).
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = parseUtcDate(checkIn).getTime();
  const end = parseUtcDate(checkOut).getTime();
  const diff = end - start;
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

/**
 * Checks whether a night (calendar date) falls inside an unavailable range [startDate, endDate).
 */
export function isNightUnavailable(
  nightDateStr: string,
  unavailableRanges: UnavailableRange[],
): boolean {
  return unavailableRanges.some(
    (range) => nightDateStr >= range.startDate && nightDateStr < range.endDate,
  );
}

/**
 * Checks whether any night in a proposed range [checkIn, checkOut) is unavailable.
 */
export function isRangeUnavailable(
  checkIn: string,
  checkOut: string,
  unavailableRanges: UnavailableRange[],
): boolean {
  if (!checkIn || !checkOut || checkIn >= checkOut) return false;
  return unavailableRanges.some((range) => checkIn < range.endDate && checkOut > range.startDate);
}
