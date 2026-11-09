'use client';

import React from 'react';
import {
  Umbrella,
  Mountain,
  Home,
  Eye,
  Sparkles,
  Trees,
  Palette,
  Building2,
  Grid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBarProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

export function CategoryBar({
  selectedCategory = 'All',
  onSelectCategory,
  className,
}: CategoryBarProps) {
  const categories: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'All', label: 'All Stays', icon: Grid },
    { id: 'Beachfront', label: 'Beachfront', icon: Umbrella },
    { id: 'Mountains', label: 'Mountains', icon: Mountain },
    { id: 'Cabins', label: 'Cabins', icon: Home },
    { id: 'Amazing views', label: 'Amazing views', icon: Eye },
    { id: 'Luxury stays', label: 'Luxury stays', icon: Sparkles },
    { id: 'Countryside', label: 'Countryside', icon: Trees },
    { id: 'Design stays', label: 'Design stays', icon: Palette },
    { id: 'City escapes', label: 'City escapes', icon: Building2 },
  ];

  return (
    <div
      className={cn(
        'w-full border-b border-[var(--border)] bg-[var(--bg-primary)]/80 py-4',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3.5 py-2 rounded-2xl transition-all duration-200 shrink-0 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]',
                  isSelected
                    ? 'bg-white shadow-sm border border-[var(--border)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 border border-transparent',
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--bg-secondary)]',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium tracking-tight whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
