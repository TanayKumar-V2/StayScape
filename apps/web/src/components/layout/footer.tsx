import React from 'react';
import Link from 'next/link';
import { Compass, Globe, Mail, Share2, MessageSquare } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                StayScape
              </span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Find your place. Discover your escape. A curated collection of architecturally
              distinct villas, alpine cabins, and lakeside havelis across India.
            </p>
            <div aria-hidden="true" className="flex items-center gap-3 pt-2">
              <span className="w-9 h-9 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                <Globe className="w-4 h-4" />
              </span>
              <span className="w-9 h-9 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                <Mail className="w-4 h-4" />
              </span>
              <span className="w-9 h-9 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                <Share2 className="w-4 h-4" />
              </span>
              <span className="w-9 h-9 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                <MessageSquare className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  href="/stays?destination=Manali"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Manali Mountain Cabins
                </Link>
              </li>
              <li>
                <Link
                  href="/stays?destination=Goa"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Goa Coastal Villas
                </Link>
              </li>
              <li>
                <Link
                  href="/stays?destination=Jaipur"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Jaipur Heritage Haveli
                </Link>
              </li>
              <li>
                <Link
                  href="/stays?destination=Udaipur"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Udaipur Lakeside Stays
                </Link>
              </li>
              <li>
                <Link
                  href="/stays?destination=Rishikesh"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Rishikesh River Retreats
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting Links */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Hosting
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  href="/#host-cta"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  List Your Property
                </Link>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70 flex items-center gap-1.5">
                  Host Protection Policy
                </span>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70 flex items-center gap-1.5">
                  Community Standards
                </span>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70 flex items-center gap-1.5">
                  Host Resources
                </span>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-sm text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  href="/#why-stayscape"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Why Choose StayScape
                </Link>
              </li>
              <li>
                <Link href="/stays" className="hover:text-[var(--text-primary)] transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70">Cancellation Options</span>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70">Guest Safety Guidelines</span>
              </li>
              <li>
                <span className="text-[var(--text-secondary)]/70">Help Center (Coming Soon)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--border)] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-secondary)] gap-4">
          <p>
            © {new Date().getFullYear()} StayScape Inc. All rights reserved. Built with precision
            for mindful travel.
          </p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Sitemap</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
