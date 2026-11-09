import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Validates whether a string matches the strict YYYY-MM-DD format.
 */
export function isValidIsoDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Validate exact days in month including leap years
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a UTC Date object set to 00:00:00.000Z.
 * Prevents any local timezone offset shifts.
 */
export function parseIsoDate(dateStr: string): Date {
  if (!isValidIsoDateString(dateStr)) {
    throw new BadRequestException(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formats a Date object as YYYY-MM-DD using UTC date components.
 */
export function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's calendar date formatted as YYYY-MM-DD in UTC.
 */
export function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

/**
 * Calculates the exact integer number of nights between check-in and checkout
 * using pure UTC calendar arithmetic (1 day = 86,400,000 ms).
 */
export function calculateNights(checkInStr: string, checkOutStr: string): number {
  const checkIn = parseIsoDate(checkInStr);
  const checkOut = parseIsoDate(checkOutStr);

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(diffMs / 86_400_000);

  return nights;
}

/**
 * Validates booking date boundaries according to business rules:
 * - Check-in must be today or in the future (UTC calendar date)
 * - Checkout must be later than check-in
 * - Minimum duration: 1 night
 * - Maximum duration: 90 nights
 * - Maximum advance window: 365 days from today
 */
export function validateBookingDates(
  checkInStr: string,
  checkOutStr: string,
): {
  checkIn: Date;
  checkOut: Date;
  nights: number;
} {
  if (!isValidIsoDateString(checkInStr)) {
    throw new BadRequestException(`Check-in date "${checkInStr}" is invalid. Expected YYYY-MM-DD.`);
  }
  if (!isValidIsoDateString(checkOutStr)) {
    throw new BadRequestException(
      `Checkout date "${checkOutStr}" is invalid. Expected YYYY-MM-DD.`,
    );
  }

  const todayStr = getTodayIsoDate();
  if (checkInStr < todayStr) {
    throw new BadRequestException('Check-in date cannot be in the past.');
  }

  const nights = calculateNights(checkInStr, checkOutStr);
  if (nights <= 0) {
    throw new BadRequestException('Checkout date must be later than check-in date.');
  }

  if (nights > 90) {
    throw new BadRequestException('Maximum stay duration is 90 nights.');
  }

  // Check advance window (<= 365 days from today)
  const today = parseIsoDate(todayStr);
  const checkIn = parseIsoDate(checkInStr);
  const checkOut = parseIsoDate(checkOutStr);
  const advanceDays = Math.round((checkIn.getTime() - today.getTime()) / 86_400_000);

  if (advanceDays > 365) {
    throw new BadRequestException('Bookings can be made at most 365 days in advance.');
  }

  return { checkIn, checkOut, nights };
}

/**
 * Checks if two half-open date intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * In half-open intervals:
 * a booking checking out on date X does NOT conflict with a booking checking in on date X.
 */
export function datesOverlap(
  aStartStr: string,
  aEndStr: string,
  bStartStr: string,
  bEndStr: string,
): boolean {
  return aStartStr < bEndStr && aEndStr > bStartStr;
}

/**
 * Generates an unpredictable, cryptographically secure booking reference suitable for user display.
 * Format: STY-XXXXXXXX (e.g. STY-K8P2N9WQ)
 */
export function generateBookingReference(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous chars 0, 1, I, O
  let result = 'STY-';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}
