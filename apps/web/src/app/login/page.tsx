'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ email: trimmedEmail, password });
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error ?? 'Invalid email or password. Please check your credentials.');
      }
    } catch {
      setError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] rounded-xl p-1 mb-4"
          >
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm group-hover:bg-[var(--accent-primary-hover)] transition-colors">
              <Compass className="w-6 h-6 transition-transform group-hover:rotate-45 duration-300" />
            </div>
            <span className="font-serif text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              StayScape
            </span>
          </Link>
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Sign in to access your curated escapes and reservations
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[var(--border)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 pr-11 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                Minimum 10 characters following our passphrase policy.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-semibold underline underline-offset-4 decoration-[var(--accent-primary)]/40"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
