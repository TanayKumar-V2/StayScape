import React from 'react';
import Link from 'next/link';
import { Sparkles, CreditCard, CalendarCheck, Compass, Users } from 'lucide-react';

export function WhyStayScape() {
  const pillars = [
    {
      icon: Sparkles,
      title: 'Carefully curated stays',
      description:
        'Every home on StayScape is selected for its architectural character, comfort, and unique relationship to its surroundings.',
      color: 'text-[var(--accent-primary)]',
      bg: 'bg-[var(--accent-primary)]/10',
    },
    {
      icon: CreditCard,
      title: 'Transparent pricing',
      description:
        'No hidden last-minute surcharges. Clear nightly rates, cleaning details, and transparent service fees displayed upfront.',
      color: 'text-[var(--accent-secondary)]',
      bg: 'bg-[var(--accent-secondary)]/10',
    },
    {
      icon: CalendarCheck,
      title: 'Seamless booking',
      description:
        'Fast reservation requests, clear host communication, and flexible check-in support designed around modern travelers.',
      color: 'text-[var(--accent-primary)]',
      bg: 'bg-[var(--accent-primary)]/10',
    },
    {
      icon: Compass,
      title: 'Personalized discovery',
      description:
        'Search naturally by mood, architectural style, or setting using StayMatch AI recommendations tailored to your trip.',
      color: 'text-[var(--accent-secondary)]',
      bg: 'bg-[var(--accent-secondary)]/10',
    },
    {
      icon: Users,
      title: 'Trusted host community',
      description:
        'Direct connection with attentive local hosts who take pride in sharing insider tips and maintaining peaceful spaces.',
      color: 'text-[var(--accent-primary)]',
      bg: 'bg-[var(--accent-primary)]/10',
    },
  ];

  return (
    <section id="why-stayscape" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent-primary)] mb-1 block">
          The StayScape Difference
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
          Thoughtfully crafted for mindful travel
        </h2>
        <p className="text-[var(--text-secondary)] text-base sm:text-lg mt-3 leading-relaxed">
          We believe where you stay shapes how you experience a journey. Here is why travelers
          choose StayScape.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="bg-white p-8 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col"
            >
              <div
                className={`w-12 h-12 rounded-2xl ${pillar.bg} ${pillar.color} flex items-center justify-center mb-6`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)] mb-2.5">
                {pillar.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                {pillar.description}
              </p>
            </div>
          );
        })}

        {/* Feature highlight card */}
        <div className="bg-[var(--bg-primary)] p-8 rounded-3xl border border-[var(--border)] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-secondary)]">
              Next-Gen Travel
            </span>
            <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mt-2 mb-3">
              Ready to find your next escape?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Explore our handpicked collection of villas, cabins, and havelis across India.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/stays"
              className="inline-flex items-center justify-center w-full py-3 px-6 rounded-2xl bg-[var(--text-primary)] text-white font-medium text-sm hover:bg-black transition-colors"
            >
              Browse All Stays
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
