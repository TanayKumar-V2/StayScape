'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Users, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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
  const today = new Date().toLocaleDateString('en-CA');
  const nextDay = (date: string) => {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + 1);
    return value.toLocaleDateString('en-CA');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkIn && checkOut && checkOut <= checkIn) return;
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
        'w-full rounded-[2rem] bg-[#e3e0d6] p-1.5 ring-1 ring-[#27382e]/[.08] shadow-[0_26px_70px_-44px_rgba(23,44,34,.5)] sm:p-2',
        className,
      )}
    >
      <Card className="w-full rounded-[calc(2rem-0.375rem)] border-white/80 bg-[#fbfaf6] p-2 shadow-none sm:rounded-[calc(2rem-0.5rem)] sm:p-3">
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
                min={today}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && checkOut <= e.target.value) setCheckOut('');
                }}
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
                min={checkIn ? nextDay(checkIn) : today}
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
              className="group w-full lg:w-auto h-full min-h-[50px] px-6 pl-7 rounded-full bg-[#1f4437] hover:bg-[#17382d] text-white font-medium flex items-center justify-center gap-3 shadow-[0_12px_26px_-20px_rgba(17,42,31,.8)] transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-0.5 active:scale-[.98] cursor-pointer"
            >
              <span className="text-sm font-medium">Find a stay</span>
              <span className="flex size-9 items-center justify-center rounded-full bg-white/10 transition-colors duration-500 group-hover:bg-white/20">
                <Search className="w-4 h-4" strokeWidth={1.5} />
              </span>
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
      </Card>
    </div>
  );
}
