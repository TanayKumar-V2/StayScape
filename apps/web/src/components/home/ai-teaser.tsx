'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { ScrollReveal } from './scroll-reveal';

export function AiTeaser() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const examplePrompts = [
    'A quiet cabin where the mountains come close',
    'A courtyard stay for a long weekend in Jaipur',
    'Somewhere by the sea, with room for everyone',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/staymatch?q=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <section className="bg-[#203e32] px-4 py-24 text-[#f7f5ee] sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
        <ScrollReveal>
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.22em] text-[#d1a27c]">
            04 — Find it by feeling
          </p>
          <h2 className="home-display max-w-[10ch] text-5xl leading-[.97] text-[#f4f1e7] sm:text-6xl lg:text-[4.7rem]">
            Start with the feeling.
          </h2>
          <p className="mt-7 max-w-[390px] text-sm leading-7 text-white/65 sm:text-base">
            Tell StayMatch what matters to you — a view, a long table, a little quiet. We&apos;ll
            look across the collection for places that fit.
          </p>
          <div className="mt-9 flex items-center gap-3 text-[10px] uppercase tracking-[.17em] text-white/45">
            <span aria-hidden="true" className="h-px w-8 bg-[#d1a27c]" />
            Thoughtful discovery, powered by StayMatch
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-[2rem] bg-white/[.07] p-1.5 ring-1 ring-white/10 sm:p-2">
            <div className="rounded-[calc(2rem-0.375rem)] bg-[#f6f4ed] p-4 text-[#23342b] sm:rounded-[calc(2rem-0.5rem)] sm:p-7 lg:p-8">
              <form onSubmit={handleSearch}>
                <label
                  htmlFor="home-staymatch-prompt"
                  className="mb-3 block text-[10px] font-semibold uppercase tracking-[.17em] text-[#697268]"
                >
                  What does your next escape look like?
                </label>
                <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[#deded4] bg-white p-2 sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
                  <input
                    id="home-staymatch-prompt"
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A slow morning, a view of the hills…"
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#23342b] outline-none placeholder:text-[#94978e] sm:px-0"
                  />
                  <button
                    type="submit"
                    className="group flex items-center justify-center gap-3 rounded-full bg-[#203e32] py-2 pl-5 pr-2 text-[13px] font-medium text-white transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-0.5 active:scale-[.98]"
                  >
                    <span>Find my match</span>
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/10 transition-colors duration-500 group-hover:bg-white/20">
                      <ArrowUpRight className="size-4" strokeWidth={1.35} />
                    </span>
                  </button>
                </div>
              </form>

              <div className="mt-8">
                <p className="mb-3 text-[9px] font-semibold uppercase tracking-[.18em] text-[#94978e]">
                  Or try one of these
                </p>
                <div className="divide-y divide-[#e4e3da] border-t border-[#e4e3da]">
                  {examplePrompts.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => router.push(`/staymatch?q=${encodeURIComponent(example)}`)}
                      className="group flex w-full items-center justify-between gap-4 py-3.5 text-left text-[12px] text-[#59665c] transition-colors duration-500 hover:text-[#203e32] sm:text-[13px]"
                    >
                      <span>{example}</span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-[#a27b5a] transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={1.3}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
