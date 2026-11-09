'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, Loader2 } from 'lucide-react';
import { messagesApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/auth-context';
import type { ConversationSummary } from '@/types/messages';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';
import { PageContainer } from '@/components/layout/page-container';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;

  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=/messages/${conversationId}`);
    }
  }, [authLoading, isAuthenticated, conversationId, router]);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await messagesApi.getConversations();
      if (res.data) {
        setConversations(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Socket presence listening
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handlePresence = (payload: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        if (payload.status === 'online') {
          return prev.includes(payload.userId) ? prev : [...prev, payload.userId];
        } else {
          return prev.filter((id) => id !== payload.userId);
        }
      });
    };

    socket.on('presence:updated', handlePresence);

    return () => {
      socket.off('presence:updated', handlePresence);
    };
  }, [isAuthenticated]);

  const handleSelectConversation = (id: string) => {
    router.push(`/messages/${id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16">
        <PageContainer>
          <div className="max-w-4xl mx-auto p-12 bg-white rounded-3xl border border-[var(--border)] text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
            <p className="font-serif text-lg font-bold text-[var(--text-primary)]">
              Checking authentication...
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 sm:py-12">
      <PageContainer>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1">
                <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link
                  href="/messages"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Messages
                </Link>
                <span>/</span>
                <span className="text-[var(--text-primary)] font-semibold">Chat</span>
              </nav>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                Messages
              </h1>
            </div>

            <Link
              href="/stays"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors self-start sm:self-auto shadow-sm"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Stays</span>
            </Link>
          </div>

          {/* Inbox Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Conversation List (hidden on mobile when viewing conversation) */}
            <div className="hidden md:flex md:col-span-5 lg:col-span-4 bg-white rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden h-[75vh] max-h-[750px] flex-col">
              <div className="p-4 border-b border-[var(--border)] bg-white shrink-0">
                <span className="font-serif text-base font-bold text-[var(--text-primary)]">
                  Conversations
                </span>
                <span className="text-xs text-[var(--text-secondary)] ml-2">
                  ({conversations.length})
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  activeId={conversationId}
                  onSelect={handleSelectConversation}
                  isLoading={isLoading}
                  onlineUserIds={onlineUsers}
                />
              </div>
            </div>

            {/* Right Column: Chat Window */}
            <div className="col-span-1 md:col-span-7 lg:col-span-8">
              <ChatWindow
                conversationId={conversationId}
                onBackToList={() => router.push('/messages')}
                onMessageSent={() => void loadConversations()}
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
