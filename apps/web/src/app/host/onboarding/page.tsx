'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Compass,
  Home as HomeIcon,
  CheckCircle2,
  AlertCircle,
  Shield,
  HeartHandshake,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { hostApi } from '@/lib/api';

export default function HostOnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill display name from user's full name if available
  useEffect(() => {
    if (user && !displayName) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (name) {
        setDisplayName(`${name}'s Stays`);
      }
    }
  }, [user, displayName]);

  // If already a host, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.isHost) {
      router.replace('/host');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[var(--border)] shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mx-auto flex items-center justify-center mb-6">
            <HomeIcon className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] mb-3">
            Become a StayScape Host
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            Please log in or create an account to start hosting on StayScape.
          </p>
          <div className="space-y-3">
            <Link
              href="/login?redirect=/host/onboarding"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium text-sm transition-colors shadow-sm"
            >
              <span>Log In to Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register?redirect=/host/onboarding"
              className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-[var(--text-primary)] font-medium text-sm transition-colors"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim()) {
      setErrorMessage('Please provide a host display name.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('You must accept the host terms and community standards to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await hostApi.onboard({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        termsAccepted: true,
      });

      if (response.error || !response.data) {
        setErrorMessage(response.error ?? 'Host onboarding failed. Please try again.');
        setSubmitting(false);
        return;
      }

      // Refresh auth context so user.isHost is updated
      await refreshUser();
      router.push('/host');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred during host onboarding.';
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <Compass className="w-4 h-4" />
          <span>Back to StayScape Home</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Vision & Benefits */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                Host Community
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mt-3">
                Open your doors to extraordinary travelers.
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
                Whether it is a mountain cabin in Manali, a heritage haveli in Udaipur, or a serene
                coastal villa in Goa, share your corner of the world.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Direct Control
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-normal">
                    Set your own nightly rates in INR, manage house rules, and pause or activate
                    listings at any time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0 mt-0.5">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Transparent Hosting
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-normal">
                    No hidden listing fees. All pricing is stored accurately and securely in integer
                    paise.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    Rich Listing Showcase
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-normal">
                    Interactive OpenStreetMap location pin, 22 standard amenities, and multi-image
                    Cloudinary showcases.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Onboarding Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-1">
              Create Your Host Profile
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              Complete these details to unlock your host dashboard and start publishing listings.
            </p>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Host / Brand Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Arjun's Himalayan Retreats"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white text-sm transition-all"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  This public name will appear on all your property listings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Host Biography (Optional)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short introduction about your hospitality, local recommendations, or story..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Contact Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white text-sm transition-all"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] border-[var(--border)]"
                  />
                  <span className="text-xs text-[var(--text-primary)] leading-relaxed">
                    I agree to the{' '}
                    <span className="font-semibold text-[var(--accent-primary)]">
                      StayScape Host Agreement
                    </span>
                    , anti-discrimination policy, and community quality standards. I confirm that
                    all listings I create comply with local Indian hospitality regulations.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !termsAccepted || !displayName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 text-white font-medium text-sm transition-all shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Host Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Onboarding & Enter Host Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
