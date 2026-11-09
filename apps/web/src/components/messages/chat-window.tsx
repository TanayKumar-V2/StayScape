'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Send,
  Loader2,
  Check,
  CheckCheck,
  ArrowLeft,
  Building,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { messagesApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/auth-context';
import type { MessageItem, ConversationSummary } from '@/types/messages';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversationId: string;
  onBackToList?: () => void;
  onMessageSent?: () => void;
}

export function ChatWindow({ conversationId, onBackToList, onMessageSent }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Scroll smoothly to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Fetch initial messages and conversation metadata
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadData() {
      try {
        // Fetch conversations list to get active conversation details
        const convListRes = await messagesApi.getConversations();
        if (convListRes.data && isMounted) {
          const found = convListRes.data.find((c) => c.id === conversationId);
          if (found) setConversation(found);
        }

        // Fetch messages for conversation
        const messagesRes = await messagesApi.getMessages(conversationId, undefined, 50);
        if (messagesRes.data?.data && isMounted) {
          const sorted = [...messagesRes.data.data].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          setMessages(sorted);
        }

        // Mark as read
        void messagesApi.markAsRead(conversationId);
      } catch {
        // Fallback
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [conversationId, scrollToBottom]);

  // Connect & listen to Socket.IO
  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    // Join room
    socket.emit('conversation:join', { conversationId });

    // Mark as read via socket as well
    socket.emit('message:read', { conversationId });

    // Handle incoming new message
    const handleNewMessage = (newMsg: MessageItem) => {
      if (newMsg.conversationId !== conversationId) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === newMsg.id ||
            (m.clientMessageId && m.clientMessageId === newMsg.clientMessageId),
        );

        if (exists) {
          return prev.map((m) =>
            m.clientMessageId === newMsg.clientMessageId || m.id === newMsg.id ? newMsg : m,
          );
        }

        return [...prev, newMsg];
      });

      // If message was sent by other participant, mark as read
      if (newMsg.senderUserId !== user?.id) {
        socket.emit('message:read', { conversationId });
      }

      scrollToBottom();
      onMessageSent?.();
    };

    // Handle read receipts
    const handleMessageRead = (payload: {
      conversationId: string;
      readerUserId: string;
      readAt: string;
    }) => {
      if (payload.conversationId !== conversationId) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.senderUserId === user?.id && !m.readAt) {
            return { ...m, readAt: payload.readAt };
          }
          return m;
        }),
      );
    };

    // Handle typing indicators
    const handleTypingStarted = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId === conversationId && payload.userId !== user?.id) {
        setIsOtherUserTyping(true);
        scrollToBottom();
      }
    };

    const handleTypingStopped = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId === conversationId && payload.userId !== user?.id) {
        setIsOtherUserTyping(false);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);
    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
    };
  }, [conversationId, user?.id, scrollToBottom, onMessageSent]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSendError(null);

    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { conversationId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  };

  // Send message with optimistic update & HTTP fallback
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content || !user || isSending) return;

    const clientMessageId = `cm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create optimistic message
    const optimisticMessage: MessageItem = {
      id: clientMessageId,
      conversationId,
      senderUserId: user.id,
      clientMessageId,
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
      isSending: true,
    };

    // Add optimistic message and clear composer immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue('');
    setSendError(null);
    setIsSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    const socket = getSocket();
    socket.emit('typing:stop', { conversationId });

    setTimeout(() => scrollToBottom(), 30);

    try {
      let sentSuccessfully = false;

      // 1. Try sending over WebSocket if connected
      if (socket.connected) {
        socket.emit(
          'message:send',
          { conversationId, clientMessageId, content },
          (ack?: { status: string; message?: MessageItem; error?: string }) => {
            if (ack && ack.status === 'ok' && ack.message) {
              setMessages((prev) =>
                prev.map((m) => (m.clientMessageId === clientMessageId ? ack.message! : m)),
              );
            }
          },
        );
        sentSuccessfully = true;
      }

      // 2. HTTP Fallback if socket is disconnected or failed
      if (!sentSuccessfully) {
        const httpRes = await messagesApi.sendMessageHttp(conversationId, {
          clientMessageId,
          content,
        });

        if (httpRes.data) {
          setMessages((prev) =>
            prev.map((m) => (m.clientMessageId === clientMessageId ? httpRes.data! : m)),
          );
        } else {
          throw new Error(httpRes.error || 'Failed to send message');
        }
      }

      onMessageSent?.();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Message could not be delivered');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[75vh] max-h-[750px] bg-white rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {conversation ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center shrink-0">
                {conversation.otherParticipant.avatarUrl ? (
                  <Image
                    src={conversation.otherParticipant.avatarUrl}
                    alt={conversation.otherParticipant.displayName}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[var(--accent-primary)]">
                    {conversation.otherParticipant.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-base font-bold text-[var(--text-primary)] truncate">
                  {conversation.otherParticipant.displayName}
                </h3>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                  Regarding {conversation.property.title}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-10 w-48 bg-[var(--bg-primary)] rounded-xl animate-pulse" />
          )}
        </div>

        {conversation && (
          <a
            href={`/stays/${conversation.property.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors shrink-0"
          >
            <Building className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>View Property</span>
          </a>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[var(--bg-primary)]/60">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)] space-y-2">
            <Clock className="w-8 h-8 text-[var(--accent-primary)]/50" />
            <p className="font-serif text-sm font-semibold text-[var(--text-primary)]">
              No messages in this conversation yet
            </p>
            <p className="text-xs max-w-xs">
              Send a message below to start coordinating details, arrival times, or house rules.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUserId === user?.id;

            return (
              <div
                key={msg.id || msg.clientMessageId}
                className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm break-words',
                    isMe
                      ? 'bg-[var(--text-primary)] text-white rounded-br-none'
                      : 'bg-white text-[var(--text-primary)] border border-[var(--border)] rounded-bl-none',
                  )}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>

                {/* Message status & time */}
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-secondary)] px-1 font-light">
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {isMe && (
                    <span>
                      {msg.readAt ? (
                        <CheckCheck className="w-3 h-3 text-[var(--accent-primary)]" />
                      ) : (
                        <Check className="w-3 h-3 text-[var(--text-secondary)]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isOtherUserTyping && conversation && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] italic bg-white/80 w-fit px-3 py-1.5 rounded-full border border-[var(--border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span>{conversation.otherParticipant.displayName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Send Error Notice */}
      {sendError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Composer Input Form */}
      <form
        onSubmit={(e) => void handleSendMessage(e)}
        className="p-3 sm:p-4 bg-white border-t border-[var(--border)] flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type your message..."
          maxLength={2000}
          className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          className="p-2.5 rounded-2xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
