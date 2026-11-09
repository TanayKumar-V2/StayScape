'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { publicPropertiesApi } from '@/lib/api';
import { DestinationSummary, paiseToRupees } from '@/types/property';
import { formatINR } from '@/lib/utils';

const DESTINATION_FALLBACK_IMAGES: Record<string, string> = {
  Manali:
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
  Goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  Udaipur:
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
  Munnar:
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
  Rishikesh:
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  Jaipur:
    'https://images.unsplash.com/photo-1603288940300-349c21ba681b?auto=format&fit=crop&w=1200&q=80',
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

export function DestinationsSection() {
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);

  useEffect(() => {
    let isMounted = true;
    publicPropertiesApi
      .getDestinations(6)
      .then((res) => {
        if (isMounted && res.data && res.data.length > 0) {
          setDestinations(res.data);
        }
      })
      .catch(() => {
        // Fallback gracefully
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // If loading or no items yet, show static editorial items or skeleton
  const displayDestinations =
    destinations.length > 0
      ? destinations
      : [
          {
            city: 'Manali',
            state: 'Himachal Pradesh',
            country: 'India',
            listingCount: 1,
            minPricePaise: 1850000,
            imageUrl: DESTINATION_FALLBACK_IMAGES['Manali'] || null,
          },
          {
            city: 'Goa',
            state: 'Goa',
            country: 'India',
            listingCount: 1,
            minPricePaise: 2400000,
            imageUrl: DESTINATION_FALLBACK_IMAGES['Goa'] || null,
          },
          {
            city: 'Udaipur',
            state: 'Rajasthan',
            country: 'India',
            listingCount: 1,
            minPricePaise: 3200000,
            imageUrl: DESTINATION_FALLBACK_IMAGES['Udaipur'] || null,
          },
        ];

  return (
    <section className="py-16 bg-[var(--bg-secondary)]/60 border-y border-[var(--border)]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent-primary)] mb-1 block">
            Iconic Escapes
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
            Popular destinations across India
          </h2>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base mt-2">
            Derived from live host listings — from the tranquil river valleys of Himachal Pradesh to
            the heritage retreats of Rajasthan and coastal havens of Goa.
          </p>
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayDestinations.map((dest) => {
            const imageSrc =
              dest.imageUrl || DESTINATION_FALLBACK_IMAGES[dest.city] || DEFAULT_IMAGE;

            const startPriceRupees = paiseToRupees(dest.minPricePaise);

            return (
              <Link
                key={dest.city}
                href={`/stays?destination=${encodeURIComponent(dest.city)}`}
                className="group relative h-80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[var(--border)] flex flex-col justify-end p-6"
              >
                {/* Background Photography */}
                <Image
                  src={imageSrc}
                  alt={`${dest.city}, ${dest.state}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity group-hover:from-black/85" />

                {/* Content */}
                <div className="relative z-10 text-white flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                      <span>{dest.state}</span>
                      <span>•</span>
                      <span>
                        {dest.listingCount} {dest.listingCount === 1 ? 'stay' : 'stays'}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-white mb-1">
                      {dest.city}
                    </h3>
                    <p className="text-xs text-white/90 font-light">
                      From {formatINR(startPriceRupees)} / night
                    </p>
                  </div>

                  {/* Arrow Icon Pill */}
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[var(--text-primary)] transition-all">
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
