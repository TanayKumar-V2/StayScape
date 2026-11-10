import { HeroSection } from '@/components/home/hero-section';
import { FeaturedStays } from '@/components/home/featured-stays';
import { AiTeaser } from '@/components/home/ai-teaser';
import { DestinationsSection } from '@/components/home/destinations-section';
import { WhyStayScape } from '@/components/home/why-stayscape';
import { HostCta } from '@/components/home/host-cta';
import { LandingScroll } from '@/components/home/landing-scroll';

export default function HomePage() {
  return (
    <LandingScroll>
      <main className="w-full overflow-x-clip">
        <HeroSection />
        <FeaturedStays />
        <AiTeaser />
        <DestinationsSection />
        <WhyStayScape />
        <HostCta />
      </main>
    </LandingScroll>
  );
}
