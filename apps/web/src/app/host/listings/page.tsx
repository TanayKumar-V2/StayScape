'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Home as HomeIcon,
  Search,
  MapPin,
  Edit3,
  CheckCircle2,
  PauseCircle,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { HostHeader } from '@/components/host/host-header';
import { useAuth } from '@/context/auth-context';
import { propertiesApi } from '@/lib/api';
import type { HostProperty } from '@/types/host';

export default function HostListingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [listings, setListings] = useState<HostProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/host/listings');
      } else if (!user?.isHost) {
        router.replace('/host/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const fetchListings = useCallback(async () => {
    if (!isAuthenticated || !user?.isHost) return;
    setLoading(true);
    setError(null);

    const statusParam = activeTab === 'ALL' ? undefined : activeTab;
    const res = await propertiesApi.list({
      status: statusParam,
      search: searchQuery.trim() || undefined,
    });

    if (res.data) {
      setListings(res.data.data);
    } else {
      setError(res.error ?? 'Failed to load property listings');
    }
    setLoading(false);
  }, [isAuthenticated, user, activeTab, searchQuery]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const handlePublish = async (id: string) => {
    setActionError(null);
    setActionInProgress(id);
    const res = await propertiesApi.publish(id);
    if (res.error) {
      setActionError(res.error);
    } else {
      await fetchListings();
    }
    setActionInProgress(null);
  };

  const handlePause = async (id: string) => {
    setActionError(null);
    setActionInProgress(id);
    const res = await propertiesApi.pause(id);
    if (res.error) {
      setActionError(res.error);
    } else {
      await fetchListings();
    }
    setActionInProgress(null);
  };

  const handleUnpause = async (id: string) => {
    setActionError(null);
    setActionInProgress(id);
    const res = await propertiesApi.unpause(id);
    if (res.error) {
      setActionError(res.error);
    } else {
      await fetchListings();
    }
    setActionInProgress(null);
  };

  const handleArchive = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to archive this property? Archived listings cannot be unarchived.',
      )
    ) {
      return;
    }
    setActionError(null);
    setActionInProgress(id);
    const res = await propertiesApi.archive(id);
    if (res.error) {
      setActionError(res.error);
    } else {
      await fetchListings();
    }
    setActionInProgress(null);
  };

  const formatINR = (paise: number) => {
    const rupees = Math.round(paise / 100);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Listings' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'DRAFT', label: 'Drafts' },
    { id: 'PAUSED', label: 'Paused' },
    { id: 'ARCHIVED', label: 'Archived' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <HostHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              My Property Listings
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Review, update, and control the lifecycle of all your StayScape properties.
            </p>
          </div>

          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Listing</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{actionError}</div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--text-primary)] text-white shadow-sm'
                    : 'bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, city..."
              className="w-full pl-9 pr-4 py-2 rounded-full border border-[var(--border)] bg-white text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
        </div>

        {/* Listings Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((property) => {
              const coverImg = property.images?.find((img) => img.isCover) ?? property.images?.[0];
              const isWorking = actionInProgress === property.id;

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative h-48 w-full bg-[var(--bg-secondary)]">
                      {coverImg ? (
                        <Image
                          src={coverImg.secureUrl}
                          alt={property.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/60">
                          <HomeIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs">No photos uploaded</span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm ${
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

                      <div className="absolute top-3 right-3">
                        <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/90 text-[var(--text-primary)] backdrop-blur-md shadow-sm">
                          {property.propertyType}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>
                            {property.city}, {property.state}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] line-clamp-1">
                          {property.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border)]">
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {property.maxGuests}
                          </span>{' '}
                          guests
                        </div>
                        <div>•</div>
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {property.bedrooms}
                          </span>{' '}
                          beds
                        </div>
                        <div>•</div>
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {property.images?.length ?? 0}
                          </span>{' '}
                          photos
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatINR(property.pricePerNightPaise)}
                        <span className="font-normal text-xs text-[var(--text-secondary)]">
                          {' '}
                          / night
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                      <Link
                        href={`/host/listings/${property.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-xs font-semibold text-[var(--text-primary)] transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Edit Listing</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {property.status === 'DRAFT' && (
                          <button
                            disabled={isWorking}
                            onClick={() => handlePublish(property.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        )}

                        {property.status === 'PUBLISHED' && (
                          <button
                            disabled={isWorking}
                            onClick={() => handlePause(property.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-600 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        )}

                        {property.status === 'PAUSED' && (
                          <button
                            disabled={isWorking}
                            onClick={() => handleUnpause(property.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Re-activate</span>
                          </button>
                        )}

                        {property.status !== 'ARCHIVED' && (
                          <button
                            disabled={isWorking}
                            onClick={() => handleArchive(property.id)}
                            title="Archive listing"
                            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[var(--border)] p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mx-auto flex items-center justify-center mb-4">
              <HomeIcon className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
              No listings found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              {searchQuery || activeTab !== 'ALL'
                ? 'No property listings match your selected filter or search criteria.'
                : 'You have not added any listings yet. Create a draft to get started.'}
            </p>
            <Link
              href="/host/listings/new"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Listing</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
