'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, RefreshCw } from 'lucide-react';
import { publicPropertiesApi } from '@/lib/api';
import { PublicPropertySummary, SearchPropertiesQuery } from '@/types/property';
import { PropertyCard } from '@/components/stays/property-card';
import { CategoryBar } from './category-bar';

export function FeaturedStays() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [properties, setProperties] = useState<PublicPropertySummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatured = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);

    const query: SearchPropertiesQuery = {
      limit: 8,
      sort: 'newest',
    };

    if (category === 'Cabins') {
      query.propertyTypes = ['CABIN', 'CHALET'];
    } else if (category === 'Beachfront') {
      query.q = 'beach';
    } else if (category === 'Mountains') {
      query.q = 'mountain';
    } else if (category === 'Luxury stays') {
      query.propertyTypes = ['VILLA', 'RESORT'];
    } else if (category === 'Countryside') {
      query.propertyTypes = ['FARM_STAY', 'COTTAGE'];
    } else if (category === 'City escapes') {
      query.propertyTypes = ['APARTMENT', 'HOUSE'];
    }

    try {
      const res = await publicPropertiesApi.search(query);
      if (res.data && Array.isArray(res.data.items)) {
        setProperties(res.data.items);
        setTotalCount(res.data.meta?.total ?? res.data.items.length);
      } else {
        setProperties([]);
        setError(res.error || 'Failed to load properties');
      }
    } catch {
      setProperties([]);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured(selectedCategory);
  }, [selectedCategory, fetchFeatured]);

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent-primary)] mb-1 block">
            Handpicked Escapes
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            Featured stays across India
          </h2>
        </div>

        <Link
          href="/stays"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] group"
        >
          <span>Explore all {totalCount > 0 ? totalCount : ''} listings</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <CategoryBar
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>

      {/* Property Cards Grid / Skeleton / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
          {Array.from({ length: 4 }).map((_, idx) => (
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
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[var(--border)] max-w-md mx-auto">
          <p className="text-xs text-[var(--accent-secondary)] font-medium mb-3">{error}</p>
          <button
            onClick={() => fetchFeatured(selectedCategory)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--text-primary)] text-white text-xs font-medium hover:bg-black transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : (properties?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
          {properties.map((property, idx) => (
            <PropertyCard key={property.id} property={property} priority={idx < 4} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[var(--border)] max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] mx-auto mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[var(--text-primary)] mb-1">
            No stays found in this collection
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-6">
            We are curating more unique properties for this collection soon.
          </p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="px-5 py-2.5 rounded-xl bg-[var(--text-primary)] text-white text-xs font-medium hover:bg-black transition-colors"
          >
            Show All Stays
          </button>
        </div>
      )}
    </section>
  );
}
