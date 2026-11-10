'use client';

import React, { useState } from 'react';
import { AccessibleDialog } from '@/components/ui/accessible-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Heart,
  Menu,
  X,
  User as UserIcon,
  Home as HomeIcon,
  LogOut,
  Settings,
  Calendar,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { user, isAuthenticated, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);

  const navLinks = [
    { label: 'Explore', href: '/' },
    { label: 'Stays', href: '/stays' },
    { label: 'StayMatch AI', href: '/staymatch', isAi: true },
  ];

  const userInitials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <>
      <header
        className={cn(
          'z-40 transition-all duration-700 ease-[cubic-bezier(.32,.72,0,1)]',
          isHome
            ? 'fixed left-1/2 top-4 w-[calc(100%-2rem)] max-w-[1320px] -translate-x-1/2 rounded-full border border-white/70 bg-[#f8f7f1]/85 shadow-[0_18px_46px_-36px_rgba(28,46,35,.55)] backdrop-blur-2xl'
            : 'sticky top-0 w-full border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-md',
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8',
            isHome ? 'h-[68px]' : 'h-20',
          )}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm group-hover:bg-[var(--accent-primary-hover)] transition-colors">
              <Compass
                className="w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(.32,.72,0,1)] group-hover:rotate-45"
                strokeWidth={1.35}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                StayScape
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] -mt-1 font-medium">
                Unique Stays
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav
            className={cn(
              'hidden items-center gap-1 md:flex',
              isHome
                ? 'rounded-full px-1 py-1'
                : 'rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] p-1.5',
            )}
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 sm:px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-500 ease-[cubic-bezier(.32,.72,0,1)] flex items-center gap-1.5',
                    isActive
                      ? 'bg-white text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60',
                  )}
                >
                  <span>{link.label}</span>
                  {link.isAi && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Experiences placeholder with subtle pill */}
            <div className="relative group px-4 py-2 flex items-center gap-1.5 cursor-not-allowed">
              <span className="text-sm font-medium text-[var(--text-secondary)]/60">
                Experiences
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-secondary)]">
                Soon
              </span>
            </div>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Host Link / Switch to hosting CTA */}
            {user?.isHost ? (
              <Link
                href="/host"
                className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] px-4 py-2.5 rounded-full border border-transparent hover:border-[var(--border)] transition-all"
              >
                <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Host Dashboard</span>
              </Link>
            ) : (
              <Link
                href={isAuthenticated ? '/host/onboarding' : '/login?redirect=/host/onboarding'}
                className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] px-4 py-2.5 rounded-full border border-transparent hover:border-[var(--border)] transition-all"
              >
                <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Become a Host</span>
              </Link>
            )}

            {/* Wishlist Link */}
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="p-2.5 rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border)] transition-colors relative"
            >
              <Heart className="w-5 h-5 text-[var(--text-primary)]" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-secondary)] text-white text-[10px] font-bold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Messages Link */}
            {isAuthenticated && (
              <Link
                href="/messages"
                aria-label="Messages"
                className="p-2.5 rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border)] transition-colors relative"
              >
                <MessageSquare className="w-5 h-5 text-[var(--text-primary)]" />
              </Link>
            )}

            {/* Authentication Buttons (Desktop) when logged out */}
            {!isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] px-3.5 py-2 rounded-full transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white px-4 py-2 rounded-full transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
                aria-label="User menu"
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-full border border-[var(--border)] bg-white hover:shadow-md transition-all text-[var(--text-primary)]"
              >
                <Menu className="w-4 h-4 text-[var(--text-secondary)]" />
                {isAuthenticated && user ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-semibold text-xs tracking-wider">
                    {userInitials}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center font-medium text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {isAuthenticated && user && (
                  <span className="hidden xl:inline text-xs font-medium text-[var(--text-primary)] max-w-[80px] truncate">
                    {user.firstName}
                  </span>
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-[var(--border)] py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                    {isAuthenticated && user ? (
                      <div className="px-4 py-3 border-b border-[var(--border)]/60 bg-[var(--bg-primary)]">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {user.email}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 border-b border-[var(--border)]/60 bg-[var(--bg-primary)]">
                        <p className="font-semibold text-[var(--text-primary)]">
                          Welcome to StayScape
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Discover your escape across India
                        </p>
                      </div>
                    )}

                    <div className="py-1">
                      {isAuthenticated ? (
                        <>
                          <Link
                            href="/account/bookings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                          >
                            <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>My Bookings</span>
                          </Link>
                          <Link
                            href="/account/wishlist"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                          >
                            <Heart className="w-4 h-4 text-[var(--accent-secondary)]" />
                            <span>My Wishlist ({wishlistCount})</span>
                          </Link>
                          <Link
                            href="/messages"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                          >
                            <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Messages</span>
                          </Link>
                          {user?.role === 'ADMIN' ? (
                            <Link
                              href="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-purple-900 bg-purple-50/60 hover:bg-purple-100/70 transition-colors font-semibold"
                            >
                              <Shield className="w-4 h-4 text-purple-700" />
                              <span>Admin Console</span>
                            </Link>
                          ) : null}
                          <Link
                            href="/account"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                          >
                            <Settings className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Account Settings</span>
                          </Link>
                          <Link
                            href="/stays"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                          >
                            <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Discover Stays</span>
                          </Link>
                          {user?.isHost ? (
                            <>
                              <Link
                                href="/host"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                              >
                                <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                                <span>Host Dashboard</span>
                              </Link>
                              <Link
                                href="/host/listings"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                              >
                                <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
                                <span>My Listings</span>
                              </Link>
                            </>
                          ) : (
                            <Link
                              href="/host/onboarding"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                              <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                              <span>Become a host</span>
                            </Link>
                          )}
                          <div className="border-t border-[var(--border)]/60 my-1" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 transition-colors text-left font-medium"
                          >
                            <LogOut className="w-4 h-4 text-[var(--accent-secondary)]" />
                            <span>Log out</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/login"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                          >
                            <UserIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Log in</span>
                          </Link>
                          <Link
                            href="/register"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors font-medium"
                          >
                            <UserIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Sign up</span>
                          </Link>
                          <div className="border-t border-[var(--border)]/60 my-1" />
                          <Link
                            href="/stays"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                          >
                            <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Discover Stays</span>
                          </Link>
                          <Link
                            href="/host/onboarding"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                          >
                            <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                            <span>Host your home</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors ml-1"
              aria-label="Open mobile navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 pt-4 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
            {isAuthenticated && user && (
              <div className="p-4 rounded-2xl bg-white border border-[var(--border)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-sm">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-base font-medium transition-colors',
                  pathname === '/'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                Explore Home
              </Link>
              <Link
                href="/stays"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-base font-medium transition-colors',
                  pathname === '/stays'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                Browse All Stays
              </Link>
              <Link
                href="/staymatch"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-4 py-3 rounded-xl text-base font-medium transition-colors flex items-center justify-between',
                  pathname === '/staymatch'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
                )}
              >
                <span>StayMatch AI</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] text-white">
                  AI
                </span>
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/account/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>My Bookings</span>
                  </Link>
                  <Link
                    href="/account/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-[var(--accent-secondary)]" />
                      <span>My Wishlist</span>
                    </div>
                    {wishlistCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] text-white text-xs font-bold">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Messages</span>
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Account Settings</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-base font-medium bg-[var(--accent-primary)] text-white text-center"
                  >
                    Create Free Account
                  </Link>
                </>
              )}
            </nav>

            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              {user?.isHost ? (
                <Link
                  href="/host"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent-primary)] text-white font-medium shadow-sm"
                >
                  <HomeIcon className="w-4 h-4 text-white" />
                  <span>Host Dashboard</span>
                </Link>
              ) : (
                <Link
                  href={isAuthenticated ? '/host/onboarding' : '/login?redirect=/host/onboarding'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium border border-[var(--border)]"
                >
                  <HomeIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Become a Host</span>
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWishlistModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[var(--text-primary)] font-medium border border-[var(--border)]"
              >
                <Heart className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>View Wishlist</span>
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 font-medium border border-[var(--accent-secondary)]/30"
                >
                  <LogOut className="w-4 h-4 text-[var(--accent-secondary)]" />
                  <span>Log out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Host Modal Placeholder */}
      {hostModalOpen && (
        <AccessibleDialog
          ariaLabel="Host on StayScape"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClose={() => setHostModalOpen(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[var(--border)] relative">
            <button
              onClick={() => setHostModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center mb-5">
              <HomeIcon className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
              Host on StayScape
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              Turn your exceptional home into someone&apos;s next unforgettable escape. Host
              onboarding, calendar sync, and earnings dashboard are coming in{' '}
              <strong className="text-[var(--text-primary)]">Phase 4</strong>.
            </p>

            <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)] mb-6 space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span>Zero listing fees during launch</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span>Curated, verified guest profiles</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                <span>Automated Razorpay payouts</span>
              </div>
            </div>

            <button
              onClick={() => setHostModalOpen(false)}
              className="w-full py-3.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Got it, keep me posted
            </button>
          </div>
        </AccessibleDialog>
      )}

      {/* Wishlist Modal Placeholder */}
      {wishlistModalOpen && (
        <AccessibleDialog
          ariaLabel="Your wishlist"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClose={() => setWishlistModalOpen(false)}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[var(--border)] relative">
            <button
              onClick={() => setWishlistModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] flex items-center justify-center mb-5">
              <Heart className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-[var(--text-primary)] mb-2">
              Your Wishlist
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              You can tap the heart on any property card to save it locally. Cloud-synced
              multi-board wishlists and shared trip boards will arrive with user accounts in{' '}
              <strong className="text-[var(--text-primary)]">Phase 3</strong>.
            </p>

            <button
              onClick={() => setWishlistModalOpen(false)}
              className="w-full py-3.5 rounded-xl bg-[var(--text-primary)] text-white font-medium hover:bg-black transition-colors"
            >
              Continue Exploring
            </button>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
