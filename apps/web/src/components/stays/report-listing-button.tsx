'use client';

import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import { Flag, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

interface ReportListingButtonProps {
  propertyId: string;
  propertyTitle: string;
}

export function ReportListingButton({ propertyId, propertyTitle }: ReportListingButtonProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>('MISLEADING_LISTING');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Please sign in to submit a trust and safety report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await reportsApi.createReport({
        targetType: 'PROPERTY',
        targetId: propertyId,
        reason,
        description: description.trim() || undefined,
      });

      if (res.data?.success) {
        setSuccessMessage('Thank you. Your report has been submitted to StayScape Trust & Safety.');
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
          setDescription('');
        }, 2200);
      } else {
        setErrorMessage(res.error ?? 'Failed to submit report. Please try again.');
      }
    } catch {
      setErrorMessage('A network error occurred while submitting your report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2.5 px-4 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/60 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Report this listing</span>
      </button>

      {isOpen ? (
        <AccessibleDialog
          ariaLabel="Report this listing"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClose={() => setIsOpen(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[var(--border)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-serif font-bold text-lg text-[var(--text-primary)]">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Report this listing</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{successMessage}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Our trust and safety team will review this listing.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  Reporting listing:{' '}
                  <strong className="text-[var(--text-primary)]">{propertyTitle}</strong>. Help us
                  maintain a safe, accurate, and respectful marketplace.
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Reason for report
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="MISLEADING_LISTING">
                      Inaccurate or misleading listing information
                    </option>
                    <option value="SAFETY_CONCERN">Safety or security concern</option>
                    <option value="FRAUD">Fraudulent or suspicious activity</option>
                    <option value="INAPPROPRIATE_CONTENT">
                      Offensive or inappropriate content
                    </option>
                    <option value="SPAM">Spam or duplicate listing</option>
                    <option value="OTHER">Other issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Details & Explanation
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about what is inaccurate or concerning..."
                    className="w-full p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>

                {errorMessage ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="rounded-xl border-[var(--border)]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </AccessibleDialog>
      ) : null}
    </>
  );
}
