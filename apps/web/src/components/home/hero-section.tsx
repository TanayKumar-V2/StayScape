'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SearchWidget } from './search-widget';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f3f1e9] px-4 pb-12 pt-28 sm:px-6 lg:min-h-[min(920px,100svh)] lg:px-10 lg:pb-16 lg:pt-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-28 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(220,229,218,.72)_0%,_rgba(220,229,218,0)_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[.84fr_1.16fr] lg:gap-14">
        <div className="hero-copy-in relative z-10 max-w-[610px] py-4 sm:py-8 lg:py-12">
          <p className="mb-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#6e776a] sm:text-[11px]">
            <span aria-hidden="true" className="h-px w-9 bg-[#b77d54]" />A collection of distinctive
            stays
          </p>

          <h1 className="home-display max-w-[11ch] text-[clamp(3.5rem,7.4vw,7.4rem)] leading-[.91] text-[#23342b]">
            A more{' '}
            <span className="relative inline-block italic text-[#9a684b]">
              considered
              <span
                aria-hidden="true"
                className="hero-title-rule absolute -bottom-1 left-0 h-[2px] w-full origin-left bg-[#c49774]/70 sm:-bottom-2"
              />
            </span>{' '}
            kind of escape.
          </h1>

          <p className="mt-7 max-w-[430px] text-[15px] leading-[1.8] text-[#697268] sm:mt-9 sm:text-base">
            Distinctive homes and hideaways across India. Each one chosen for its sense of place,
            slower rhythm, and thoughtful hosts.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 sm:mt-10">
            <Link
              href="/stays"
              className="group inline-flex items-center gap-3 rounded-full bg-[#1f4437] py-2 pl-6 pr-2 text-[13px] font-medium text-white shadow-[0_15px_36px_-24px_rgba(23,53,41,.7)] transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-0.5 active:scale-[.98]"
            >
              Explore stays
              <span className="flex size-9 items-center justify-center rounded-full bg-white/10 transition-colors duration-500 group-hover:bg-white/20">
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
            <Link
              href="/staymatch"
              className="text-[13px] font-medium text-[#46574b] transition-colors duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:text-[#9a684b]"
            >
              Find your kind of place <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="mt-12 hidden items-center gap-4 border-t border-[#d4d5c9] pt-5 text-[9px] font-semibold uppercase tracking-[.2em] text-[#85897d] sm:flex lg:mt-16">
            <span>Homes</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-[#bd8258]" />
            <span>Cabins</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-[#bd8258]" />
            <span>Hideaways</span>
            <span className="ml-auto text-[#516256]">Found in India</span>
          </div>
        </div>

        <div className="hero-media-in relative mx-auto w-full max-w-[850px] lg:ml-auto">
          <div className="rounded-[2rem] bg-[#e4e1d7] p-1.5 ring-1 ring-[#27382e]/[.08] sm:rounded-[2.4rem] sm:p-2">
            <div className="relative aspect-[.92/1] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#d9d7cc] sm:rounded-[calc(2.4rem-0.5rem)] lg:aspect-[1.08/1]">
              <div
                aria-hidden="true"
                className="hero-parallax-media absolute -inset-y-[7%] inset-x-0"
              >
                <Image
                  src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1600&q=88"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover object-center"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#14291f]/50 via-transparent to-[#10241d]/10" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white sm:bottom-8 sm:left-8 sm:right-8">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/75">
                    The art of getting away
                  </p>
                  <p className="home-display mt-2 text-3xl leading-none sm:text-4xl">
                    Find your elsewhere.
                  </p>
                </div>
                <span className="hidden size-12 items-center justify-center rounded-full border border-white/45 text-sm sm:flex">
                  01
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 hidden items-center gap-3 rounded-full bg-[#f7f5ee] px-4 py-3 shadow-[0_14px_44px_-30px_rgba(25,42,32,.55)] ring-1 ring-[#293c30]/[.06] sm:flex lg:-left-8">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#9d7655]" />
            <span className="text-[10px] font-medium uppercase tracking-[.15em] text-[#566256]">
              Space to slow down
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-8 max-w-[1320px] sm:mt-12 lg:mt-10">
        <SearchWidget />
      </div>
    </section>
  );
}
