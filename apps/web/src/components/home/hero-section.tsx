import React from 'react';
import Image from 'next/image';
import { SearchWidget } from './search-widget';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[640px] lg:min-h-[720px] flex items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background Photography Container */}
      <div className="absolute inset-x-4 sm:inset-x-8 top-4 bottom-0 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl">
        <Image
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85"
          alt="Luxury mountain villa in Manali"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 transition-transform duration-1000"
        />

        {/* Sophisticated dual gradient overlay for editorial readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/40" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center mt-6 lg:mt-12 flex flex-col items-center">
        {/* Curated Stays Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
          <span>Curated Architecture &amp; Escapes</span>
        </div>

        {/* Main Heading */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6 drop-shadow-sm">
          Find a place that <br className="hidden sm:inline" />
          <span className="italic font-normal">feels like yours.</span>
        </h1>

        {/* Supporting text */}
        <p className="text-white/85 text-base sm:text-lg md:text-xl max-w-2xl font-light leading-relaxed mb-10 sm:mb-12 drop-shadow">
          From peaceful mountain escapes to beautiful city hideaways, discover stays that make every
          journey memorable.
        </p>

        {/* Embedded Search Widget */}
        <SearchWidget />
      </div>
    </section>
  );
}
