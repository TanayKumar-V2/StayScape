import type { Metadata } from 'next';
import { Archivo, Instrument_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import 'lenis/dist/lenis.css';
import { SiteChrome } from '@/components/layout/site-chrome';
import { AuthProvider } from '@/context/auth-context';
import { WishlistProvider } from '@/context/wishlist-context';

const archivo = Archivo({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StayScape — Find your place. Discover your escape.',
  description:
    'StayScape is a premium accommodation marketplace for discovering and booking unique villas, mountain cabins, and heritage stays across India.',
  keywords: [
    'vacation rentals',
    'luxury villas',
    'homestays',
    'unique stays',
    'cabins',
    'hotels',
    'StayScape',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${newsreader.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-[var(--accent-primary)]/20 selection:text-[var(--text-primary)]">
        <AuthProvider>
          <WishlistProvider>
            <SiteChrome>{children}</SiteChrome>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
