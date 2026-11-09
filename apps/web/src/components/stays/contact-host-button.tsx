'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { messagesApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

interface ContactHostButtonProps {
  propertySlug: string;
  hostName: string;
  className?: string;
  variant?: 'primary' | 'outline' | 'subtle';
}

export function ContactHostButton({
  propertySlug,
  hostName,
  className,
  variant = 'outline',
}: ContactHostButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=/stays/${encodeURIComponent(propertySlug)}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await messagesApi.createOrGetConversation({ propertySlug });
      if (res.data) {
        router.push(`/messages/${res.data.id}`);
      } else {
        setError(res.error || 'Failed to start conversation with host');
      }
    } catch {
      setError('Unable to initiate chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm',
          variant === 'outline' &&
            'bg-white border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:border-[var(--text-primary)]/30',
          variant === 'primary' && 'bg-[var(--text-primary)] text-white hover:bg-black',
          variant === 'subtle' &&
            'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 border border-transparent',
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
        ) : (
          <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
        )}
        <span>Contact {hostName}</span>
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
