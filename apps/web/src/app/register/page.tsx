'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 10) {
      errors.password = 'Password must be at least 10 characters long.';
    } else if (password.length > 128) {
      errors.password = 'Password must not exceed 128 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 1200);
      } else {
        setGeneralError(result.error ?? 'Registration failed. Please try again.');
      }
    } catch {
      setGeneralError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-[var(--bg-primary)]">
      <div className="w-full max-w-lg">
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
            Create your account
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Join StayScape to discover, save, and book extraordinary accommodations
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[var(--border)]">
          {isSuccess && (
            <div className="mb-6 p-4 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div className="font-medium">Account created successfully! Redirecting...</div>
            </div>
          )}

          {generalError && (
            <div className="mb-6 p-4 rounded-2xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{generalError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) {
                      setFieldErrors((prev) => ({ ...prev, firstName: '' }));
                    }
                  }}
                  placeholder="John"
                  required
                  autoComplete="given-name"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    fieldErrors.firstName
                      ? 'border-[var(--accent-secondary)]'
                      : 'border-[var(--border)]'
                  } bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-all`}
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-[var(--accent-secondary)] mt-1 font-medium">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) {
                      setFieldErrors((prev) => ({ ...prev, lastName: '' }));
                    }
                  }}
                  placeholder="Doe"
                  required
                  autoComplete="family-name"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    fieldErrors.lastName
                      ? 'border-[var(--accent-secondary)]'
                      : 'border-[var(--border)]'
                  } bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-all`}
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-[var(--accent-secondary)] mt-1 font-medium">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                placeholder="name@example.com"
                required
                autoComplete="email"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl border ${
                  fieldErrors.email ? 'border-[var(--accent-secondary)]' : 'border-[var(--border)]'
                } bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-all`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-[var(--accent-secondary)] mt-1 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder="••••••••••"
                  required
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    fieldErrors.password
                      ? 'border-[var(--accent-secondary)]'
                      : 'border-[var(--border)]'
                  } bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 pr-11 transition-all`}
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
              {fieldErrors.password ? (
                <p className="text-xs text-[var(--accent-secondary)] mt-1 font-medium">
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  At least 10 characters. Passphrases are welcomed and encouraged.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  placeholder="••••••••••"
                  required
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    fieldErrors.confirmPassword
                      ? 'border-[var(--accent-secondary)]'
                      : 'border-[var(--border)]'
                  } bg-[var(--bg-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 pr-11 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-[var(--accent-secondary)] mt-1 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Free Account</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-semibold underline underline-offset-4 decoration-[var(--accent-primary)]/40"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
