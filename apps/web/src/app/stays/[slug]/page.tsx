import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Star,
  MapPin,
  Share2,
  Shield,
  Clock,
  Sparkles,
  ArrowLeft,
  Wifi,
  Wind,
  Flame,
  Mountain,
  Car,
  UtensilsCrossed,
  Waves,
  Laptop,
  Check,
  Calendar,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { publicPropertiesApi } from '@/lib/api';
import { formatPropertyType } from '@/types/property';
import { PropertyGallery } from '@/components/stays/property-gallery';
import { BookingCard } from '@/components/stays/booking-card';
import { PropertyLocationMap } from '@/components/stays/property-location-map';
import { PropertyAiAssistant } from '@/components/stays/property-ai-assistant';
import { PropertyWishlistButton } from '@/components/stays/property-wishlist-button';
import { ContactHostButton } from '@/components/stays/contact-host-button';
import { PropertyReviews } from '@/components/stays/property-reviews';
import { ReportListingButton } from '@/components/stays/report-listing-button';
import { PageContainer } from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await publicPropertiesApi.getBySlug(slug);
  const property = res.data;

  if (!property) {
    return {
      title: 'Stay Not Found | StayScape',
      description: 'The requested accommodation could not be found.',
    };
  }

  const coverUrl = property.images[0]?.url || 'https://stayscape.com/og-image.jpg';
  const descriptionSnippet =
    property.description.slice(0, 155) + (property.description.length > 155 ? '...' : '');

  return {
    title: `${property.title} in ${property.city}, ${property.state} | StayScape`,
    description: descriptionSnippet,
    openGraph: {
      title: `${property.title} | StayScape`,
      description: descriptionSnippet,
      type: 'website',
      images: [
        {
          url: coverUrl,
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await publicPropertiesApi.getBySlug(slug);
  const property = res.data;

  if (!property) {
    notFound();
  }

  // Resolve amenity icons dynamically based on name/slug
  const getAmenityIcon = (nameOrSlug: string) => {
    const lower = nameOrSlug.toLowerCase();
    if (lower.includes('wifi') || lower.includes('wi-fi')) return Wifi;
    if (lower.includes('air') || lower.includes('cooling')) return Wind;
    if (lower.includes('fireplace') || lower.includes('bonfire') || lower.includes('bbq'))
      return Flame;
    if (lower.includes('mountain') || lower.includes('valley')) return Mountain;
    if (lower.includes('parking') || lower.includes('ev')) return Car;
    if (
      lower.includes('chef') ||
      lower.includes('kitchen') ||
      lower.includes('breakfast') ||
      lower.includes('dining')
    )
      return UtensilsCrossed;
    if (
      lower.includes('pool') ||
      lower.includes('sea') ||
      lower.includes('lake') ||
      lower.includes('beach') ||
      lower.includes('tub')
    )
      return Waves;
    if (lower.includes('workspace') || lower.includes('desk')) return Laptop;
    return Check;
  };

  const propertyTypeLabel = formatPropertyType(property.propertyType);

  const rawUrls = (property.images || [])
    .map((img) => img.url)
    .filter((url) => typeof url === 'string' && url.trim().length > 0);

  const galleryImages =
    rawUrls.length > 0
      ? rawUrls
      : [
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        ];

  const hostJoinedYear = property.host.createdAt
    ? new Date(property.host.createdAt).getFullYear()
    : '2025';

  return (
    <div className="py-8">
      <PageContainer>
        {/* Back Link & Breadcrumbs */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all stays</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Share</span>
            </button>
            <PropertyWishlistButton propertyId={property.id} />
          </div>
        </div>

        {/* Property Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent">{propertyTypeLabel}</Badge>
            <Badge variant="default">Verified Listing</Badge>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            {property.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-secondary)]">
            {property.averageRating && property.reviewCount ? (
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border)] px-2.5 py-0.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-[var(--accent-secondary)] text-[var(--accent-secondary)]" />
                <span>{property.averageRating.toFixed(2)}</span>
                <span className="text-[var(--text-secondary)] font-normal">
                  ({property.reviewCount} {property.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>New listing on StayScape</span>
              </div>
            )}
            <span>•</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="font-medium text-[var(--text-primary)]">
                {property.city}, {property.state}, {property.country}
              </span>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mb-12">
          <PropertyGallery images={galleryImages} title={property.title} />
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Main Content (Left Column - 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-12">
            {/* Quick Specs & Host summary */}
            <div className="pb-8 border-b border-[var(--border)] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-1.5">
                  Entire {propertyTypeLabel} hosted by {property.host.displayName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <span>{property.maxGuests} guests</span>
                  <span>•</span>
                  <span>
                    {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                  </span>
                  <span>•</span>
                  <span>{property.beds} beds</span>
                  <span>•</span>
                  <span>
                    {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}
                  </span>
                </div>
              </div>

              {/* Host Avatar */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--border)] shrink-0 bg-[var(--bg-secondary)] flex items-center justify-center">
                {property.host.avatarUrl ? (
                  <Image
                    src={property.host.avatarUrl}
                    alt={property.host.displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-[var(--accent-primary)]">
                    {property.host.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Highlights */}
            <div className="pb-8 border-b border-[var(--border)] space-y-5">
              {property.host.isSuperhost && (
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                      Dedicated Superhost Hospitality
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {property.host.displayName} maintains an exceptional track record of guest
                      hospitality and communication.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Architecturally Curated Space
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Thoughtfully designed with natural materials, ambient lighting, and views
                    integrated into every room.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Check-in: {property.checkInTime} • Check-out: {property.checkOutTime}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Self check-in or personal host greeting arranged prior to arrival.
                  </p>
                </div>
              </div>
            </div>

            {/* Long Editorial Description */}
            <div className="pb-8 border-b border-[var(--border)]">
              <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-4">
                About this space
              </h2>
              <p className="text-[var(--text-primary)]/85 text-base leading-relaxed whitespace-pre-line font-light">
                {property.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="pb-8 border-b border-[var(--border)]">
              <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-6">
                What this place offers
              </h2>
              {property.amenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.amenities.map((amenity) => {
                    const Icon = getAmenityIcon(amenity.slug || amenity.name);
                    return (
                      <div
                        key={amenity.id}
                        className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)]/80"
                      >
                        <Icon className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {amenity.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  Essential amenities included. Contact host for specific requests.
                </p>
              )}
            </div>

            {/* AI Property Fact Assistant */}
            <div className="pb-8 border-b border-[var(--border)]">
              <PropertyAiAssistant propertySlug={property.slug} propertyTitle={property.title} />
            </div>

            {/* House Rules & Policies */}
            <div className="pb-8 border-b border-[var(--border)] space-y-4">
              <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-4">
                Things to know
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[var(--text-secondary)]">
                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)] text-sm">
                    <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Check-in &amp; Check-out</span>
                  </div>
                  <p>Check-in after {property.checkInTime}</p>
                  <p>Checkout before {property.checkOutTime}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]/80">
                    Cancellation policy: {property.cancellationPolicy}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)] text-sm">
                    <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>House Rules</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">
                    {property.houseRules ||
                      'Quiet hours after 10 PM. No commercial filming without prior host consent.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Map Section */}
            <div className="pb-8 border-b border-[var(--border)]">
              <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
                Where you will be
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                {property.city}, {property.state}, {property.country}
              </p>
              <PropertyLocationMap
                latitude={property.latitude}
                longitude={property.longitude}
                city={property.city}
                state={property.state}
                country={property.country}
              />
            </div>

            {/* Host Profile Section */}
            <div className="pb-8 border-b border-[var(--border)] bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center">
                  {property.host.avatarUrl ? (
                    <Image
                      src={property.host.avatarUrl}
                      alt={property.host.displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-[var(--accent-primary)]">
                      {property.host.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                      Hosted by {property.host.displayName}
                    </h2>
                    {property.host.identityVerified && (
                      <BadgeCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {property.host.isSuperhost ? 'Superhost • ' : ''}Hosting on StayScape since{' '}
                    {hostJoinedYear}
                  </p>
                </div>
              </div>

              {property.host.bio && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4 font-light">
                  {property.host.bio}
                </p>
              )}

              {property.host.responseTimeMinutes && (
                <div className="text-xs text-[var(--accent-primary)] font-medium flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Responds within {property.host.responseTimeMinutes} minutes</span>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--text-secondary)]">
                  Have questions before booking?
                </span>
                <ContactHostButton
                  propertySlug={property.slug}
                  hostName={property.host.displayName}
                />
              </div>
            </div>

            {/* Reviews Section */}
            <PropertyReviews propertySlug={property.slug} propertyTitle={property.title} />
          </div>

          {/* Right Column (Sticky Booking Summary Card) */}
          <div className="lg:col-span-1 space-y-4">
            <BookingCard
              propertySlug={property.slug}
              pricePerNightPaise={property.pricePerNightPaise}
              maxGuests={property.maxGuests}
            />

            <div className="p-4 rounded-2xl bg-white border border-[var(--border)] text-center shadow-sm">
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Want to ask the host about this stay?
              </p>
              <ContactHostButton
                propertySlug={property.slug}
                hostName={property.host.displayName}
                className="w-full justify-center"
              />
            </div>

            <ReportListingButton propertyId={property.id} propertyTitle={property.title} />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
