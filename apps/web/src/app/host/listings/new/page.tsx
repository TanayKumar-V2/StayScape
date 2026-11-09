'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Star,
  UploadCloud,
} from 'lucide-react';
import { HostHeader } from '@/components/host/host-header';
import { useAuth } from '@/context/auth-context';
import { amenitiesApi, propertiesApi } from '@/lib/api';
import type { GroupedAmenities, HostProperty, PropertyImage, PropertyType } from '@/types/host';

// Dynamic import for Leaflet map component to prevent SSR window reference
const LocationMap = dynamic(() => import('@/components/host/location-map'), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center text-xs text-[var(--text-secondary)] animate-pulse">
      Loading interactive map...
    </div>
  ),
});

const PROPERTY_TYPES: Array<{ type: PropertyType; label: string; desc: string }> = [
  { type: 'CABIN', label: 'Cabin', desc: 'Rustic or alpine retreat nestled in nature' },
  { type: 'VILLA', label: 'Villa', desc: 'Spacious luxury home with private outdoor amenities' },
  { type: 'APARTMENT', label: 'Apartment', desc: 'Modern flat or loft in a city or town' },
  { type: 'HOMESTAY', label: 'Homestay', desc: 'Warm local residence hosted with authentic care' },
  { type: 'HOUSE', label: 'Entire House', desc: 'Standalone home with complete privacy' },
  { type: 'GUESTHOUSE', label: 'Guesthouse', desc: 'Dedicated guest cottage or carriage house' },
  { type: 'HOTEL', label: 'Boutique Hotel', desc: 'Curated rooms with hospitality staff' },
  { type: 'OTHER', label: 'Unique Stay', desc: 'Treehouse, geodesic dome, houseboat, or tent' },
];

const PRESET_RULES = [
  'No smoking inside',
  'Quiet hours after 10 PM',
  'Pets allowed with prior notice',
  'No parties or commercial events',
  'Remove footwear at entryway',
  'Government ID required at check-in',
];

export default function NewListingWizardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [createdProperty, setCreatedProperty] = useState<HostProperty | null>(null);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('CABIN');

  // Step 2: Location
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Step 3: Capacity
  const [maxGuests, setMaxGuests] = useState<number>(4);
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [beds, setBeds] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);

  // Step 4: Pricing & Rules
  const [priceInRupees, setPriceInRupees] = useState<number>(4500);
  const [cleaningFeeInRupees, setCleaningFeeInRupees] = useState<number>(500);
  const [checkInFrom, setCheckInFrom] = useState('14:00');
  const [checkOutUntil, setCheckOutUntil] = useState('11:00');
  const [selectedRules, setSelectedRules] = useState<string[]>([
    'No smoking inside',
    'Quiet hours after 10 PM',
  ]);
  const [customRuleInput, setCustomRuleInput] = useState('');

  // Step 5: Amenities
  const [amenitiesData, setAmenitiesData] = useState<GroupedAmenities | null>(null);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);

  // Step 6: Photos
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // General UI states
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/host/listings/new');
      } else if (!user?.isHost) {
        router.replace('/host/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Load amenities catalog
  useEffect(() => {
    async function loadAmenities() {
      const res = await amenitiesApi.getAll();
      if (res.data) {
        setAmenitiesData(res.data);
      }
    }
    void loadAmenities();
  }, []);

  const toggleRule = (rule: string) => {
    if (selectedRules.includes(rule)) {
      setSelectedRules(selectedRules.filter((r) => r !== rule));
    } else {
      setSelectedRules([...selectedRules, rule]);
    }
  };

  const addCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRuleInput.trim();
    if (trimmed && !selectedRules.includes(trimmed)) {
      setSelectedRules([...selectedRules, trimmed]);
      setCustomRuleInput('');
    }
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenityIds.includes(id)) {
      setSelectedAmenityIds(selectedAmenityIds.filter((item) => item !== id));
    } else {
      setSelectedAmenityIds([...selectedAmenityIds, id]);
    }
  };

  // Validations per step
  const validateStep = (currentStep: number): boolean => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 5) {
        setErrorMessage('Property title must be at least 5 characters long.');
        return false;
      }
      if (!description.trim() || description.trim().length < 20) {
        setErrorMessage('Property description must be at least 20 characters long.');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (
        !addressLine1.trim() ||
        !city.trim() ||
        !state.trim() ||
        !country.trim() ||
        !postalCode.trim()
      ) {
        setErrorMessage('Please complete all required address fields.');
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (maxGuests < 1 || beds < 1 || bathrooms < 1) {
        setErrorMessage('Capacity must allow at least 1 guest, 1 bed, and 1 bathroom.');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      if (!priceInRupees || priceInRupees < 100) {
        setErrorMessage('Nightly price must be at least ₹100.');
        return false;
      }
      return true;
    }

    if (currentStep === 5) {
      if (selectedAmenityIds.length === 0) {
        setErrorMessage('Please select at least one amenity before proceeding.');
        return false;
      }
      return true;
    }

    return true;
  };

  // Persists draft to API when stepping from 5 to 6 or explicitly clicking "Save Draft"
  const saveOrUpdateDraft = async (): Promise<HostProperty | null> => {
    setSavingDraft(true);
    setErrorMessage(null);

    const pricePerNightPaise = Math.round(priceInRupees * 100);
    const cleaningFeePaise = Math.round((cleaningFeeInRupees || 0) * 100);

    const payload = {
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
      houseRules: selectedRules,
      checkInFrom,
      checkOutUntil,
      amenityIds: selectedAmenityIds,
    };

    try {
      if (createdProperty) {
        // Update existing draft
        const res = await propertiesApi.update(createdProperty.id, payload);
        if (res.data) {
          setCreatedProperty(res.data);
          setPropertyImages(res.data.images ?? []);
          setSavingDraft(false);
          return res.data;
        } else {
          setErrorMessage(res.error ?? 'Failed to update property draft');
          setSavingDraft(false);
          return null;
        }
      } else {
        // Create new draft
        const res = await propertiesApi.create(payload);
        if (res.data) {
          setCreatedProperty(res.data);
          setPropertyImages(res.data.images ?? []);
          setSavingDraft(false);
          return res.data;
        } else {
          setErrorMessage(res.error ?? 'Failed to save property draft');
          setSavingDraft(false);
          return null;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      setErrorMessage(msg);
      setSavingDraft(false);
      return null;
    }
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step === 5) {
      // Transition to photo upload: persist draft in Neon DB to obtain propertyId
      const prop = await saveOrUpdateDraft();
      if (!prop) return; // error shown by saveOrUpdateDraft
      setStep(6);
      return;
    }

    setStep(step + 1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !createdProperty) return;

    setUploadingImages(true);
    setErrorMessage(null);

    const fileList = Array.from(files);
    const res = await propertiesApi.uploadImages(createdProperty.id, fileList);

    if (res.data) {
      // Refresh property data
      const propRes = await propertiesApi.getById(createdProperty.id);
      if (propRes.data) {
        setCreatedProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    } else {
      setErrorMessage(res.error ?? 'Failed to upload images');
    }

    setUploadingImages(false);
    // Reset input
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!createdProperty) return;
    const res = await propertiesApi.deleteImage(createdProperty.id, imageId);
    if (!res.error) {
      const propRes = await propertiesApi.getById(createdProperty.id);
      if (propRes.data) {
        setCreatedProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    }
  };

  const handleSetCover = async (imageId: string) => {
    if (!createdProperty) return;
    const res = await propertiesApi.setCoverImage(createdProperty.id, imageId);
    if (res.data) {
      const propRes = await propertiesApi.getById(createdProperty.id);
      if (propRes.data) {
        setCreatedProperty(propRes.data);
        setPropertyImages(propRes.data.images ?? []);
      }
    }
  };

  const handlePublish = async () => {
    if (!createdProperty) return;
    setPublishing(true);
    setErrorMessage(null);

    const res = await propertiesApi.publish(createdProperty.id);

    if (res.error) {
      setErrorMessage(res.error);
      setPublishing(false);
      return;
    }

    // Success! Redirect to listings
    router.push('/host/listings');
  };

  const stepLabels = ['Basics', 'Location', 'Capacity', 'Pricing', 'Amenities', 'Photos & Publish'];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <HostHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb & Step Navigation Header */}
        <div className="mb-8">
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Listings</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-[var(--accent-primary)]">
                Step {step} of 6 — {stepLabels[step - 1]}
              </span>
              <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] mt-1">
                {step === 1 && 'Tell us about your place'}
                {step === 2 && 'Where is your property located?'}
                {step === 3 && 'How many guests can you accommodate?'}
                {step === 4 && 'Set pricing and house rules'}
                {step === 5 && 'What amenities do you offer?'}
                {step === 6 && 'Add photos and publish your listing'}
              </h1>
            </div>

            {createdProperty && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-200 self-start sm:self-auto">
                Draft Saved
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden mt-6">
            <div
              className="bg-[var(--accent-primary)] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Wizard Form Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[var(--border)] shadow-sm">
          {/* ── STEP 1: BASICS ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  Property Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PROPERTY_TYPES.map((pt) => {
                    const isSelected = propertyType === pt.type;
                    return (
                      <button
                        type="button"
                        key={pt.type}
                        onClick={() => setPropertyType(pt.type)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 ring-2 ring-[var(--accent-primary)]'
                            : 'border-[var(--border)] bg-white hover:border-[var(--accent-primary)]/50'
                        }`}
                      >
                        <div className="font-semibold text-sm text-[var(--text-primary)]">
                          {pt.label}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                          {pt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Listing Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Secluded Cedar Cabin with Mountain Views"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white text-sm"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1">
                  <span>Catchy, descriptive title highlighting unique character</span>
                  <span>{title.length}/120</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Detailed Description *
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  placeholder="Describe the experience, architectural highlights, surrounding nature, views, and interior comforts..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white text-sm"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1">
                  <span>Minimum 20 characters required</span>
                  <span>{description.length}/5000</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: LOCATION ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Address Line 1 (Street / House / Building) *
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. 14 Apple Orchard Lane"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Address Line 2 (Landmark, Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="e.g. Near Old Vashisht Temple"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Manali"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    State / Region *
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Himachal Pradesh"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Postal / PIN Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 175103"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>
              </div>

              {/* Map Picker */}
              <div className="pt-4 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Pinpoint Exact Coordinates (OpenStreetMap)
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
          )}

          {/* ── STEP 3: CAPACITY ───────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      Max Guests
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Total people allowed</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={maxGuests <= 1}
                      onClick={() => setMaxGuests(Math.max(1, maxGuests - 1))}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-semibold text-base w-6 text-center">{maxGuests}</span>
                    <button
                      type="button"
                      onClick={() => setMaxGuests(maxGuests + 1)}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">Bedrooms</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Dedicated bedrooms (0 = studio)
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={bedrooms <= 0}
                      onClick={() => setBedrooms(Math.max(0, bedrooms - 1))}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-semibold text-base w-6 text-center">{bedrooms}</span>
                    <button
                      type="button"
                      onClick={() => setBedrooms(bedrooms + 1)}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">Beds</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Total sleeping beds available
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={beds <= 1}
                      onClick={() => setBeds(Math.max(1, beds - 1))}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-semibold text-base w-6 text-center">{beds}</span>
                    <button
                      type="button"
                      onClick={() => setBeds(beds + 1)}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      Bathrooms
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Full & half bathrooms
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={bathrooms <= 1}
                      onClick={() => setBathrooms(Math.max(1, bathrooms - 1))}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-semibold text-base w-6 text-center">{bathrooms}</span>
                    <button
                      type="button"
                      onClick={() => setBathrooms(bathrooms + 1)}
                      className="w-9 h-9 rounded-full border border-[var(--border)] bg-white text-base font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: PRICING & RULES ────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Nightly Rate (INR ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      value={priceInRupees}
                      onChange={(e) => setPriceInRupees(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Stored accurately in database as integer paise (₹
                    {priceInRupees.toLocaleString('en-IN')})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Cleaning Fee (INR ₹, Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={cleaningFeeInRupees}
                      onChange={(e) => setCleaningFeeInRupees(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Check-in Time (From)
                  </label>
                  <input
                    type="time"
                    value={checkInFrom}
                    onChange={(e) => setCheckInFrom(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                    Check-out Time (Until)
                  </label>
                  <input
                    type="time"
                    value={checkOutUntil}
                    onChange={(e) => setCheckOutUntil(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                </div>
              </div>

              {/* House Rules */}
              <div className="pt-4 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  House Rules
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_RULES.map((rule) => {
                    const isSelected = selectedRules.includes(rule);
                    return (
                      <button
                        type="button"
                        key={rule}
                        onClick={() => toggleRule(rule)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {rule}
                      </button>
                    );
                  })}
                </div>

                {/* Custom rule input */}
                <form onSubmit={addCustomRule} className="flex gap-2">
                  <input
                    type="text"
                    value={customRuleInput}
                    onChange={(e) => setCustomRuleInput(e.target.value)}
                    placeholder="Add a custom house rule..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[var(--text-primary)] hover:bg-[#383d35] text-white text-xs font-medium transition-colors"
                  >
                    Add Rule
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── STEP 5: AMENITIES ──────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <p className="text-xs text-[var(--text-secondary)]">
                Select all features available for guests. At least 1 amenity is required to publish.
              </p>

              {amenitiesData ? (
                <div className="space-y-6">
                  {amenitiesData.categories.map((category) => {
                    const items = amenitiesData.grouped[category] ?? [];
                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                          {category}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {items.map((item) => {
                            const isChecked = selectedAmenityIds.includes(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => toggleAmenity(item.id)}
                                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                  isChecked
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]'
                                    : 'border-[var(--border)] bg-[var(--bg-primary)] hover:bg-white'
                                }`}
                              >
                                <span className="text-xs font-medium text-[var(--text-primary)]">
                                  {item.name}
                                </span>
                                {isChecked && (
                                  <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: PHOTOS & PUBLISH ───────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-6">
              {/* Photo Upload Card */}
              <div className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] rounded-3xl p-8 text-center bg-[var(--bg-primary)] transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploadingImages}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      Click to upload photos
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] block mt-1">
                      JPEG, PNG, WebP, or AVIF (up to 10MB each)
                    </span>
                  </div>
                </label>
              </div>

              {uploadingImages && (
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--accent-primary)] py-2">
                  <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                  <span>Uploading photos to Cloudinary...</span>
                </div>
              )}

              {/* Uploaded Gallery Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Property Gallery ({propertyImages.length} uploaded)
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      propertyImages.length >= 5
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {propertyImages.length >= 5
                      ? '✓ Publishing requirement satisfied'
                      : `${5 - propertyImages.length} more needed to publish`}
                  </span>
                </div>

                {propertyImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {propertyImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative rounded-2xl overflow-hidden border border-[var(--border)] group aspect-video bg-[var(--bg-secondary)]"
                      >
                        <Image
                          src={img.secureUrl}
                          alt={img.altText ?? 'Property photo'}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />

                        {/* Badges & Actions */}
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
                              Set as cover
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          title="Delete photo"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded-2xl border border-[var(--border)]">
                    No images uploaded yet. Upload at least 5 photos to satisfy StayScape publishing
                    criteria.
                  </div>
                )}
              </div>

              {/* Publishing Readiness Checklist */}
              <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  Publishing Readiness Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${title.length >= 5 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>Title (5+ characters)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${description.length >= 20 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>Description (20+ characters)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${addressLine1 && city ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>Complete location details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${priceInRupees >= 100 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>Nightly price set (min ₹100)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${selectedAmenityIds.length >= 1 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>At least 1 amenity selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${propertyImages.length >= 5 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}
                    />
                    <span>At least 5 photographs uploaded</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Footer */}
          <div className="pt-6 border-t border-[var(--border)] mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step < 6 ? (
                <>
                  <button
                    type="button"
                    disabled={savingDraft}
                    onClick={async () => {
                      if (validateStep(step)) {
                        await saveOrUpdateDraft();
                      }
                    }}
                    className="px-4 py-2.5 rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    type="button"
                    disabled={savingDraft}
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/host/listings"
                    className="px-4 py-2.5 rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    Finish Later (Keep Draft)
                  </Link>

                  <button
                    type="button"
                    disabled={publishing || propertyImages.length < 5}
                    onClick={handlePublish}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    {publishing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Publish Listing Now</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
