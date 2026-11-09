import { HeroSection } from '@/components/home/hero-section';
import { FeaturedStays } from '@/components/home/featured-stays';
import { AiTeaser } from '@/components/home/ai-teaser';
import { DestinationsSection } from '@/components/home/destinations-section';
import { WhyStayScape } from '@/components/home/why-stayscape';
import { HostCta } from '@/components/home/host-cta';
import { fetchApiHealth } from '@/lib/api';

export default async function HomePage() {
  // Fetch API health server-side; gracefully handles unreachable API
  const health = await fetchApiHealth();
  const apiReachable = health?.status === 'ok';

  return (
    <main className="w-full overflow-x-clip">
      {/* 1. Editorial Hero Section with Search Widget */}
      <HeroSection />

      {/* 2. Featured Properties with Category Tabs */}
      <FeaturedStays />

      {/* 3. AI StayMatch™ Discovery Teaser */}
      <AiTeaser />

      {/* 4. Popular Destinations Grid */}
      <DestinationsSection />

      {/* 5. Why StayScape Brand Values */}
      <WhyStayScape />

      {/* 6. Host Call To Action */}
      <HostCta />

      {/* Phase 1 Backend Health Indicator Bar (Subtle & Informative) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--border)]/40">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              apiReachable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>
            API Status:{' '}
            {apiReachable ? (
              <span className="text-emerald-700 font-medium">Connected ({health?.service})</span>
            ) : (
              <span className="text-amber-700 font-medium">Offline (Mock data mode active)</span>
            )}
          </span>
        </span>
        <span className="hidden sm:inline">StayScape Monorepo Architecture • Phase 2 Ready</span>
      </div>
    </main>
  );
}
