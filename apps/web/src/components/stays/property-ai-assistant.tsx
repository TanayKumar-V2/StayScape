'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { aiApi } from '@/lib/api';
import type { PropertyAnswerResponse } from '@/types/ai';

interface PropertyAiAssistantProps {
  propertySlug: string;
  propertyTitle: string;
}

export function PropertyAiAssistant({ propertySlug, propertyTitle }: PropertyAiAssistantProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState<PropertyAnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    'Is high-speed Wi-Fi available for video calls?',
    'What are the check-in and check-out times?',
    'Is on-premises parking provided?',
    'Are pets allowed at this property?',
    'What are the house quiet hours?',
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    if (queryToAsk) setQuestion(queryToAsk);

    try {
      const res = await aiApi.askPropertyQuestion(propertySlug, { question: q });
      if (res.data) {
        setAnswerData(res.data);
      } else {
        setError(res.error || 'Failed to get answer. Please try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reaching AI assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-[var(--border)] p-6 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-primary)] text-white flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="w-6 h-6 text-[var(--border)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
              Ask StayScape AI About This Stay
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-bold uppercase tracking-wider">
              AI Grounded
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Instant factual answers based strictly on verified listing details for {propertyTitle}.
          </p>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="mb-4">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
          Suggested Questions:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleAsk(sq)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]/40 transition text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Does this place have a desk for remote work or a full kitchen?"
          maxLength={500}
          className="w-full pl-4 pr-12 py-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="absolute right-2 p-2 rounded-xl bg-[var(--text-primary)] text-white disabled:opacity-40 hover:bg-[var(--accent-primary)] transition"
          aria-label="Send question"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer display */}
      {answerData && (
        <div className="mt-5 p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Listing Fact Answer
              </span>
            </div>

            {/* Confidence Badge */}
            {answerData.confidence === 'VERIFIED_FACT' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified from Listing Facts
              </span>
            )}
            {answerData.confidence === 'NOT_MENTIONED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                Not Mentioned in Listing
              </span>
            )}
            {answerData.confidence === 'POLICY_RESTRICTION' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                Privacy & Booking Policy
              </span>
            )}
          </div>

          <p className="text-sm text-[var(--text-primary)] leading-relaxed">{answerData.answer}</p>

          {/* Referenced facts */}
          {answerData.referencedFacts && answerData.referencedFacts.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Referenced facts:
              </span>
              {answerData.referencedFacts.map((fact, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white border border-[var(--border)] text-[11px] text-[var(--text-primary)]"
                >
                  {fact}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety Notice */}
      <p className="text-[11px] text-[var(--text-secondary)] mt-4 flex items-center gap-1.5">
        <span>🛡️</span>
        <span>
          Grounded strictly in published listing details. Exact private street address and direct
          host contact details are provided upon confirmed reservation.
        </span>
      </p>
    </div>
  );
}
