'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { wishlistApi } from '@/lib/api';

interface WishlistContextType {
  savedIds: Set<string>;
  isSaved: (propertyId: string) => boolean;
  isWishlisted: (propertyId: string) => boolean;
  wishlistCount: number;
  toggleWishlist: (propertyId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  isLoading: boolean;
  isSyncing: boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  savedIds: new Set(),
  isSaved: () => false,
  isWishlisted: () => false,
  wishlistCount: 0,
  toggleWishlist: async () => false,
  refreshWishlist: async () => {},
  isLoading: false,
  isSyncing: false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedIds(new Set());
      return;
    }
    try {
      setIsLoading(true);
      const res = await wishlistApi.getWishlist(1, 50);
      if (res.data?.data) {
        const ids = new Set(res.data.data.map((item) => item.propertyId));
        setSavedIds(ids);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isSaved = useCallback(
    (propertyId: string) => savedIds.has(propertyId),
    [savedIds],
  );

  const toggleWishlist = useCallback(
    async (propertyId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return false;
      }

      const wasSaved = savedIds.has(propertyId);
      const nextSaved = !wasSaved;

      // Optimistic update
      setSavedIds((prev) => {
        const copy = new Set(prev);
        if (nextSaved) {
          copy.add(propertyId);
        } else {
          copy.delete(propertyId);
        }
        return copy;
      });

      try {
        if (nextSaved) {
          await wishlistApi.addToWishlist(propertyId);
        } else {
          await wishlistApi.removeFromWishlist(propertyId);
        }
        return nextSaved;
      } catch {
        // Revert on failure
        setSavedIds((prev) => {
          const copy = new Set(prev);
          if (wasSaved) {
            copy.add(propertyId);
          } else {
            copy.delete(propertyId);
          }
          return copy;
        });
        return wasSaved;
      }
    },
    [isAuthenticated, router, savedIds],
  );

  return (
    <WishlistContext.Provider
      value={{
        savedIds,
        isSaved,
        isWishlisted: isSaved,
        wishlistCount: savedIds.size,
        toggleWishlist,
        refreshWishlist,
        isLoading,
        isSyncing: isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
