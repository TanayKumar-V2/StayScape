'use client';

import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Image from 'next/image';
import { Home, ArrowRight, X, Shield, Sparkles } from 'lucide-react';

export function HostCta() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section id="host-cta" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[var(--text-primary)] text-white p-8 sm:p-12 lg:p-16 min-h-[440px] flex items-center shadow-xl">
          {/* Background image preview */}
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
              alt="Beautiful architectural villa interior"
              fill
              className="object-cover object-center opacity-30 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-primary)]/90 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[var(--bg-primary)] text-xs font-semibold tracking-wider uppercase mb-5">
              <Home className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>StayScape Host Community</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Have a place worth sharing?
            </h2>

            <p className="text-white/80 text-base sm:text-lg font-light leading-relaxed mb-8">
              Turn your property into someone&apos;s next unforgettable escape. Join a curated
              network of passionate hosts welcoming travelers who respect architecture and nature.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-7 py-4 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Become a Host</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-xs text-white/60 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Host Onboarding &amp; Verification arriving in Phase 4</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <AccessibleDialog
          ariaLabel="Host with StayScape"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClose={() => setModalOpen(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[var(--border)] relative text-[var(--text-primary)]">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-2xl font-bold mb-2">Host with StayScape</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              Full host registration, KYC identity verification, multi-photo listing creation, and
              instant calendar sync will launch in{' '}
              <strong className="text-[var(--text-primary)]">Phase 4</strong>.
            </p>

            <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)] mb-6 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span className="font-medium">Direct guest messaging with notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span className="font-medium">Automated booking reservation calendar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span className="font-medium">Razorpay payment security for hosts</span>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Close
            </button>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
