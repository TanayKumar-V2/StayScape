import {
  calculateNights,
  datesOverlap,
  formatIsoDate,
  generateBookingReference,
  getTodayIsoDate,
  isValidIsoDateString,
  parseIsoDate,
  validateBookingDates,
} from './date.utils';
import { BadRequestException } from '@nestjs/common';

describe('date.utils', () => {
  describe('isValidIsoDateString', () => {
    it('should accept valid YYYY-MM-DD dates', () => {
      expect(isValidIsoDateString('2026-12-01')).toBe(true);
      expect(isValidIsoDateString('2026-02-28')).toBe(true);
      expect(isValidIsoDateString('2024-02-29')).toBe(true); // Leap year
    });

    it('should reject invalid date strings', () => {
      expect(isValidIsoDateString('2026-13-01')).toBe(false); // Invalid month
      expect(isValidIsoDateString('2026-02-29')).toBe(false); // 2026 is not a leap year
      expect(isValidIsoDateString('12-01-2026')).toBe(false);
      expect(isValidIsoDateString('2026/12/01')).toBe(false);
      expect(isValidIsoDateString('invalid')).toBe(false);
    });
  });

  describe('parseIsoDate & formatIsoDate', () => {
    it('should parse and format dates symmetrically in UTC without timezone shifts', () => {
      const dateStr = '2026-12-25';
      const parsed = parseIsoDate(dateStr);
      expect(parsed.getUTCFullYear()).toBe(2026);
      expect(parsed.getUTCMonth()).toBe(11); // 0-indexed December
      expect(parsed.getUTCDate()).toBe(25);
      expect(parsed.getUTCHours()).toBe(0);

      expect(formatIsoDate(parsed)).toBe(dateStr);
    });
  });

  describe('calculateNights', () => {
    it('should calculate exact integer nights', () => {
      expect(calculateNights('2026-12-10', '2026-12-15')).toBe(5);
      expect(calculateNights('2026-12-10', '2026-12-11')).toBe(1);
      expect(calculateNights('2026-12-31', '2027-01-05')).toBe(5);
    });
  });

  describe('validateBookingDates', () => {
    it('should pass for valid future dates within 90 nights', () => {
      const today = getTodayIsoDate();
      const checkInObj = parseIsoDate(today);
      checkInObj.setUTCDate(checkInObj.getUTCDate() + 10);
      const checkInStr = formatIsoDate(checkInObj);

      const checkOutObj = new Date(checkInObj);
      checkOutObj.setUTCDate(checkOutObj.getUTCDate() + 4);
      const checkOutStr = formatIsoDate(checkOutObj);

      const result = validateBookingDates(checkInStr, checkOutStr);
      expect(result.nights).toBe(4);
      expect(formatIsoDate(result.checkIn)).toBe(checkInStr);
      expect(formatIsoDate(result.checkOut)).toBe(checkOutStr);
    });

    it('should reject check-in in the past', () => {
      expect(() => validateBookingDates('2020-01-01', '2020-01-05')).toThrow(BadRequestException);
    });

    it('should reject checkout on or before check-in', () => {
      const today = getTodayIsoDate();
      expect(() => validateBookingDates(today, today)).toThrow(BadRequestException);
    });

    it('should reject duration exceeding 90 nights', () => {
      const today = getTodayIsoDate();
      const start = parseIsoDate(today);
      const end = new Date(start.getTime() + 95 * 86_400_000);
      expect(() => validateBookingDates(today, formatIsoDate(end))).toThrow(BadRequestException);
    });
  });

  describe('datesOverlap', () => {
    it('should correctly handle half-open intervals [checkIn, checkOut)', () => {
      // Overlapping
      expect(datesOverlap('2026-12-10', '2026-12-15', '2026-12-12', '2026-12-17')).toBe(true);
      expect(datesOverlap('2026-12-10', '2026-12-15', '2026-12-10', '2026-12-15')).toBe(true);

      // Adjacent (Checkout on Dec 15 and Check-in on Dec 15 do NOT overlap)
      expect(datesOverlap('2026-12-10', '2026-12-15', '2026-12-15', '2026-12-20')).toBe(false);
      expect(datesOverlap('2026-12-15', '2026-12-20', '2026-12-10', '2026-12-15')).toBe(false);

      // Completely separate
      expect(datesOverlap('2026-12-01', '2026-12-05', '2026-12-10', '2026-12-15')).toBe(false);
    });
  });

  describe('generateBookingReference', () => {
    it('should produce an 8-char unpredictable uppercase string prefixed with STY-', () => {
      const ref1 = generateBookingReference();
      const ref2 = generateBookingReference();

      expect(ref1).toMatch(/^STY-[2-9A-HJ-NP-Z]{8}$/);
      expect(ref2).toMatch(/^STY-[2-9A-HJ-NP-Z]{8}$/);
      expect(ref1).not.toBe(ref2);
    });
  });
});
