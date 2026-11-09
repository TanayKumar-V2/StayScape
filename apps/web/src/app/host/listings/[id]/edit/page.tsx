'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Star,
  UploadCloud,
  Save,
  PauseCircle,
  Archive,
} from 'lucide-react';
import { HostHeader } from '@/components/host/host-header';
import { useAuth } from '@/context/auth-context';
import { amenitiesApi, propertiesApi } from '@/lib/api';
import type { GroupedAmenities, HostProperty, PropertyImage, PropertyType } from '@/types/host';

const LocationMap = dynamic(() => import('@/components/host/location-map'), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] animate-pulse">
      Loading interactive map...
    </div>
  ),
});

const PROPERTY_TYPES: Array<{ type: PropertyType; label: string }> = [
  { type: 'CABIN', label: 'Cabin' },
  { type: 'VILLA', label: 'Villa' },
  { type: 'APARTMENT', label: 'Apartment' },
  { type: 'HOMESTAY', label: 'Homestay' },
  { type: 'HOUSE', label: 'Entire House' },
  { type: 'GUESTHOUSE', label: 'Guesthouse' },
  { type: 'HOTEL', label: 'Boutique Hotel' },
  { type: 'OTHER', label: 'Unique Stay' },
];

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id;

  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [property, setProperty] = useState<HostProperty | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [amenitiesData, setAmenitiesData] = useState<GroupedAmenities | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('CABIN');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [maxGuests, setMaxGuests] = useState<number>(4);
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [beds, setBeds] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [priceInRupees, setPriceInRupees] = useState<number>(4500);
  const [cleaningFeeInRupees, setCleaningFeeInRupees] = useState<number>(500);
  const [checkInFrom, setCheckInFrom] = useState('14:00');
  const [checkOutUntil, setCheckOutUntil] = useState('11:00');
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);

  // Action states
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace(`/login?redirect=/host/listings/${propertyId}/edit`);
      } else if (!user?.isHost) {
        router.replace('/host/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, user, router, propertyId]);

  // Load property details
  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated || !user?.isHost) return;
      setLoadingProperty(true);

      const [propRes, amRes] = await Promise.all([
        propertiesApi.getById(propertyId),
        amenitiesApi.getAll(),
      ]);

      if (amRes.data) {
        setAmenitiesData(amRes.data);
      }

      if (propRes.data) {
        const p = propRes.data;
        setProperty(p);
        setTitle(p.title);
        setDescription(p.description);
        setPropertyType(p.propertyType);
        setAddressLine1(p.addressLine1);
        setAddressLine2(p.addressLine2 ?? '');
        setCity(p.city);
        setState(p.state);
        setCountry(p.country);
        setPostalCode(p.postalCode);
        setLatitude(p.latitude !== undefined && p.latitude !== null ? Number(p.latitude) : null);
        setLongitude(
          p.longitude !== undefined && p.longitude !== null ? Number(p.longitude) : null,
        );
        setMaxGuests(p.maxGuests);
        setBedrooms(p.bedrooms);
        setBeds(p.beds);
        setBathrooms(p.bathrooms);
        setPriceInRupees(Math.round(p.pricePerNightPaise / 100));
        setCleaningFeeInRupees(Math.round((p.cleaningFeePaise || 0) / 100));
        setCheckInFrom(p.checkInFrom ?? '14:00');
        setCheckOutUntil(p.checkOutUntil ?? '11:00');
        setHouseRules(p.houseRules ?? []);
        setSelectedAmenityIds(p.amenities?.map((a) => a.amenityId) ?? []);
        setPropertyImages(p.images ?? []);
      } else {
        setErrorMessage(propRes.error ?? 'Listing not found or access denied');
      }

      setLoadingProperty(false);
    }

    if (isAuthenticated && user?.isHost) {
      void loadData();
    }
  }, [propertyId, isAuthenticated, user]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const pricePerNightPaise = Math.round(priceInRupees * 100);
    const cleaningFeePaise = Math.round((cleaningFeeInRupees || 0) * 100);

    const res = await propertiesApi.update(propertyId, {
      title: title.trim(),
      description: description.trim(),
      propertyType,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      maxGuests,
      bedrooms,
      beds,
      bathrooms,
      pricePerNightPaise,
      cleaningFeePaise,
      houseRules,
      checkInFrom,
      checkOutUntil,
      amenityIds: selectedAmenityIds,
    });

    if (res.data) {
      setProperty(res.data);
      setSuccessMessage('Listing details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error ?? 'Failed to update listing');
    }

    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setErrorMessage(null);

    const res = await propertiesApi.uploadImages(propertyId, Array.from(files));
    if (res.data) {
      const propRes = await propertiesApi.getById(propertyId);
      if (propRes.data) {
        setProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    } else {
      setErrorMessage(res.error ?? 'Failed to upload images');
    }

    setUploadingImages(false);
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId: string) => {
    const res = await propertiesApi.deleteImage(propertyId, imageId);
    if (!res.error) {
      const propRes = await propertiesApi.getById(propertyId);
      if (propRes.data) {
        setProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    }
  };

  const handleSetCover = async (imageId: string) => {
    const res = await propertiesApi.setCoverImage(propertyId, imageId);
    if (res.data) {
      const propRes = await propertiesApi.getById(propertyId);
      if (propRes.data) {
        setProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    }
  };

  const handlePublish = async () => {
    setErrorMessage(null);
    const res = await propertiesApi.publish(propertyId);
    if (res.data) {
      setProperty(res.data);
      setSuccessMessage('Listing published successfully!');
    } else {
      setErrorMessage(res.error ?? 'Publishing criteria not met');
    }
  };

  const handlePause = async () => {
    setErrorMessage(null);
    const res = await propertiesApi.pause(propertyId);
    if (res.data) {
      setProperty(res.data);
      setSuccessMessage('Listing paused.');
    } else {
      setErrorMessage(res.error ?? 'Failed to pause');
    }
  };

  const handleUnpause = async () => {
    setErrorMessage(null);
    const res = await propertiesApi.unpause(propertyId);
    if (res.data) {
      setProperty(res.data);
      setSuccessMessage('Listing re-activated!');
    } else {
      setErrorMessage(res.error ?? 'Failed to unpause');
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure? Archiving permanently removes this listing from active hosting.')) {
      return;
    }
    const res = await propertiesApi.archive(propertyId);
    if (res.data) {
      router.push('/host/listings');
    } else {
      setErrorMessage(res.error ?? 'Failed to archive');
    }
  };

  if (loadingProperty) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <HostHeader />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <HostHeader />
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
          <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-3">
            Listing not found
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            This listing does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-white text-xs font-semibold"
          >
            Return to My Listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <HostHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/host/listings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Listings</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)]">
                Edit Listing
              </h1>
              <span
                className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${
                  property.status === 'PUBLISHED'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : property.status === 'DRAFT'
                      ? 'bg-amber-600 text-white'
                      : property.status === 'PAUSED'
                        ? 'bg-zinc-600 text-white'
                        : 'bg-red-700 text-white'
                }`}
              >
                {property.status}
              </span>
            </div>
          </div>

          {/* Quick status actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {property.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handlePublish}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Listing</span>
              </button>
            )}

            {property.status === 'PUBLISHED' && (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-600 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Pause Listing</span>
              </button>
            )}

            {property.status === 'PAUSED' && (
              <button
                type="button"
                onClick={handleUnpause}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Re-activate Listing</span>
              </button>
            )}

            {property.status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleArchive}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm mb-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
            <div>{successMessage}</div>
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-5">
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              Listing Overview
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.type} value={pt.type}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Map */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-5">
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">Location</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                OpenStreetMap Coordinates
              </label>
              <LocationMap
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </div>
          </div>

          {/* Section 3: Capacity & Pricing */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-5">
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              Capacity & Pricing
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Max Guests
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Beds
                </label>
                <input
                  type="number"
                  min={1}
                  value={beds}
                  onChange={(e) => setBeds(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  min={1}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Nightly Rate (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={100}
                    value={priceInRupees}
                    onChange={(e) => setPriceInRupees(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Cleaning Fee (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={cleaningFeeInRupees}
                    onChange={(e) => setCleaningFeeInRupees(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Photographs */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                  Photo Gallery
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  At least 5 photos are required to keep the listing published.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  id="edit-upload"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploadingImages}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="edit-upload"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{uploadingImages ? 'Uploading...' : 'Upload Photos'}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {propertyImages.map((img) => (
                <div
                  key={img.id}
                  className="relative rounded-2xl overflow-hidden border border-[var(--border)] group aspect-video bg-[var(--bg-secondary)]"
                >
                  <Image
                    src={img.secureUrl}
                    alt="Listing"
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />

                  <div className="absolute top-2 left-2">
                    {img.isCover ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white shadow-sm">
                        <Star className="w-3 h-3 fill-white" />
                        <span>Cover</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(img.id)}
                        className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                      >
                        Set cover
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Amenities */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm space-y-5">
            <h2 className="font-serif text-xl font-bold text-[var(--text-primary)]">Amenities</h2>

            {amenitiesData && (
              <div className="space-y-4">
                {amenitiesData.categories.map((cat) => (
                  <div key={cat} className="space-y-2">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                      {cat}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {amenitiesData.grouped[cat]?.map((item) => {
                        const isChecked = selectedAmenityIds.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedAmenityIds(
                                  selectedAmenityIds.filter((id) => id !== item.id),
                                );
                              } else {
                                setSelectedAmenityIds([...selectedAmenityIds, item.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                              isChecked
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 font-semibold text-[var(--text-primary)]'
                                : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{item.name}</span>
                            {isChecked && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Save Bar */}
          <div className="sticky bottom-6 p-4 rounded-2xl bg-white border border-[var(--border)] shadow-xl flex items-center justify-between z-30">
            <span className="text-xs text-[var(--text-secondary)]">
              Make sure to save changes before leaving this page.
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
