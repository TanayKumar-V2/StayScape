'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { UnavailableRange } from '@/types/booking';
import {
  formatUtcDateString,
  getTodayUtcString,
  parseUtcDate,
  isNightUnavailable,
} from '@/lib/date-helpers';
import { cn } from '@/lib/utils';

interface AvailabilityCalendarProps {
  unavailableRanges: UnavailableRange[];
  checkIn: string;
  checkOut: string;
  onSelectRange: (checkIn: string, checkOut: string) => void;
  minNights?: number;
  maxNights?: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function AvailabilityCalendar({
  unavailableRanges,
  checkIn,
  checkOut,
  onSelectRange,
  minNights = 1,
  maxNights = 90,
}: AvailabilityCalendarProps) {
  const todayStr = useMemo(() => getTodayUtcString(), []);

  // Determine current viewing month (UTC)
  const initialDate = useMemo(() => {
    if (checkIn) return parseUtcDate(checkIn);
    return parseUtcDate(todayStr);
  }, [checkIn, todayStr]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getUTCMonth());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Prevent navigating prior to current month
  const today = parseUtcDate(todayStr);
  const isPastMonth =
    currentYear < today.getUTCFullYear() ||
    (currentYear === today.getUTCFullYear() && currentMonth <= today.getUTCMonth());

  // Build grid of days for current month
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const startingDayOfWeek = firstDayOfMonth.getUTCDay();
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ dateStr: '', dayNumber: 0, isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(Date.UTC(currentYear, currentMonth, d));
      const dateStr = formatUtcDateString(dateObj);
      days.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Click handler for date selection
  const handleDateClick = (dateStr: string) => {
    if (!dateStr || dateStr < todayStr) return;

    // Check if clicking when starting fresh or when both dates were already selected
    if (!checkIn || (checkIn && checkOut)) {
      // Must be an available night to check in
      if (isNightUnavailable(dateStr, unavailableRanges)) {
        return;
      }
      onSelectRange(dateStr, '');
      return;
    }

    // We have a checkIn, setting checkOut
    if (dateStr <= checkIn) {
      // Clicked earlier or same date -> restart selection with this new checkIn
      if (isNightUnavailable(dateStr, unavailableRanges)) return;
      onSelectRange(dateStr, '');
      return;
    }

    // Check if range contains any unavailable nights
    // In half-open interval [checkIn, dateStr), no night can be unavailable
    const startObj = parseUtcDate(checkIn);
    const endObj = parseUtcDate(dateStr);
    let hasBlockedNight = false;

    const cur = new Date(startObj.getTime());
    while (cur.getTime() < endObj.getTime()) {
      const curStr = formatUtcDateString(cur);
      if (isNightUnavailable(curStr, unavailableRanges)) {
        hasBlockedNight = true;
        break;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    if (hasBlockedNight) {
      // Cannot cross an unavailable block -> set this date as new checkIn if available
      if (!isNightUnavailable(dateStr, unavailableRanges)) {
        onSelectRange(dateStr, '');
      }
      return;
    }

    const diffNights = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffNights < minNights || diffNights > maxNights) {
      return;
    }

    // Valid checkOut selection
    onSelectRange(checkIn, dateStr);
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 select-none shadow-sm">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]/80">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--text-primary)]">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)] font-light">
            Select check-in & checkout dates
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPastMonth}
            aria-label="Previous month"
            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-[var(--text-primary)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors text-[var(--text-primary)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {WEEKDAY_NAMES.map((w, idx) => (
          <span
            key={w}
            className={cn(
              'text-[11px] font-semibold py-1',
              idx === 0 || idx === 6
                ? 'text-[var(--accent-secondary)]'
                : 'text-[var(--text-secondary)]',
            )}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, idx) => {
          if (!day.isCurrentMonth) {
            return <div key={`empty-${idx}`} className="h-9 w-full" />;
          }

          const { dateStr, dayNumber } = day;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isUnavailableNight = isNightUnavailable(dateStr, unavailableRanges);

          const isSelectedStart = checkIn === dateStr;
          const isSelectedEnd = checkOut === dateStr;

          // When checkIn is selected but checkOut is not yet picked:
          // A day is a candidate checkout if dateStr > checkIn
          const isCheckoutCandidate = !!checkIn && !checkOut && dateStr > checkIn;
          const isHoveredRange =
            isCheckoutCandidate && hoveredDate && dateStr > checkIn && dateStr <= hoveredDate;

          const isInSelectedRange =
            !!checkIn && !!checkOut && dateStr > checkIn && dateStr < checkOut;

          // A day can be clicked as checkout even if its night is unavailable, as long as it's the checkout morning
          const isDisabledForClick = Boolean(
            isPast ||
              (!checkIn && isUnavailableNight) ||
              (checkIn && checkOut && isUnavailableNight),
          );

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabledForClick}
              onClick={() => handleDateClick(dateStr)}
              onMouseEnter={() => {
                if (checkIn && !checkOut && dateStr > checkIn) {
                  setHoveredDate(dateStr);
                }
              }}
              onMouseLeave={() => setHoveredDate(null)}
              className={cn(
                'relative h-9 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                // Past & blocked dates
                isPast && 'text-[var(--text-disabled-soft)] cursor-not-allowed line-through',
                !isPast &&
                  isUnavailableNight &&
                  !isSelectedStart &&
                  !isSelectedEnd &&
                  !isInSelectedRange &&
                  'bg-[var(--bg-secondary)]/60 text-[var(--text-disabled)] line-through cursor-not-allowed',

                // Available normal dates
                !isPast &&
                  !isUnavailableNight &&
                  !isSelectedStart &&
                  !isSelectedEnd &&
                  !isInSelectedRange &&
                  !isHoveredRange &&
                  'hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] text-[var(--text-primary)]',

                // Start date
                isSelectedStart &&
                  'bg-[var(--accent-primary)] text-white font-bold rounded-l-lg shadow-sm z-10',
                isSelectedStart && checkOut && 'rounded-r-none',

                // End date
                isSelectedEnd &&
                  'bg-[var(--accent-primary)] text-white font-bold rounded-r-lg shadow-sm z-10',
                isSelectedEnd && checkIn && 'rounded-l-none',

                // Inside selected range
                isInSelectedRange &&
                  'bg-[var(--accent-primary)]/15 text-[var(--text-primary)] rounded-none',

                // Hover preview range
                isHoveredRange &&
                  'bg-[var(--accent-primary)]/10 text-[var(--text-primary)] rounded-none',

                // Today ring
                isToday &&
                  !isSelectedStart &&
                  !isSelectedEnd &&
                  'ring-1 ring-[var(--accent-primary)]/40',
              )}
            >
              <span>{dayNumber}</span>
              {isToday && !isSelectedStart && !isSelectedEnd && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Help Footnote */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)]" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--border)] line-through text-[8px] flex items-center justify-center font-mono">
              /
            </span>
            <span>Unavailable</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[var(--accent-primary)] font-medium">
          <Info className="w-3 h-3" />
          <span>Checkout is allowed on check-in days</span>
        </div>
      </div>
    </div>
  );
}
