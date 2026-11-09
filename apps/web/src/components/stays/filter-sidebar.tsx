'use client';

import React from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import { SlidersHorizontal, RotateCcw, X, Bed, Bath, Users } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';

export interface FilterState {
  destination: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  propertyType: string; // 'All' or backend enum e.g. 'VILLA', 'CABIN'
  guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[]; // amenity slugs e.g. 'wifi', 'private-pool'
}

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

const PROPERTY_TYPES = [
  { value: 'All', label: 'All Stays' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'CABIN', label: 'Cabin' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'COTTAGE', label: 'Cottage' },
  { value: 'HOUSE', label: 'House' },
  { value: 'CHALET', label: 'Chalet' },
  { value: 'FARM_STAY', label: 'Farm Stay' },
  { value: 'RESORT', label: 'Resort' },
  { value: 'HOMESTAY', label: 'Homestay' },
];

const AMENITY_OPTIONS = [
  { slug: 'wifi', label: 'High-speed Wi-Fi' },
  { slug: 'private-pool', label: 'Private Swimming Pool' },
  { slug: 'mountain-view', label: 'Mountain View' },
  { slug: 'sea-view', label: 'Sea / Ocean View' },
  { slug: 'air-conditioning', label: 'Air Conditioning' },
  { slug: 'fireplace', label: 'Wood Fireplace' },
  { slug: 'free-parking', label: 'Free Parking' },
  { slug: 'chef-on-demand', label: 'Private Chef on Request' },
  { slug: 'pet-friendly', label: 'Pet Friendly' },
  { slug: 'dedicated-workspace', label: 'Dedicated Workspace' },
  { slug: 'hot-tub', label: 'Hot Tub / Jacuzzi' },
  { slug: 'bonfire-pit', label: 'Bonfire Pit' },
];

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  isMobileOpen,
  onCloseMobile,
  className,
}: FilterSidebarProps) {
  const handleAmenityToggle = (slug: string) => {
    const exists = filters.amenities.includes(slug);
    const updated = exists
      ? filters.amenities.filter((s) => s !== slug)
      : [...filters.amenities, slug];
    onChange({ ...filters, amenities: updated });
  };

  const content = (
    <div className="space-y-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
          <h3 className="font-serif text-lg font-bold">Filters</h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Price per night
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span>{formatINR(filters.minPrice)}</span>
            <span>{formatINR(filters.maxPrice)}</span>
          </div>
          <input
            type="range"
            min={2000}
            max={60000}
            step={1000}
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full accent-[var(--accent-primary)] cursor-pointer"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Max budget:{' '}
            <strong className="text-[var(--text-primary)]">{formatINR(filters.maxPrice)}</strong>
          </p>
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Property Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPES.map((type) => {
            const isSelected = filters.propertyType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ ...filters, propertyType: type.value })}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                    : 'bg-white text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum Guests */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Guests</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 4, 6].map((num) => {
            const isSelected = filters.guests === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange({ ...filters, guests: num })}
                className={cn(
                  'py-2 text-xs font-semibold rounded-xl border transition-colors',
                  isSelected
                    ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                {num}+
              </button>
            );
          })}
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          <Bed className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Bedrooms</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((num) => {
            const isSelected = filters.bedrooms === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange({ ...filters, bedrooms: num })}
                className={cn(
                  'py-2 text-xs font-semibold rounded-xl border transition-colors',
                  isSelected
                    ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                {num === 0 ? 'Any' : `${num}+`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          <Bath className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Bathrooms</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((num) => {
            const isSelected = filters.bathrooms === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange({ ...filters, bathrooms: num })}
                className={cn(
                  'py-2 text-xs font-semibold rounded-xl border transition-colors',
                  isSelected
                    ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                {num === 0 ? 'Any' : `${num}+`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amenities Multi-Select */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Amenities
        </label>
        <div className="space-y-2">
          {AMENITY_OPTIONS.map((amenity) => {
            const isChecked = filters.amenities.includes(amenity.slug);
            return (
              <label
                key={amenity.slug}
                className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleAmenityToggle(amenity.slug)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer"
                />
                <span className="group-hover:text-[var(--accent-primary)] transition-colors">
                  {amenity.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={cn(
          'hidden lg:block w-72 shrink-0 bg-white p-6 rounded-3xl border border-[var(--border)] shadow-sm sticky top-28 self-start',
          className,
        )}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <AccessibleDialog
          ariaLabel="Stay filters"
          className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClose={onCloseMobile}
        >
          <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-[var(--border)] relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
              <span className="font-serif text-xl font-bold">Filter Listings</span>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
            <div className="pt-6 mt-6 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium text-sm hover:bg-[var(--accent-primary-hover)]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
