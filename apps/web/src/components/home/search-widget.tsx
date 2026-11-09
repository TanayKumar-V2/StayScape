'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Users, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchWidgetProps {
  className?: string;
  initialDestination?: string;
}

export function SearchWidget({ className, initialDestination = '' }: SearchWidgetProps) {
  const router = useRouter();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set('destination', destination.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', guests.toString());

    router.push(`/stays${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const quickDestinations = ['Manali', 'Goa', 'Jaipur', 'Udaipur', 'Rishikesh', 'Shimla'];

  return (
    <div
      className={cn(
        'w-full max-w-4xl mx-auto bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-3xl shadow-2xl border border-[var(--border)] transition-all',
        className,
      )}
    >
      <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch gap-2">
        {/* Destination Field */}
        <div className="flex-1 px-4 py-3 rounded-2xl hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)] transition-all relative group">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Where to?
          </label>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <input
              type="text"
              placeholder="Search destinations (e.g. Manali, Goa)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Divider (Desktop) */}
        <div className="hidden lg:block w-[1px] bg-[var(--border)] my-2" />

        {/* Check-in Date */}
        <div className="flex-1 px-4 py-3 rounded-2xl hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)] transition-all">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Check in
          </label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Divider (Desktop) */}
        <div className="hidden lg:block w-[1px] bg-[var(--border)] my-2" />

        {/* Check-out Date */}
        <div className="flex-1 px-4 py-3 rounded-2xl hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)] transition-all">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Check out
          </label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Divider (Desktop) */}
        <div className="hidden lg:block w-[1px] bg-[var(--border)] my-2" />

        {/* Guests Field */}
        <div className="flex-1 px-4 py-3 rounded-2xl hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)] transition-all relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Who
          </label>
          <button
            type="button"
            onClick={() => setGuestPickerOpen(!guestPickerOpen)}
            className="w-full flex items-center justify-between text-left focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {guests} {guests === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>
          </button>

          {/* Guest Selector Popover */}
          {guestPickerOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setGuestPickerOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white rounded-2xl shadow-xl border border-[var(--border)] z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">Guests</p>
                    <p className="text-xs text-[var(--text-secondary)]">Ages 13 or above</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={guests <= 1}
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-sm text-[var(--text-primary)] w-4 text-center">
                      {guests}
                    </span>
                    <button
                      type="button"
                      disabled={guests >= 16}
                      onClick={() => setGuests((g) => Math.min(16, g + 1))}
                      className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search Submit Button */}
        <div className="p-1 flex items-center">
          <button
            type="submit"
            className="w-full lg:w-auto h-full min-h-[50px] px-7 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-semibold">Search</span>
          </button>
        </div>
      </form>

      {/* Quick Destination Pills */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]/60 px-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[var(--text-secondary)] font-medium shrink-0">Popular:</span>
        {quickDestinations.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setDestination(city)}
            className={cn(
              'px-3 py-1 rounded-full border transition-colors shrink-0',
              destination.toLowerCase() === city.toLowerCase()
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--border)]',
            )}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
