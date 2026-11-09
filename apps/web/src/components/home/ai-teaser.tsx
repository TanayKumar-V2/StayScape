'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AiTeaser() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const examplePrompts = [
    {
      text: 'A quiet mountain cabin with a beautiful valley view.',
      category: 'Cabins',
      destination: 'Manali',
    },
    {
      text: 'A beachside villa for a family vacation with a pool.',
      category: 'Beachfront',
      destination: 'Goa',
    },
    {
      text: 'A cozy courtyard home in Jaipur with a traditional feel.',
      category: 'City escapes',
      destination: 'Jaipur',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/staymatch?q=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[var(--text-primary)] via-[var(--surface-deep)] to-[var(--surface-deeper)] p-8 sm:p-12 lg:p-16 text-white shadow-2xl border border-white/10">
        {/* Subtle decorative background light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-primary)]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--accent-secondary)]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Feature Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[var(--bg-primary)] text-xs font-semibold tracking-wider uppercase mb-6">
            <Sparkles className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>StayMatch™ AI Discovery Preview</span>
          </div>

          {/* Heading */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Tell us what your perfect getaway looks like.
          </h2>

          {/* Supporting Text */}
          <p className="text-white/75 text-base sm:text-lg font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe the kind of stay you&apos;re dreaming of. StayMatch will help you discover
            places that fit your preferences.
          </p>

          {/* AI Search Input Container */}
          <form onSubmit={handleSearch} className="mb-6">
            <div
              className={cn(
                'relative flex items-center bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-full p-2 border transition-all duration-300 shadow-lg',
                isFocused
                  ? 'border-[var(--accent-primary)] bg-white/15 ring-2 ring-[var(--accent-primary)]/50'
                  : 'border-white/20 hover:border-white/30',
              )}
            >
              <div className="pl-4 pr-2 text-[var(--bg-primary)]/80 hidden sm:block">
                <Wand2 className="w-5 h-5 text-[var(--accent-secondary)]" />
              </div>

              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="e.g. A serene mountain hideout with fireplace and river sound..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-white/50 px-3 py-3 focus:outline-none"
              />

              <button
                type="submit"
                className="shrink-0 px-6 py-3.5 rounded-xl sm:rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>Find My Match</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Example prompt buttons */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-white/50 mb-3">
              Try an example prompt:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {examplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => router.push(`/staymatch?q=${encodeURIComponent(item.text)}`)}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-xs text-white/90 transition-all text-left"
                >
                  &ldquo;{item.text}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Phase 8 Integration Note */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/70">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            <span>
              Powered by StayMatch™ Intelligent Travel Discovery with Groq Structured Outputs.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
