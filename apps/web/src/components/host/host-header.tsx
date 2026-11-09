'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Plus, ArrowLeft, LayoutDashboard, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HostHeader() {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Dashboard', href: '/host', icon: LayoutDashboard },
    { label: 'My Listings', href: '/host/listings', icon: ListOrdered },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Host Portal Indicator */}
        <div className="flex items-center gap-6">
          <Link
            href="/host"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm group-hover:bg-[var(--accent-primary-hover)] transition-colors">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  StayScape
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  Host
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] -mt-1 font-medium">
                Host Portal
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-secondary)] p-1.5 rounded-full border border-[var(--border)]">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/host' ? pathname === '/host' : pathname?.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Listing</span>
          </Link>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2.5 rounded-full border border-[var(--border)] bg-white hover:bg-[var(--bg-secondary)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to traveling</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
