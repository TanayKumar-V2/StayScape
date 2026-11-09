'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Home as HomeIcon,
  CheckCircle2,
  Clock,
  PauseCircle,
  ArrowRight,
  Calendar,
  IndianRupee,
  MapPin,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import { HostHeader } from '@/components/host/host-header';
import { useAuth } from '@/context/auth-context';
import { hostApi } from '@/lib/api';
import type { HostDashboardStats } from '@/types/host';

export default function HostDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [stats, setStats] = useState<HostDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/host');
      } else if (!user?.isHost) {
        router.replace('/host/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    async function loadDashboard() {
      if (!isAuthenticated || !user?.isHost) return;
      setLoadingStats(true);
      setError(null);

      const res = await hostApi.getDashboard();
      if (res.data) {
        setStats(res.data);
      } else {
        setError(res.error ?? 'Failed to load host dashboard');
      }
      setLoadingStats(false);
    }

    if (isAuthenticated && user?.isHost) {
      void loadDashboard();
    }
  }, [isAuthenticated, user]);

  if (isLoading || loadingStats) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <HostHeader />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const formatINR = (paise: number) => {
    const rupees = Math.round(paise / 100);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <HostHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--accent-primary)]">
              Host Operations
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mt-1">
              {user?.hostProfile?.displayName ?? `${user?.firstName}'s Stays`}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage your properties, monitor status, and review real-time listing health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/host/listings/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Listing</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm mb-8">
            {error}
          </div>
        )}

        {/* Real Neon DB Stats Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total</span>
              <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[var(--text-primary)]">
              {stats?.totalProperties ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
              all properties
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Published</span>
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[var(--accent-primary)]">
              {stats?.publishedCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
              active on market
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Drafts</span>
              <Clock className="w-4 h-4 text-[var(--accent-secondary)]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[var(--accent-secondary)]">
              {stats?.draftCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">in creation</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Paused</span>
              <PauseCircle className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[var(--text-secondary)]">
              {stats?.pausedCount ?? 0}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">
              temporarily off
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Bookings</span>
              <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[var(--text-primary)]">
              {stats?.totalBookings ?? 0}
            </div>
            <span className="text-[10px] uppercase font-semibold text-[var(--accent-primary)] mt-1 block">
              Phase 6 Engine
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Earnings</span>
              <IndianRupee className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <div className="font-serif text-2xl font-bold text-[var(--text-primary)]">
              {formatINR(stats?.totalEarningsPaise ?? 0)}
            </div>
            <span className="text-[10px] uppercase font-semibold text-[var(--accent-primary)] mt-1 block">
              Phase 7 Razorpay
            </span>
          </div>
        </div>

        {/* Guest Communications & Real-Time Inbox Card */}
        <div className="mb-10 p-6 rounded-3xl bg-white border border-[var(--border)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                Guest Inquiries &amp; Messages
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Chat in real-time with prospective travelers and confirmed guests regarding bookings
                and property details.
              </p>
            </div>
          </div>
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--text-primary)] text-white hover:bg-black text-xs font-semibold transition-colors shadow-sm shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Messages Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Listings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
              Recent Listings
            </h2>
            {stats && stats.totalProperties > 0 && (
              <Link
                href="/host/listings"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                <span>View all ({stats.totalProperties})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {stats && stats.recentProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.recentProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
                >
                  <div className="relative h-48 w-full bg-[var(--bg-secondary)]">
                    {property.coverImageUrl ? (
                      <Image
                        src={property.coverImageUrl}
                        alt={property.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/60">
                        <HomeIcon className="w-8 h-8 mb-1" />
                        <span className="text-xs font-medium">No cover image</span>
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

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
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
                      <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {formatINR(property.pricePerNightPaise)}
                        <span className="font-normal text-xs text-[var(--text-secondary)]">
                          {' '}
                          / night
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <Link
                        href={`/host/listings/${property.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit & Manage</span>
                      </Link>

                      <span className="text-[11px] text-[var(--text-secondary)]">
                        Updated{' '}
                        {new Date(property.updatedAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[var(--border)] p-12 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mx-auto flex items-center justify-center mb-4">
                <HomeIcon className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
                No property listings yet
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                Ready to welcome guests? Create your first property draft, set your nightly rate,
                and upload photos.
              </p>
              <Link
                href="/host/listings/new"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Listing</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
