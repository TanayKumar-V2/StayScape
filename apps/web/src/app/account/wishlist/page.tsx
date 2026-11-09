'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Star, MapPin, Trash2, Compass, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';
import { wishlistApi } from '@/lib/api';
import { WishlistItem } from '@/types/wishlist';
import { formatINR } from '@/lib/utils';
import { paiseToRupees, formatPropertyType } from '@/types/property';

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toggleWishlist } = useWishlist();
  const router = useRouter();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/wishlist');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadWishlist = async (p = 1) => {
    try {
      setLoading(true);
      const res = await wishlistApi.getWishlist(p, 12);
      if (res.data) {
        setItems(res.data.data);
        setPage(res.data.meta.page);
        setTotalPages(res.data.meta.totalPages);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist(1);
    }
  }, [isAuthenticated]);

  const handleRemove = async (propertyId: string) => {
    setRemovingId(propertyId);
    try {
      await toggleWishlist(propertyId);
      setItems((prev) => prev.filter((i) => i.propertyId !== propertyId));
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading || (loading && items.length === 0)) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-8 w-48 bg-stone-200 animate-pulse rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-stone-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Saved Stays
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {items.length} {items.length === 1 ? 'unique stay' : 'unique stays'} saved for your next
            escape
          </p>
        </div>
        <Link
          href="/stays"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          Explore More Stays
        </Link>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[var(--border)] p-12 sm:p-16 text-center max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6 text-[var(--accent-secondary)]">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-3">
            Your wishlist is empty
          </h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 max-w-md mx-auto">
            When you find a cabin, villa or heritage stay you love, click the heart icon on its card
            to save it here for future getaways.
          </p>
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text-primary)] hover:bg-black text-white text-sm font-semibold transition-all shadow-md"
          >
            Start Exploring
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ property }) => {
            const priceRupees = paiseToRupees(property.pricePerNightPaise);
            const fallbackImage =
              'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';
            const imgUrl = property.coverImageUrl || fallbackImage;
            const hasReviews = property.reviewCount > 0 && property.averageRating !== null;

            return (
              <article
                key={property.id}
                className="group relative bg-white rounded-3xl overflow-hidden border border-[var(--border)] transition-all duration-300 hover:shadow-xl flex flex-col"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-secondary)]">
                  <Link href={`/stays/${property.slug}`} className="block w-full h-full">
                    <Image
                      src={imgUrl}
                      alt={property.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </Link>

                  {/* Remove Button */}
                  <button
                    type="button"
                    disabled={removingId === property.id}
                    onClick={() => handleRemove(property.id)}
                    className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)] hover:text-white transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Property Type Badge */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-[var(--text-primary)] shadow-sm">
                      {formatPropertyType(property.propertyType)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Location & Rating */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[var(--accent-primary)] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[var(--accent-primary)]" />
                        {property.city}, {property.state}
                      </span>

                      {hasReviews ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)]">
                          <Star className="w-3.5 h-3.5 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
                          <span>{property.averageRating?.toFixed(1)}</span>
                          <span className="text-[var(--text-secondary)] font-normal">
                            ({property.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                          New
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--accent-primary)] transition-colors">
                      <Link href={`/stays/${property.slug}`}>{property.title}</Link>
                    </h3>

                    {/* Specifications */}
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {property.maxGuests} guests • {property.bedrooms}{' '}
                      {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'} • {property.bathrooms}{' '}
                      {property.bathrooms === 1 ? 'bath' : 'baths'}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-[var(--border)]/70">
                    <div>
                      <span className="font-bold text-base text-[var(--text-primary)]">
                        {formatINR(priceRupees)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]"> / night</span>
                    </div>

                    <Link
                      href={`/stays/${property.slug}`}
                      className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] underline underline-offset-4 transition-all"
                    >
                      View Stay
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-12">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => loadWishlist(page - 1)}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-white disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => loadWishlist(page + 1)}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-white disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
