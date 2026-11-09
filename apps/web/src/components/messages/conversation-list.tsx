'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, MapPin } from 'lucide-react';
import type { ConversationSummary } from '@/types/messages';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect?: (id: string) => void;
  isLoading?: boolean;
  onlineUserIds?: string[];
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  isLoading,
  onlineUserIds = [],
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] animate-pulse flex items-center gap-3.5"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--border)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--border)] rounded w-2/3" />
              <div className="h-3 bg-[var(--border)] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)] space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h4 className="font-serif font-bold text-[var(--text-primary)] text-base">
          No messages yet
        </h4>
        <p className="text-xs leading-relaxed max-w-xs mx-auto">
          When you connect with a host or guest regarding a property, your conversations will appear
          here.
        </p>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="divide-y divide-[var(--border)]/60 overflow-y-auto">
      {conversations.map((conv) => {
        const isActive = activeId === conv.id;
        const isOnline = onlineUserIds.includes(conv.otherParticipant.id);

        const content = (
          <div
            className={cn(
              'p-4 transition-colors flex items-start gap-3.5 cursor-pointer relative',
              isActive ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-primary)] bg-white',
            )}
          >
            {/* Avatar & Online status indicator */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center">
                {conv.otherParticipant.avatarUrl ? (
                  <Image
                    src={conv.otherParticipant.avatarUrl}
                    alt={conv.otherParticipant.displayName}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-sm font-bold text-[var(--accent-primary)]">
                    {conv.otherParticipant.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>

            {/* Content summary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                  {conv.otherParticipant.displayName}
                </span>
                {conv.lastMessageAt && (
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-light">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                )}
              </div>

              {/* Property Tag */}
              <div className="flex items-center gap-1 text-[11px] text-[var(--accent-primary)] font-medium truncate mb-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{conv.property.title}</span>
              </div>

              {/* Snippet & unread badge */}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'text-xs truncate',
                    conv.unreadCount > 0
                      ? 'text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] font-light',
                  )}
                >
                  {conv.lastMessagePreview ? conv.lastMessagePreview : 'No messages yet'}
                </p>

                {conv.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold rounded-full bg-[var(--accent-primary)] text-white shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

        if (onSelect) {
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`Open conversation with ${conv.otherParticipant.displayName}`}
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset"
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={conv.id} href={`/messages/${conv.id}`} className="block">
            {content}
          </Link>
        );
      })}
    </div>
  );
}
