import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';

const pillars = [
  {
    title: 'Homes with a sense of place',
    description:
      'Distinctive architecture, considered comforts, and a close connection to the landscape.',
  },
  {
    title: 'Clear, thoughtful pricing',
    description: 'Nightly rates and relevant fees are laid out before you reserve.',
  },
  {
    title: 'A more personal welcome',
    description: 'Meet attentive local hosts who know the details that make a stay feel easy.',
  },
  {
    title: 'Discovery by feeling',
    description: 'Describe the pace, setting, and details you want with StayMatch.',
  },
];

export function WhyStayScape() {
  return (
    <section id="why-stayscape" className="bg-[#f3f1e9] px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-24">
        <ScrollReveal className="max-w-[520px] lg:sticky lg:top-28 lg:self-start">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.22em] text-[#9a684b]">
            03 — The StayScape point of view
          </p>
          <h2 className="home-display text-5xl leading-[.97] text-[#23342b] sm:text-6xl lg:text-[4.5rem]">
            The right place changes everything.
          </h2>
          <p className="mt-7 max-w-[390px] text-sm leading-7 text-[#697268] sm:text-base">
            A good stay is more than a key and a bed. It&apos;s the feeling of belonging to a place,
            even for a little while.
          </p>
          <Link
            href="/stays"
            className="group mt-9 inline-flex items-center gap-3 text-[13px] font-medium text-[#2b4939]"
          >
            <span className="border-b border-[#ad9279] pb-1">Explore the collection</span>
            <span className="transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-1">
              →
            </span>
          </Link>
        </ScrollReveal>

        <div className="border-t border-[#d3d2c8]">
          {pillars.map((pillar, index) => (
            <ScrollReveal key={pillar.title} delay={index * 0.06}>
              <article className="grid gap-3 border-b border-[#d3d2c8] py-7 sm:grid-cols-[60px_1fr] sm:gap-5 sm:py-9">
                <span className="pt-1 text-[10px] font-medium tracking-[.16em] text-[#a17756]">
                  0{index + 1}
                </span>
                <div className="grid gap-2 md:grid-cols-[.8fr_1.2fr] md:gap-8">
                  <h3 className="home-display text-[1.7rem] leading-tight text-[#28392f] sm:text-3xl">
                    {pillar.title}
                  </h3>
                  <p className="max-w-[370px] text-sm leading-7 text-[#697268]">
                    {pillar.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
