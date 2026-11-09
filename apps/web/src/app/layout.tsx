import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AuthProvider } from '@/context/auth-context';
import { WishlistProvider } from '@/context/wishlist-context';

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
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
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-[var(--accent-primary)]/20 selection:text-[var(--text-primary)]">
        <AuthProvider>
          <WishlistProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
