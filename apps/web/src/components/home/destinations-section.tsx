'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { publicPropertiesApi } from '@/lib/api';
import { DestinationSummary, paiseToRupees } from '@/types/property';
import { formatINR } from '@/lib/utils';
import { ScrollReveal } from './scroll-reveal';

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
    <section className="bg-[#e9e7de] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        {/* Section Header */}
        <ScrollReveal className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end lg:mb-16">
          <div>
            <span className="mb-4 block text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a684b]">
              02 — Choose your setting
            </span>
            <h2 className="home-display max-w-[13ch] text-4xl leading-[.98] text-[#23342b] sm:text-5xl lg:text-6xl">
              India, one feeling at a time.
            </h2>
          </div>
          <p className="max-w-[340px] text-sm leading-7 text-[#697268]">
            Derived from live host listings — from the tranquil river valleys of Himachal Pradesh to
            the heritage retreats of Rajasthan and coastal havens of Goa.
          </p>
        </ScrollReveal>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-flow-row-dense lg:grid-cols-12 lg:gap-5">
          {displayDestinations.map((dest, index) => {
            const imageSrc =
              dest.imageUrl || DESTINATION_FALLBACK_IMAGES[dest.city] || DEFAULT_IMAGE;

            const startPriceRupees = paiseToRupees(dest.minPricePaise);

            return (
              <ScrollReveal
                key={dest.city}
                className={`relative min-h-[330px] ${
                  index === 0
                    ? 'lg:col-span-7 lg:row-span-2 lg:min-h-[620px]'
                    : index < 3
                      ? 'lg:col-span-5 lg:min-h-[302px]'
                      : 'lg:col-span-4 lg:min-h-[310px]'
                }`}
                delay={(index % 3) * 0.07}
              >
                <Link
                  href={`/stays?destination=${encodeURIComponent(dest.city)}`}
                  className={`group absolute inset-0 flex flex-col justify-end overflow-hidden rounded-[1.8rem] p-6 ring-1 ring-white/45 transition-transform duration-700 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-1 sm:p-7 ${index === 0 ? 'lg:p-9' : ''}`}
                >
                  {/* Background Photography */}
                  <Image
                    src={imageSrc}
                    alt={`${dest.city}, ${dest.state}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.045]"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14261e]/85 via-[#172a21]/18 to-transparent transition-opacity duration-700 group-hover:from-[#14261e]/90" />

                  {/* Content */}
                  <div className="relative z-10 flex items-end justify-between text-white">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.14em] text-white/75">
                        <span>{dest.state}</span>
                        <span>•</span>
                        <span>
                          {dest.listingCount} {dest.listingCount === 1 ? 'stay' : 'stays'}
                        </span>
                      </div>
                      <h3 className="home-display mb-1 text-3xl leading-none text-white sm:text-4xl">
                        {dest.city}
                      </h3>
                      <p className="mt-2 text-xs text-white/85">
                        From {formatINR(startPriceRupees)} / night
                      </p>
                    </div>

                    {/* Arrow Icon Pill */}
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[var(--text-primary)] transition-all">
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
