'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/context/wishlist-context';
import { cn } from '@/lib/utils';

interface PropertyWishlistButtonProps {
  propertyId: string;
  className?: string;
}

export function PropertyWishlistButton({ propertyId, className }: PropertyWishlistButtonProps) {
  const { isWishlisted, toggleWishlist, isSyncing } = useWishlist();
  const wishlisted = isWishlisted(propertyId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist(propertyId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSyncing}
      aria-label={wishlisted ? 'Remove from saved wishlist' : 'Save to wishlist'}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm',
        wishlisted
          ? 'bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)]'
          : 'bg-white border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
        className,
      )}
    >
      <Heart
        className={cn(
          'w-3.5 h-3.5 transition-colors',
          wishlisted
            ? 'fill-[var(--accent-secondary)] text-[var(--accent-secondary)]'
            : 'text-[var(--text-secondary)]',
        )}
      />
      <span>{wishlisted ? 'Saved' : 'Save'}</span>
    </button>
  );
}
