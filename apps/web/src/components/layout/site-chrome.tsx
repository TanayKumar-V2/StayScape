'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspace =
    pathname === '/host' ||
    pathname?.startsWith('/host/') ||
    pathname === '/admin' ||
    pathname?.startsWith('/admin/');

  return (
    <>
      {!isWorkspace && <Navbar />}
      <div className="flex-1">{children}</div>
      {!isWorkspace && <Footer />}
    </>
  );
}
