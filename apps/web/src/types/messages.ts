export interface ConversationParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'host' | 'guest';
}

export interface ConversationSummary {
  id: string;
  property: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
  };
  otherParticipant: ConversationParticipant;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string;
  bookingReference?: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderUserId: string;
  clientMessageId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  isSending?: boolean;
}

export type MessageResponse = MessageItem;

export interface PaginatedMessagesResponse {
  data: MessageItem[];
  nextCursor: string | null;
}

export interface CreateConversationInput {
  propertySlug: string;
  bookingReference?: string;
}

export interface SendMessageInput {
  clientMessageId: string;
  content: string;
}
