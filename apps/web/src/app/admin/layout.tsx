'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Star,
  Flag,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  Bot,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Hosts', href: '/admin/hosts', icon: Building2 },
  { label: 'Properties', href: '/admin/properties', icon: Home },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Reports', href: '/admin/reports', icon: Flag },
  { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Refunds', href: '/admin/refunds', icon: RotateCcw },
  { label: 'AI Usage', href: '/admin/ai-usage', icon: Bot },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Verifying administrative access...
          </p>
        </div>
      </div>
    );
  }

  // 2. Access Denied state (not logged in or not an ADMIN)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-[var(--border)] text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            {user
              ? `Your account (${user.email}) does not have administrative privileges. Contact a platform superadministrator for access.`
              : 'You must be signed in with an administrator account to view the StayScape operational management console.'}
          </p>
          <div className="flex flex-col gap-3">
            {!user ? (
              <Button
                asChild
                className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-xl"
              >
                <Link href="/login">Sign In to Continue</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="w-full rounded-xl border-[var(--border)]">
              <Link href="/">Return to Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row text-[var(--text-primary)]">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] text-white flex items-center justify-center font-bold text-sm">
            SS
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-base text-[var(--text-primary)]">
              StayScape
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--accent-primary)] tracking-wider -mt-1">
              Admin Console
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[var(--border)] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Brand & Badge */}
          <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
                S
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    StayScape
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium tracking-wide">
                  Platform Operations
                </span>
              </div>
            </Link>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      isActive ? 'text-white' : 'text-[var(--text-secondary)]',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile & Back to Main App Footer */}
          <div className="p-4 border-t border-[var(--border)] space-y-3">
            <Link
              href="/"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
            >
              <span>Back to Marketplace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                  {user.firstName ? user.firstName[0] : 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Log Out"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-600 hover:bg-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
