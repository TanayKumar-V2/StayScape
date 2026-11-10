'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, Users, Bed, Sparkles } from 'lucide-react';
import { useWishlist } from '@/context/wishlist-context';
import {
  Property,
  PublicPropertySummary,
  formatPropertyType,
  paiseToRupees,
} from '@/types/property';
import { cn, formatINR } from '@/lib/utils';

export type PropertyCardData = Property | PublicPropertySummary;

interface PropertyCardProps {
  property: PropertyCardData;
  className?: string;
  priority?: boolean;
  searchDates?: { checkIn?: string; checkOut?: string; guests?: number };
}

export function PropertyCard({
  property,
  className,
  priority = false,
  searchDates,
}: PropertyCardProps) {
  const { isSaved, toggleWishlist } = useWishlist();
  const [imgError, setImgError] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  const fallbackImage =
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';

  const isPublicSummary = 'pricePerNightPaise' in property;

  const isWishlisted = isSaved(property.id);

  const title = property.title;
  const slug = property.slug;
  const detailUrl = (() => {
    const params = new URLSearchParams();
    if (searchDates?.checkIn) params.set('checkIn', searchDates.checkIn);
    if (searchDates?.checkOut) params.set('checkOut', searchDates.checkOut);
    if (searchDates?.guests && searchDates.guests > 1)
      params.set('guests', String(searchDates.guests));
    const query = params.toString();
    return `/stays/${slug}${query ? `?${query}` : ''}`;
  })();

  const propertyTypeLabel = isPublicSummary
    ? formatPropertyType(property.propertyType)
    : property.propertyType;

  const rawImageUrl = isPublicSummary
    ? property.coverImage?.url || fallbackImage
    : property.images[0] || fallbackImage;

  const imageUrl = imgError ? fallbackImage : rawImageUrl;

  const destinationLabel = isPublicSummary ? property.city : property.destination;

  const locationSubtitle = isPublicSummary
    ? `${property.city}, ${property.state}`
    : property.location;

  const priceRupees = isPublicSummary
    ? paiseToRupees(property.pricePerNightPaise)
    : property.pricePerNight;

  // Real review data derived from database
  const reviewCount = isPublicSummary ? (property.reviewCount ?? 0) : (property.reviewCount ?? 0);

  const avgRating = isPublicSummary ? (property.averageRating ?? null) : (property.rating ?? null);

  const hasReviews = reviewCount > 0 && avgRating !== null;

  return (
    <article
      className={cn(
        'group relative bg-white rounded-[1.25rem] overflow-hidden border border-[var(--border)]/90 transition-all duration-500 hover:shadow-[0_24px_56px_-34px_rgba(20,48,39,.5)] hover:-translate-y-1 flex flex-col',
        className,
      )}
    >
      {/* Property Image Container */}
      <div className="relative aspect-[1.16/1] w-full overflow-hidden bg-[var(--bg-secondary)]">
        <Link href={detailUrl} className="block w-full h-full">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
            onError={() => setImgError(true)}
          />
        </Link>

        {/* Category Pill Tag */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-[var(--text-primary)] shadow-sm">
            {propertyTypeLabel}
          </span>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          disabled={isTogglingWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isTogglingWishlist) return;
            setIsTogglingWishlist(true);
            try {
              await toggleWishlist(property.id);
            } finally {
              setIsTogglingWishlist(false);
            }
          }}
          className={cn(
            'absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md',
            isWishlisted
              ? 'bg-[var(--accent-secondary)] text-white scale-110'
              : 'bg-white/90 backdrop-blur-md text-[var(--text-primary)] hover:bg-white hover:scale-105',
            isTogglingWishlist && 'opacity-70',
          )}
        >
          <Heart
            className={cn('w-4 h-4 transition-colors', isWishlisted && 'fill-current text-white')}
          />
        </button>
      </div>

      {/* Property Metadata & Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating and Location Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-primary)]">
              {destinationLabel}
            </span>

            {hasReviews ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)]">
                <Star className="w-3.5 h-3.5 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
                <span>{avgRating?.toFixed(1)}</span>
                <span className="text-[var(--text-secondary)] font-normal">({reviewCount})</span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                New listing
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--accent-primary)] transition-colors">
            <Link href={detailUrl}>{title}</Link>
          </h3>

          {/* Location details */}
          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
            {locationSubtitle}
          </p>

          {/* Specifications pills */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-3 pt-3 border-t border-[var(--border)]/70">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              {property.maxGuests} guests
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
            </span>
            <span>•</span>
            <span>{propertyTypeLabel}</span>
          </div>
        </div>

        {/* Pricing & Booking CTA */}
        <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-[var(--border)]/70">
          <div>
            <span className="font-bold text-base text-[var(--text-primary)]">
              {formatINR(priceRupees)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]"> / night</span>
          </div>

          <Link
            href={detailUrl}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
