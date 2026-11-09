'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Scale,
  Users,
  ExternalLink,
  Loader2,
  Wallet,
  Home,
} from 'lucide-react';
import { aiApi } from '@/lib/api';
import type { StayMatchResponse } from '@/types/ai';
import { PropertyComparisonModal } from '@/components/stays/property-comparison-modal';

function StayMatchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [refinementQuery, setRefinementQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StayMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected for comparison (slugs)
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const samplePrompts = [
    {
      title: 'Cozy Cedar Cabin in Manali',
      query: 'Cozy mountain cabin in Manali with Wi-Fi and fireplace under ₹6,500 for 2 guests',
    },
    {
      title: 'Goa Beachfront Villa with Pool',
      query: 'Spacious beach villa in Goa with private swimming pool for 6 guests',
    },
    {
      title: 'High-Altitude Remote Workation',
      query: 'Quiet stay with high-speed internet and dedicated workspace in Himachal',
    },
    {
      title: 'Pet-Friendly Family Retreat',
      query: 'Pet-friendly nature homestay with scenic views and full kitchen for 4',
    },
  ];

  const handleSearch = useCallback(
    async (queryString?: string, isRefining = false) => {
      const q = (queryString || (isRefining ? refinementQuery : query)).trim();
      if (!q || loading) return;

      setLoading(true);
      setError(null);
      if (!isRefining) setQuery(q);

      try {
        const res = await aiApi.searchStayMatch({
          query: q,
          previousPreferences: isRefining && data ? data.interpretedPreferences : undefined,
          limit: 18,
        });

        if (res.data) {
          setData(res.data);
          if (isRefining) {
            setRefinementQuery('');
          }
        } else {
          setError(res.error || 'Failed to search stays. Please try again.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error executing StayMatch search.');
      } finally {
        setLoading(false);
      }
    },
    [loading, refinementQuery, query, data],
  );

  // Run on mount if initialQuery is passed in URL
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      void handleSearch(initialQuery, false);
    }
  }, [initialQuery, handleSearch]);

  const toggleCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 3) {
        alert('You can compare a maximum of 3 stays at once.');
        return prev;
      }
      return [...prev, slug];
    });
  };

  const getMatchScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-600 text-white';
    if (score >= 75) return 'bg-[var(--accent-primary)] text-white';
    if (score >= 60) return 'bg-amber-600 text-white';
    return 'bg-stone-600 text-white';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[var(--bg-primary)] via-white to-[var(--bg-primary)] border-b border-[var(--border)] pt-12 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI StayMatch Discovery</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
            Describe your ideal getaway in plain English.
          </h1>

          <p className="text-sm sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto font-light leading-relaxed">
            Our AI interprets your travel wishes and matches you with verified database listings
            evaluated on amenities, budget, and real-time availability.
          </p>

          {/* Main Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="pt-4 max-w-2xl mx-auto"
          >
            <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-[var(--border)] p-2 hover:border-[var(--accent-primary)]/40 focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20 transition-all">
              <Search className="w-5 h-5 text-[var(--text-secondary)] ml-3 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Quiet mountain cabin in Manali with high-speed Wi-Fi under ₹7,000 for 2 guests"
                className="w-full bg-transparent px-3 py-3 text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="px-6 py-3 rounded-xl bg-[var(--text-primary)] text-white text-sm font-semibold hover:bg-[var(--accent-primary)] disabled:opacity-40 transition shrink-0 flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Match</span>
                    <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sample Prompts */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            <span className="text-xs font-semibold text-[var(--text-secondary)] mr-1">
              Try asking:
            </span>
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sp.query);
                  handleSearch(sp.query);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]/40 transition shadow-2xs"
              >
                {sp.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Interpreted Preferences Card & Refinement */}
        {data && (
          <div className="rounded-3xl bg-white border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--bg-secondary)] pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-1">
                  <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
                  <span>Interpreted Preferences</span>
                  {data.fallbackUsed && (
                    <span className="text-[10px] text-[var(--text-secondary)] lowercase font-normal">
                      (basic matching)
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {data.summary}
                </h2>
              </div>

              {/* Status Badge */}
              {data.interpretedPreferences.intentStatus === 'READY' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ready to Book
                </span>
              )}
              {data.interpretedPreferences.intentStatus === 'NEEDS_CLARIFICATION' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  Needs Clarification
                </span>
              )}
            </div>

            {/* Extracted Parameter Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {data.interpretedPreferences.destination && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] font-medium text-[var(--text-primary)]">
                  📍 Destination: <strong>{data.interpretedPreferences.destination}</strong>
                </span>
              )}

              {data.interpretedPreferences.guests?.total && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] font-medium text-[var(--text-primary)]">
                  <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {data.interpretedPreferences.guests.total} Guests
                </span>
              )}

              {data.interpretedPreferences.budget?.maxPaise && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] font-medium text-[var(--text-primary)]">
                  <Wallet className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  Max ₹
                  {Math.round(data.interpretedPreferences.budget.maxPaise / 100).toLocaleString(
                    'en-IN',
                  )}
                  /night
                </span>
              )}

              {data.interpretedPreferences.propertyTypes &&
                data.interpretedPreferences.propertyTypes.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] font-medium text-[var(--text-primary)]">
                    <Home className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    {data.interpretedPreferences.propertyTypes.join(', ')}
                  </span>
                )}

              {data.interpretedPreferences.requiredAmenities &&
                data.interpretedPreferences.requiredAmenities.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
                  >
                    ✓ Required: {slug}
                  </span>
                ))}

              {data.interpretedPreferences.preferredAmenities &&
                data.interpretedPreferences.preferredAmenities.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium"
                  >
                    ★ Preferred: {slug}
                  </span>
                ))}

              {data.unresolvedPreferences &&
                data.unresolvedPreferences.length > 0 &&
                data.unresolvedPreferences.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 font-medium"
                    title="Not in database catalog"
                  >
                    Unlisted: {u}
                  </span>
                ))}
            </div>

            {/* Clarification prompt */}
            {data.clarificationQuestion && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5">Note from Assistant:</strong>
                  <span>{data.clarificationQuestion}</span>
                </div>
              </div>
            )}

            {/* Conversational Refinement Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(undefined, true);
              }}
              className="pt-4 border-t border-[var(--bg-secondary)] flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={refinementQuery}
                  onChange={(e) => setRefinementQuery(e.target.value)}
                  placeholder="Refine this search... (e.g. 'Must allow pets', 'Increase budget to 9k', 'Look in Goa instead')"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={!refinementQuery.trim() || loading}
                className="px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary)] disabled:opacity-40 transition flex items-center gap-1.5"
              >
                <span>Refine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Results Section */}
        {data && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
                  Ranked Accommodations
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Found {data.totalMatched} verified listings matching your preferences
                </p>
              </div>

              {compareSlugs.length > 0 && (
                <button
                  onClick={() => setIsCompareModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition flex items-center gap-2 shadow-sm"
                >
                  <Scale className="w-4 h-4" />
                  <span>Compare Selected ({compareSlugs.length})</span>
                </button>
              )}
            </div>

            {/* Empty State */}
            {data.results.length === 0 && (
              <div className="py-16 text-center rounded-3xl bg-white border border-[var(--border)] p-8 space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  No exact matches found
                </h4>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Try broadening your budget or location, or remove strict amenity requirements to
                  see more stays.
                </p>
                <button
                  onClick={() => {
                    setQuery('Popular stays in India');
                    handleSearch('Popular stays in India');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary)] transition"
                >
                  Browse Popular Stays
                </button>
              </div>
            )}

            {/* Property Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.results.map((property) => {
                const priceRupees = Math.round(property.pricePerNightPaise / 100);
                const isSelectedForCompare = compareSlugs.includes(property.slug);
                const coverUrl = property.coverImage?.url;

                return (
                  <div
                    key={property.id}
                    className="group bg-white rounded-3xl border border-[var(--border)] overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-[16/10] bg-[var(--border)] overflow-hidden">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={property.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-xs">
                          No cover photo
                        </div>
                      )}

                      {/* Property Type Badge */}
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium tracking-wide">
                        {property.propertyType}
                      </span>

                      {/* Match Score Badge */}
                      <div
                        className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-md flex items-center gap-1 ${getMatchScoreBadgeColor(
                          property.matchScore,
                        )}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{property.matchScore}% Match</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1">
                          {property.city}, {property.state}
                        </div>
                        <h4 className="font-serif text-lg font-bold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--accent-primary)] transition-colors">
                          {property.title}
                        </h4>
                      </div>

                      {/* Match Reasons */}
                      {property.matchReasons && property.matchReasons.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--bg-secondary)]">
                          <span className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1">
                            Why it matches:
                          </span>
                          {property.matchReasons.map((reason, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-[var(--text-primary)]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Trade-offs */}
                      {property.tradeOffs && property.tradeOffs.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--bg-secondary)]">
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                            Considerations:
                          </span>
                          {property.tradeOffs.map((to, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-stone-600"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{to}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Capacity & Price */}
                      <div className="pt-3 border-t border-[var(--bg-secondary)] flex items-center justify-between">
                        <div className="text-xs text-[var(--text-secondary)] space-x-2">
                          <span>{property.maxGuests} guests</span>
                          <span>•</span>
                          <span>{property.bedrooms} beds</span>
                        </div>
                        <div className="text-right">
                          <span className="font-serif text-lg font-bold text-[var(--text-primary)]">
                            ₹{priceRupees.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]"> / night</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCompare(property.slug)}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                            isSelectedForCompare
                              ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                              : 'bg-white border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{isSelectedForCompare ? 'Selected' : 'Compare'}</span>
                        </button>

                        <Link
                          href={`/stays/${property.slug}`}
                          className="flex-1 py-2 px-3 rounded-xl bg-[var(--text-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary)] transition flex items-center justify-center gap-1.5"
                        >
                          <span>View Stay</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Floating Comparison Tray */}
      {compareSlugs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--text-primary)] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-white/10 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Scale className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>{compareSlugs.length} of 3 stays selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="px-4 py-1.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold tracking-wide uppercase transition"
          >
            Compare Now
          </button>

          <button
            onClick={() => setCompareSlugs([])}
            className="text-xs text-white/60 hover:text-white transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      <PropertyComparisonModal
        propertySlugs={compareSlugs}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveSlug={(slug) => setCompareSlugs((prev) => prev.filter((s) => s !== slug))}
      />
    </div>
  );
}

export default function StayMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
          <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
        </div>
      }
    >
      <StayMatchContent />
    </Suspense>
  );
}
