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
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
    <div className={cn('w-full border-b border-[#deddd3] bg-transparent py-1', className)}>
      <div className="mx-auto max-w-[1320px] px-1 sm:px-2 lg:px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 sm:gap-6 lg:gap-9">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(cat.id)}
                className={cn(
                  'group relative flex shrink-0 flex-col items-center gap-2 px-2.5 py-3 text-[11px] font-medium transition-colors duration-500 ease-[cubic-bezier(.32,.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
                  isSelected ? 'text-[#294538]' : 'text-[#7b8178] hover:text-[#294538]',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.35} />
                <span className="whitespace-nowrap tracking-[.01em]">{cat.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2 -bottom-[5px] h-px origin-center bg-[#9b6c4d] transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)]',
                    isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
