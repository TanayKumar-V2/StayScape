import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'terracotta' | 'outline' | 'neutral';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]',
    accent:
      'bg-[var(--accent-primary)]/15 text-[var(--accent-primary-hover)] border border-[var(--accent-primary)]/20',
    terracotta:
      'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/25',
    outline: 'bg-white/80 text-[var(--text-primary)] border border-[var(--border)]',
    neutral: 'bg-black/5 text-[var(--text-secondary)] border border-black/5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full tracking-wide uppercase',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
