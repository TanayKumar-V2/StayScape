'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Home,
  MapPin,
  RotateCcw,
  Map,
  Grid,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { publicPropertiesApi } from '@/lib/api';
import { PublicPropertySummary, PublicSearchMeta, SearchPropertiesQuery } from '@/types/property';
import { PropertyCard } from '@/components/stays/property-card';
import { FilterSidebar, FilterState } from '@/components/stays/filter-sidebar';
import { CategoryBar } from '@/components/home/category-bar';
const DiscoveryMap = dynamic(
  () => import('@/components/stays/discovery-map').then((mod) => mod.DiscoveryMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full min-h-96 animate-pulse rounded-2xl bg-[var(--bg-muted)]"
        aria-label="Loading map"
      />
    ),
  },
);
import { PageContainer } from '@/components/layout/page-container';

function StaysContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial parameters from URL
  const initialDestination = searchParams.get('destination') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const requestedPropertyType = searchParams.get('propertyType') || 'All';
  const supportedPropertyTypes = [
    'APARTMENT',
    'CABIN',
    'GUESTHOUSE',
    'HOTEL',
    'HOUSE',
    'HOMESTAY',
    'OTHER',
    'VILLA',
  ];
  const initialPropertyType = supportedPropertyTypes.includes(requestedPropertyType.toUpperCase())
    ? requestedPropertyType.toUpperCase()
    : 'All';
  const initialMinPrice = Number(searchParams.get('minPrice')) || 2000;
  const initialMaxPrice = Number(searchParams.get('maxPrice')) || 60000;
  const initialGuests = Number(searchParams.get('guests')) || 1;
  const initialBedrooms = Number(searchParams.get('bedrooms')) || 0;
  const initialBathrooms = Number(searchParams.get('bathrooms')) || 0;
  const initialAmenities = searchParams.getAll('amenities');
  const initialSort =
    (searchParams.get('sort') as 'recommended' | 'price-asc' | 'price-desc') || 'recommended';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialCheckIn = searchParams.get('checkIn') || '';
  const initialCheckOut = searchParams.get('checkOut') || '';

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    destination: initialDestination,
    category: initialCategory,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    propertyType: initialPropertyType,
    guests: initialGuests,
    bedrooms: initialBedrooms,
    bathrooms: initialBathrooms,
    amenities: initialAmenities,
  });

  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc'>(initialSort);
  const [page, setPage] = useState<number>(initialPage);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedMapSlug, setSelectedMapSlug] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [browseOptionsOpen, setBrowseOptionsOpen] = useState(false);

  // Search input in header
  const [searchInput, setSearchInput] = useState(initialDestination);

  // Results & Loading State
  const [properties, setProperties] = useState<PublicPropertySummary[]>([]);
  const [meta, setMeta] = useState<PublicSearchMeta>({
    total: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties from real API
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: SearchPropertiesQuery = {
      page,
      limit: showMap ? 12 : 9,
    };

    if (filters.destination.trim()) {
      query.destination = filters.destination.trim();
    }

    if (filters.propertyType && filters.propertyType !== 'All') {
      query.propertyTypes = [filters.propertyType];
    }

    if (filters.category && filters.category !== 'All') {
      if (filters.category === 'Cabins') query.propertyTypes = ['CABIN'];
      else if (filters.category === 'Beachfront') query.q = 'beach';
      else if (filters.category === 'Mountains') query.q = 'mountain';
      else if (filters.category === 'Amazing views') query.q = 'amazing view';
      else if (filters.category === 'Design stays') query.q = 'design';
      else if (filters.category === 'Luxury stays') query.propertyTypes = ['VILLA', 'HOTEL'];
      else if (filters.category === 'Countryside') query.propertyTypes = ['HOUSE', 'HOMESTAY'];
      else if (filters.category === 'City escapes') query.propertyTypes = ['APARTMENT', 'HOUSE'];
    }

    if (filters.minPrice > 0) {
      query.minPricePaise = filters.minPrice * 100;
    }

    if (filters.maxPrice < 60000) {
      query.maxPricePaise = filters.maxPrice * 100;
    }

    if (filters.guests > 1) {
      query.guests = filters.guests;
    }

    if (filters.bedrooms > 0) {
      query.bedrooms = filters.bedrooms;
    }

    if (filters.bathrooms > 0) {
      query.bathrooms = filters.bathrooms;
    }

    if (filters.amenities.length > 0) {
      query.amenities = filters.amenities;
    }

    if (sortBy === 'price-asc') {
      query.sort = 'price_asc';
    } else if (sortBy === 'price-desc') {
      query.sort = 'price_desc';
    } else {
      query.sort = 'newest';
    }

    try {
      const res = await publicPropertiesApi.search(query);
      if (res.data && Array.isArray(res.data.items)) {
        setProperties(res.data.items);
        setMeta(res.data.meta);
      } else {
        setProperties([]);
        setError(res.error || 'Failed to fetch properties');
      }
    } catch {
      setProperties([]);
      setError('Unable to reach server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, page, showMap]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Synchronize URL with active filters
  const syncUrl = useCallback(
    (newFilters: FilterState, newSort: string, newPage: number, dates = { checkIn, checkOut }) => {
      const params = new URLSearchParams();
      if (newFilters.destination) params.set('destination', newFilters.destination);
      if (newFilters.category && newFilters.category !== 'All')
        params.set('category', newFilters.category);
      if (newFilters.propertyType && newFilters.propertyType !== 'All')
        params.set('propertyType', newFilters.propertyType);
      if (newFilters.maxPrice < 60000) params.set('maxPrice', newFilters.maxPrice.toString());
      if (newFilters.guests > 1) params.set('guests', newFilters.guests.toString());
      if (newFilters.bedrooms > 0) params.set('bedrooms', newFilters.bedrooms.toString());
      if (newFilters.bathrooms > 0) params.set('bathrooms', newFilters.bathrooms.toString());
      newFilters.amenities.forEach((a) => params.append('amenities', a));
      if (newSort !== 'recommended') params.set('sort', newSort);
      if (newPage > 1) params.set('page', newPage.toString());
      if (dates.checkIn) params.set('checkIn', dates.checkIn);
      if (dates.checkOut) params.set('checkOut', dates.checkOut);

      const qs = params.toString();
      router.replace(`/stays${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, checkIn, checkOut],
  );

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    syncUrl(newFilters, sortBy, 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...filters, destination: searchInput.trim() };
    setFilters(newFilters);
    setPage(1);
    syncUrl(newFilters, sortBy, 1);
  };

  const handleResetFilters = () => {
    const resetState: FilterState = {
      destination: '',
      category: 'All',
      minPrice: 2000,
      maxPrice: 60000,
      propertyType: 'All',
      guests: 1,
      bedrooms: 0,
      bathrooms: 0,
      amenities: [],
    };
    setFilters(resetState);
    setSearchInput('');
    setCheckIn('');
    setCheckOut('');
    setSortBy('recommended');
    setPage(1);
    syncUrl(resetState, 'recommended', 1, { checkIn: '', checkOut: '' });
  };

  return (
    <div className="py-8">
      <PageContainer>
        {/* Page Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {filters.destination ? `Destination: ${filters.destination}` : 'All Destinations'}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              {filters.destination ? `Stays in ${filters.destination}` : 'Explore Unique Stays'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Showing {meta.total} {meta.total === 1 ? 'stay' : 'stays'} available in India
            </p>
          </div>

          {/* Compact Quick Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[var(--border)] shadow-sm max-w-sm w-full"
          >
            <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <input
              type="text"
              placeholder="Search destination (e.g. Manali, Goa)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  const updated = { ...filters, destination: '' };
                  setFilters(updated);
                  setPage(1);
                  syncUrl(updated, sortBy, 1);
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category Carousel */}
        <div className="mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
          <CategoryBar
            selectedCategory={filters.category}
            onSelectCategory={(cat) => {
              const updated = { ...filters, category: cat };
              setFilters(updated);
              setPage(1);
              syncUrl(updated, sortBy, 1);
            }}
          />
        </div>

        {/* Primary filter summary and secondary discovery controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[var(--bg-secondary)]/70 p-3.5 rounded-2xl border border-[var(--border)]">
          <div className="flex items-center gap-2">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)] shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Filters</span>
              {(filters.maxPrice < 60000 ||
                filters.propertyType !== 'All' ||
                filters.guests > 1 ||
                filters.bedrooms > 0 ||
                filters.bathrooms > 0 ||
                filters.amenities.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]" />
              )}
            </button>

            {/* Active filters count badge */}
            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
              Filtered by:{' '}
              <strong className="text-[var(--text-primary)]">
                {filters.category !== 'All' ? filters.category : 'All Categories'}
              </strong>
              {filters.destination && `, ${filters.destination}`}
              {filters.propertyType !== 'All' && `, ${filters.propertyType}`}
            </span>
          </div>

          <button
            type="button"
            aria-expanded={browseOptionsOpen}
            aria-controls="browse-options"
            onClick={() => setBrowseOptionsOpen((open) => !open)}
            className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          >
            More options{' '}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${browseOptionsOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {browseOptionsOpen && (
          <div
            id="browse-options"
            className="-mt-6 mb-8 flex flex-wrap items-end gap-4 p-4 rounded-2xl border border-[var(--border)] bg-white"
          >
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Check-in
              <input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  syncUrl(filters, sortBy, 1, { checkIn: e.target.value, checkOut });
                }}
                className="mt-1 block rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Check-out
              <input
                type="date"
                min={checkIn || undefined}
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  syncUrl(filters, sortBy, 1, { checkIn, checkOut: e.target.value });
                }}
                className="mt-1 block rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            {(checkIn || checkOut) && (
              <p className="max-w-xs text-xs text-[var(--text-secondary)]">
                We’ll carry these dates to each stay. Availability is checked before reservation.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowMap((visible) => !visible)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              {showMap ? <Grid className="w-4 h-4" /> : <Map className="w-4 h-4" />}
              {showMap ? 'Show grid only' : 'Show map'}
            </button>
            <label
              htmlFor="sort-select"
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as typeof sortBy;
                  setSortBy(val);
                  setPage(1);
                  syncUrl(filters, val, 1);
                }}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="recommended">Newest stays</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
        )}

        {/* Main Content Layout with Sidebar & Optional Map */}
        <div className="flex items-start gap-8">
          {/* Desktop Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
            isMobileOpen={mobileFilterOpen}
            onCloseMobile={() => setMobileFilterOpen(false)}
          />

          {/* Listings & Map Area */}
          <div className="flex-1 min-w-0">
            {/* Interactive Map View */}
            {showMap && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider">
                    Interactive Map Discovery
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Approximate property coordinates plotted
                  </span>
                </div>
                <DiscoveryMap
                  properties={properties}
                  selectedSlug={selectedMapSlug}
                  onSelectProperty={(slug) => setSelectedMapSlug(slug)}
                />
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div
                className={`grid grid-cols-1 ${
                  showMap ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'
                } gap-6`}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-3xl overflow-hidden border border-[var(--border)] animate-pulse p-4 space-y-4"
                  >
                    <div className="aspect-[4/3] bg-[var(--border)]/60 rounded-2xl w-full" />
                    <div className="h-4 bg-[var(--border)]/70 rounded w-1/3" />
                    <div className="h-5 bg-[var(--border)]/80 rounded w-3/4" />
                    <div className="h-4 bg-[var(--border)]/50 rounded w-1/2" />
                    <div className="pt-3 border-t border-[var(--border)]/60 flex justify-between items-center">
                      <div className="h-5 bg-[var(--border)]/70 rounded w-1/4" />
                      <div className="h-4 bg-[var(--border)]/60 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 px-6 bg-white rounded-3xl border border-[var(--border)] max-w-lg mx-auto">
                <p className="text-sm text-[var(--accent-secondary)] font-medium mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchProperties}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-white text-xs font-medium hover:bg-black transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Search</span>
                </button>
              </div>
            ) : (properties?.length ?? 0) > 0 ? (
              <>
                <div
                  className={`grid grid-cols-1 ${
                    showMap ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'
                  } gap-6`}
                >
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      searchDates={{ checkIn, checkOut, guests: filters.guests }}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {meta.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-6">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Showing page{' '}
                      <strong className="text-[var(--text-primary)]">{meta.page}</strong> of{' '}
                      <strong className="text-[var(--text-primary)]">{meta.totalPages}</strong> (
                      {meta.total} total stays)
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!meta.hasPrevPage}
                        onClick={() => {
                          const prev = page - 1;
                          setPage(prev);
                          syncUrl(filters, sortBy, prev);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <button
                        type="button"
                        disabled={!meta.hasNextPage}
                        onClick={() => {
                          const next = page + 1;
                          setPage(next);
                          syncUrl(filters, sortBy, next);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-20 px-6 bg-white rounded-3xl border border-[var(--border)] max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-4">
                  <Home className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
                  No properties matched your criteria
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                  Try adjusting your budget, removing some amenity filters, or choosing a different
                  destination.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--text-primary)] text-white text-xs font-medium hover:bg-black transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default function StaysPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
          Loading curated stays...
        </div>
      }
    >
      <StaysContent />
    </Suspense>
  );
}
