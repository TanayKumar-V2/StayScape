'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ScrollReveal } from './scroll-reveal';

export function HostCta() {
  const { isAuthenticated, user } = useAuth();
  const hostHref = user?.isHost
    ? '/host/listings/new'
    : isAuthenticated
      ? '/host/onboarding'
      : '/login?redirect=/host/onboarding';

  return (
    <section id="host-cta" className="px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <ScrollReveal className="mx-auto max-w-[1320px] rounded-[2rem] bg-[#e5e2d9] p-1.5 ring-1 ring-[#27382e]/[.08] sm:rounded-[2.5rem] sm:p-2">
        <div className="grid overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#1c382d] text-[#f7f5ee] sm:rounded-[calc(2.5rem-0.5rem)] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col items-start justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.22em] text-[#d1a27c]">
              A note to hosts
            </p>
            <h2 className="home-display max-w-[11ch] text-5xl leading-[.97] text-[#f4f1e7] sm:text-6xl">
              Your place has a story.
            </h2>
            <p className="mt-6 max-w-[390px] text-sm leading-7 text-white/65 sm:text-base">
              Share the home you&apos;ve made with travelers who will value it. Start a listing and
              tell us what makes it yours.
            </p>
            <Link
              href={hostHref}
              className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[#f2eee4] py-2 pl-6 pr-2 text-[13px] font-medium text-[#233b2e] transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-0.5 active:scale-[.98]"
            >
              <span>List your stay</span>
              <span className="flex size-9 items-center justify-center rounded-full bg-[#203e32]/[.08] transition-colors duration-500 group-hover:bg-[#203e32]/[.15]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="size-4 transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  fill="none"
                >
                  <path d="M4.5 15.5 15 5m0 0H6m9 0v9" stroke="currentColor" strokeWidth="1.35" />
                </svg>
              </span>
            </Link>
          </div>

          <div className="relative min-h-[320px] bg-[#d8d5cb] sm:min-h-[430px] lg:min-h-[550px]">
            <Image
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85"
              alt="A considered home surrounded by greenery"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#152d23]/35 via-transparent to-transparent" />
            <p className="absolute bottom-6 left-6 text-[9px] font-semibold uppercase tracking-[.2em] text-white/85 sm:bottom-8 sm:left-8">
              Made to be shared
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
