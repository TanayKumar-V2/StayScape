'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  Sparkles,
  Check,
  AlertCircle,
  ExternalLink,
  Users,
  Bed,
  Bath,
  Clock,
  ShieldCheck,
  Scale,
  Loader2,
} from 'lucide-react';
import { aiApi } from '@/lib/api';
import type { PropertyComparisonResponse } from '@/types/ai';

interface PropertyComparisonModalProps {
  propertySlugs: string[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveSlug?: (slug: string) => void;
}

export function PropertyComparisonModal({
  propertySlugs,
  isOpen,
  onClose,
  onRemoveSlug,
}: PropertyComparisonModalProps) {
  const [data, setData] = useState<PropertyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || propertySlugs.length < 2) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    aiApi
      .compareProperties({ propertySlugs })
      .then((res) => {
        if (!isMounted) return;
        if (res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to compare properties');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Error comparing properties');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, propertySlugs]);

  if (!isOpen) return null;

  return (
    <AccessibleDialog
      ariaLabel="Compare stays"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClose={onClose}
    >
      <div className="relative w-full max-w-5xl my-auto bg-[var(--bg-primary)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Stay Comparison
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Side-by-side factual matrix & AI match insights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-[var(--accent-primary)] animate-spin mb-4" />
              <p className="text-[var(--text-primary)] font-medium text-base">
                Analyzing listing details...
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Comparing amenities, pricing, capacity, and guest fit
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-12 px-6 rounded-2xl bg-red-50 border border-red-200 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="font-semibold text-red-900 mb-1">Unable to compare properties</h3>
              <p className="text-sm text-red-700 max-w-md mx-auto mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {/* AI Comparative Insights */}
              <div className="rounded-2xl bg-gradient-to-br from-[var(--text-primary)] to-[var(--surface-deep)] text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent-primary)]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-secondary)]">
                    <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
                    <span>StayMatch™ AI Comparative Summary</span>
                    {data.fallbackUsed && (
                      <span className="text-[10px] text-white/60 lowercase font-normal">
                        (standard analysis)
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base text-white/90 leading-relaxed font-light">
                    {data.aiSummary}
                  </p>

                  {/* "Best For" Pills */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.properties.map((p) => {
                      const bestForText = data.bestFor[p.slug];
                      if (!bestForText) return null;
                      return (
                        <div
                          key={p.slug}
                          className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10"
                        >
                          <span className="text-xs font-medium text-white/60 block truncate">
                            {p.title}
                          </span>
                          <span className="text-xs font-semibold text-white block mt-1">
                            🎯 {bestForText}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Key Differences List */}
                  {data.keyDifferences && data.keyDifferences.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs uppercase tracking-wider font-semibold text-white/70 mb-2">
                        Standout Distinctions
                      </h4>
                      <ul className="space-y-1.5 text-xs text-white/80">
                        {data.keyDifferences.map((kd, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[var(--accent-primary)] mt-0.5">•</span>
                            <span>{kd}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-Side Property Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.properties.map((p) => {
                  const priceRupees = Math.round(p.pricePerNightPaise / 100);
                  const cleaningRupees = Math.round(p.cleaningFeePaise / 100);
                  const exclusives = data.matrix.exclusiveAmenities[p.slug] || [];

                  return (
                    <div
                      key={p.slug}
                      className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col shadow-sm"
                    >
                      {/* Image header */}
                      <div className="relative aspect-[16/10] bg-[var(--border)] w-full">
                        {p.coverImage ? (
                          <Image
                            src={p.coverImage}
                            alt={p.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-xs">
                            No image available
                          </div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium tracking-wide">
                          {p.propertyType}
                        </span>
                        {onRemoveSlug && data.properties.length > 2 && (
                          <button
                            onClick={() => onRemoveSlug(p.slug)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 text-[var(--text-primary)] hover:bg-white transition"
                            title="Remove from comparison"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="text-xs text-[var(--text-secondary)] mb-1">
                            {p.city}, {p.state}
                          </div>
                          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                            {p.title}
                          </h3>
                        </div>

                        {/* Price & specs */}
                        <div className="pt-3 border-t border-[var(--bg-secondary)] space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-[var(--text-secondary)]">
                              Nightly Rate
                            </span>
                            <span className="font-serif text-lg font-bold text-[var(--text-primary)]">
                              ₹{priceRupees.toLocaleString('en-IN')}
                            </span>
                          </div>
                          {cleaningRupees > 0 && (
                            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                              <span>Cleaning Fee</span>
                              <span>₹{cleaningRupees.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>

                        {/* Specs badges */}
                        <div className="grid grid-cols-3 gap-2 py-2 bg-[var(--bg-primary)] rounded-xl text-center text-xs text-[var(--text-primary)]">
                          <div className="p-1">
                            <Users className="w-3.5 h-3.5 mx-auto text-[var(--accent-primary)] mb-1" />
                            <span>{p.maxGuests} Guests</span>
                          </div>
                          <div className="p-1">
                            <Bed className="w-3.5 h-3.5 mx-auto text-[var(--accent-primary)] mb-1" />
                            <span>{p.bedrooms} Beds</span>
                          </div>
                          <div className="p-1">
                            <Bath className="w-3.5 h-3.5 mx-auto text-[var(--accent-primary)] mb-1" />
                            <span>{p.bathrooms} Baths</span>
                          </div>
                        </div>

                        {/* Timing */}
                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>
                            Check-in: {p.checkInFrom || '14:00'} • Out: {p.checkOutUntil || '11:00'}
                          </span>
                        </div>

                        {/* Exclusive Amenities */}
                        {exclusives.length > 0 && (
                          <div className="pt-2 border-t border-[var(--bg-secondary)]">
                            <span className="text-[11px] font-semibold text-[var(--accent-primary)] uppercase tracking-wide block mb-1.5">
                              ✨ Exclusive to this stay:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {exclusives.map((amenity, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium"
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-3">
                          <Link
                            href={`/stays/${p.slug}`}
                            target="_blank"
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--text-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary)] transition"
                          >
                            <span>View Listing</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shared Amenities Section */}
              {data.matrix.commonAmenities.length > 0 && (
                <div className="p-6 rounded-2xl bg-white border border-[var(--border)]">
                  <h4 className="font-serif text-base font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Shared Amenities in All Selected Stays</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.matrix.commonAmenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-primary)]"
                      >
                        <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>{amenity}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}
