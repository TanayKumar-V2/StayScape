'use client';

import React, { useEffect, useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminPropertyDetails } from '@/types/admin';
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminPropertyDetailPage() {
  const params = useParams();
  const propertyId = params?.propertyId as string;

  const [property, setProperty] = useState<AdminPropertyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation action modal
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'APPROVE' | 'FLAG' | 'REJECT'>('APPROVE');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProperty = async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPropertyDetails(propertyId);
      if (res.data) {
        setProperty(res.data);
      } else {
        setError(res.error ?? 'Property not found');
      }
    } catch {
      setError('Network error while loading property details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProperty();
  }, [propertyId]);

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      let res;
      if (modalAction === 'APPROVE') {
        res = await adminApi.approveProperty(property.id, reason.trim() || undefined);
      } else if (modalAction === 'FLAG') {
        res = await adminApi.flagProperty(property.id, reason.trim());
      } else {
        res = await adminApi.rejectProperty(property.id, reason.trim());
      }

      if (res.data?.success) {
        setShowModal(false);
        setReason('');
        void fetchProperty();
      } else {
        setModalError(res.error ?? 'Failed to update property status');
      }
    } catch {
      setModalError('Network error during moderation action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[var(--border)] rounded-md" />
        <div className="h-64 bg-white border border-[var(--border)] rounded-3xl p-6" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
        <div className="p-6 bg-white rounded-3xl border border-[var(--border)] text-center">
          <p className="text-rose-700 font-medium">{error ?? 'Property listing not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
      </div>

      {/* Main Inspection Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)]">
              {property.title}
            </h1>
            <Badge variant="outline" className="text-xs uppercase border-[var(--border)]">
              {property.status}
            </Badge>
            {property.moderationStatus === 'APPROVED' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none">Approved</Badge>
            ) : property.moderationStatus === 'FLAGGED' ? (
              <Badge className="bg-amber-100 text-amber-800 border-none">Flagged</Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-800 border-none">Rejected</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {property.city}, {property.state}, {property.country}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px]">Slug: {property.slug}</span>
            <span>•</span>
            <a
              href={`/stays/${property.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent-primary)] hover:underline"
            >
              Public View <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {property.moderationReason ? (
            <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
              <strong>Moderation Record:</strong> {property.moderationReason}
              {property.moderatedByEmail ? ` (by ${property.moderatedByEmail})` : ''}
            </div>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {property.moderationStatus !== 'APPROVED' ? (
            <Button
              onClick={() => {
                setModalAction('APPROVE');
                setReason('');
                setModalError(null);
                setShowModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Listing
            </Button>
          ) : null}

          {property.moderationStatus !== 'FLAGGED' ? (
            <Button
              variant="outline"
              onClick={() => {
                setModalAction('FLAG');
                setReason('');
                setModalError(null);
                setShowModal(true);
              }}
              className="border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" /> Flag
            </Button>
          ) : null}

          {property.moderationStatus !== 'REJECTED' ? (
            <Button
              variant="outline"
              onClick={() => {
                setModalAction('REJECT');
                setReason('');
                setModalError(null);
                setShowModal(true);
              }}
              className="border-rose-300 text-rose-800 hover:bg-rose-50 rounded-xl"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reject
            </Button>
          ) : null}
        </div>
      </div>

      {/* Gallery Inspection Grid */}
      <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-4">
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Uploaded Media Gallery ({property.images?.length ?? 0} photos)
        </h3>
        {property.images && property.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {property.images.map((img) => (
              <div
                key={img.id}
                className="relative aspect-4/3 rounded-xl overflow-hidden border border-[var(--border)] group bg-[var(--bg-primary)]"
              >
                <Image
                  src={img.secureUrl}
                  alt={img.caption ?? property.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                {img.isCover ? (
                  <span className="absolute top-2 left-2 bg-[var(--text-primary)]/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Cover Photo
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">
            No photos uploaded for this listing.
          </p>
        )}
      </div>

      {/* Details & Host Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Listing Description
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2 whitespace-pre-line leading-relaxed">
              {property.description}
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
              Accommodation Capacity & Amenities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--text-secondary)] block">Max Guests</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {property.maxGuests}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--text-secondary)] block">Bedrooms</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {property.bedrooms}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--text-secondary)] block">Beds</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {property.beds}
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--text-secondary)] block">Bathrooms</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {property.bathrooms}
                </span>
              </div>
            </div>

            {property.amenities && property.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {property.amenities.map((am) => (
                  <span
                    key={am.id}
                    className="px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text-primary)]"
                  >
                    {am.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Host & Pricing Card */}
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-xs space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Host Information
            </h3>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center font-bold text-sm">
                {property.host.displayName[0]}
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {property.host.displayName}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{property.host.email}</p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full mt-4 rounded-xl border-[var(--border)] text-xs"
            >
              <Link href={`/admin/hosts/${property.host.id}`}>View Host Portfolio</Link>
            </Button>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-2 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Pricing Snapshot
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">Nightly Rate</span>
              <span className="font-bold text-[var(--text-primary)]">
                {formatPaise(property.basePricePaise)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">Cleaning Fee</span>
              <span className="font-bold text-[var(--text-primary)]">
                {formatPaise(property.cleaningFeePaise)}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-2 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Metrics
            </h4>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">Total Bookings</span>
              <span className="font-bold text-[var(--text-primary)]">
                {property.counts.bookings}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">Reviews</span>
              <span className="font-bold text-[var(--text-primary)]">
                {property.counts.reviews}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">Reports Against</span>
              <span className="font-bold text-rose-700">{property.counts.reports}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal ? (
        <AccessibleDialog
          ariaLabel="Moderate property"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => setShowModal(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)]">
            <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
              {modalAction === 'APPROVE'
                ? 'Approve Listing'
                : modalAction === 'FLAG'
                  ? 'Flag Listing'
                  : 'Reject Listing'}
            </h3>
            <form onSubmit={handleModerationSubmit} className="space-y-4 mt-4">
              <p className="text-xs text-[var(--text-secondary)]">
                {modalAction === 'APPROVE'
                  ? 'Confirm that this listing meets content, accuracy and safety guidelines.'
                  : 'Provide mandatory administrative rationale for updating moderation status.'}
              </p>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Reason {modalAction !== 'APPROVE' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={modalAction !== 'APPROVE'}
                  placeholder="Audit reason..."
                  className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
                />
              </div>
              {modalError ? (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[var(--border)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl text-white ${
                    modalAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : modalAction === 'FLAG'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      ) : null}
    </div>
  );
}
