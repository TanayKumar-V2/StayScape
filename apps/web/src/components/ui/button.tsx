import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'terracotta';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
    const variants = {
      primary:
        'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
      secondary:
        'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--text-secondary)]',
      outline:
        'bg-white text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
      ghost:
        'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--text-secondary)]',
      accent:
        'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
      terracotta:
        'bg-[var(--accent-secondary)] text-white hover:bg-[var(--accent-secondary-hover)] shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent-secondary)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2.5 text-sm rounded-xl',
      lg: 'px-6 py-3.5 text-base rounded-2xl font-medium',
      icon: 'p-2.5 rounded-full',
    };

    const combinedClasses = cn(
      'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none',
      variants[variant],
      sizes[size],
      className,
    );

    if (asChild && React.isValidElement<{ className?: string }>(children)) {
      return React.cloneElement(children, {
        className: cn(combinedClasses, children.props?.className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
