'use client';

import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import {
  X,
  Compass,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Lightbulb,
  AlertCircle,
  Loader2,
  Printer,
} from 'lucide-react';
import { aiApi } from '@/lib/api';
import type { ItineraryResponse } from '@/types/ai';

interface TripItineraryModalProps {
  propertySlug: string;
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  initialDays?: number;
  checkIn?: string;
  checkOut?: string;
}

export function TripItineraryModal({
  propertySlug,
  propertyTitle,
  isOpen,
  onClose,
  initialDays = 3,
  checkIn,
  checkOut,
}: TripItineraryModalProps) {
  const [days, setDays] = useState(initialDays);
  const [tripStyle, setTripStyle] = useState('relaxation and local discovery');
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.generateItinerary({
        propertySlug,
        days,
        tripStyle,
        checkIn,
        checkOut,
      });

      if (res.data) {
        setItinerary(res.data);
      } else {
        setError(res.error || 'Failed to generate itinerary. Please try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating itinerary.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AccessibleDialog
      ariaLabel="AI trip planner"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClose={onClose}
    >
      <div className="relative w-full max-w-4xl my-auto bg-[var(--bg-primary)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                AI Trip Planner
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Curated getaway itinerary for {propertyTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {itinerary && (
              <button
                onClick={handlePrint}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
                title="Print itinerary"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Controls if no itinerary generated yet */}
          {!itinerary && (
            <div className="space-y-5 max-w-xl mx-auto py-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-primary)] text-white flex items-center justify-center mx-auto shadow-md">
                  <Sparkles className="w-6 h-6 text-[var(--border)]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                  Plan Your Getaway with StayMatch AI
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Select your stay duration and preferred vibe to generate tailored daily
                  activities, scenic highlights, and insider recommendations.
                </p>
              </div>

              {/* Form Controls */}
              <div className="p-6 rounded-2xl bg-white border border-[var(--border)] space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                    Trip Duration (Days)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setDays(num)}
                        className={`py-2 text-sm font-semibold rounded-xl border transition ${
                          days === num
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                            : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {num}d
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                    Trip Style & Focus
                  </label>
                  <select
                    value={tripStyle}
                    onChange={(e) => setTripStyle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="relaxation and local discovery">
                      Relaxation, Slow Living & Nature
                    </option>
                    <option value="adventure, trails and outdoor thrill">
                      Adventure, Trekking & Outdoor Thrill
                    </option>
                    <option value="cultural heritage, food and artisan crafts">
                      Cultural Heritage, Food & Artisan Markets
                    </option>
                    <option value="family friendly with easy paced activities">
                      Family Vacation (Easy Paced & Kid-Friendly)
                    </option>
                    <option value="workation, quiet cafes and scenic evening strolls">
                      Workation (Good Cafes & Evening Exploration)
                    </option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerate}
                  className="w-full py-3.5 rounded-xl bg-[var(--text-primary)] text-white font-semibold text-sm hover:bg-[var(--accent-primary)] disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Curating {days}-Day Itinerary...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
                      <span>Generate {days}-Day Itinerary</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Render Generated Itinerary */}
          {itinerary && (
            <div className="space-y-6">
              {/* Trip Overview Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--text-primary)] to-[var(--surface-deep)] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-secondary)] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tailored Travel Plan</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-white">
                    {itinerary.totalDays} Days in {itinerary.destination}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 mt-1 capitalize">
                    Theme: {itinerary.tripStyle}
                  </p>
                </div>
                <button
                  onClick={() => setItinerary(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/15"
                >
                  Change Options
                </button>
              </div>

              {/* Day Cards */}
              <div className="space-y-4">
                {itinerary.days.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--bg-secondary)] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center">
                          D{day.dayNumber}
                        </span>
                        <h4 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                          Day {day.dayNumber}: {day.title}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                      {/* Morning */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
                          <Sun className="w-4 h-4 text-amber-600" />
                          <span>Morning</span>
                        </div>
                        <p className="text-[var(--text-primary)] leading-relaxed">{day.morning}</p>
                      </div>

                      {/* Afternoon */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-orange-700 font-semibold text-xs">
                          <Sunset className="w-4 h-4 text-orange-600" />
                          <span>Afternoon</span>
                        </div>
                        <p className="text-[var(--text-primary)] leading-relaxed">
                          {day.afternoon}
                        </p>
                      </div>

                      {/* Evening */}
                      <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs">
                          <Moon className="w-4 h-4 text-indigo-600" />
                          <span>Evening</span>
                        </div>
                        <p className="text-[var(--text-primary)] leading-relaxed">{day.evening}</p>
                      </div>
                    </div>

                    {/* Local Insider Tip */}
                    {day.localTip && (
                      <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-start gap-2 text-xs text-[var(--text-primary)]">
                        <Lightbulb className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[var(--accent-primary)]">Insider Tip: </strong>
                          <span>{day.localTip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                <span className="font-semibold block mb-0.5">Disclaimer:</span>
                {itinerary.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}
