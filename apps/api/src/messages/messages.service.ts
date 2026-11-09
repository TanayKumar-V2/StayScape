import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Conversation, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

export interface SerializedConversationSummary {
  id: string;
  property: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
  };
  otherParticipant: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: 'host' | 'guest';
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string;
  bookingReference?: string | null;
}

export interface SerializedMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  clientMessageId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Safe display name for a guest to protect email/phone privacy.
   */
  private formatGuestDisplayName(firstName: string, lastName?: string | null): string {
    const cleanFirst = firstName?.trim() || 'Guest';
    if (!lastName || lastName.trim().length === 0) {
      return cleanFirst;
    }
    return `${cleanFirst} ${lastName.trim().charAt(0).toUpperCase()}.`;
  }

  /**
   * Redis-based rate limiting helper. Fails open gracefully if Redis is unavailable.
   */
  private async enforceRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client) return;

      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      if (current > limit) {
        throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `Redis rate limit check skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Resolves or creates the unique conversation between a guest and the property host.
   */
  async createOrGetConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<SerializedConversationSummary> {
    // 1. Rate limit: 10 new conversations per hour
    await this.enforceRateLimit(
      `ratelimit:conv:${userId}`,
      10,
      3600,
      'Too many new conversations created. Please wait before contacting another host.',
    );

    // 2. Fetch property and owner
    const property = await this.prisma.property.findUnique({
      where: { slug: dto.propertySlug },
      include: {
        hostProfile: true,
        images: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: { secureUrl: true },
        },
      },
    });

    if (!property || property.status !== PropertyStatus.PUBLISHED) {
      throw new NotFoundException(
        `Property "${dto.propertySlug}" was not found or is not published.`,
      );
    }

    // 3. Self-messaging prevention
    if (property.hostProfile.userId === userId) {
      throw new BadRequestException(
        'Hosts cannot create conversations with themselves on their own properties.',
      );
    }

    // 4. Validate optional booking reference
    let bookingId: string | null = null;
    if (dto.bookingReference) {
      const booking = await this.prisma.booking.findUnique({
        where: { bookingReference: dto.bookingReference },
        select: { id: true, userId: true, propertyId: true },
      });

      if (!booking || booking.userId !== userId || booking.propertyId !== property.id) {
        throw new BadRequestException(
          'The specified booking reference does not match this reservation and guest.',
        );
      }
      bookingId = booking.id;
    }

    // 5. Find or create unique conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        propertyId_guestUserId: {
          propertyId: property.id,
          guestUserId: userId,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: {
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { secureUrl: true },
            },
          },
        },
        hostProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            user: { select: { avatarUrl: true } },
          },
        },
        guestUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        booking: {
          select: { bookingReference: true },
        },
      },
    });

    if (!conversation) {
      const created = await this.prisma.conversation.create({
        data: {
          propertyId: property.id,
          guestUserId: userId,
          hostProfileId: property.hostProfile.id,
          bookingId: bookingId ?? undefined,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: {
                orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { secureUrl: true },
              },
            },
          },
          hostProfile: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              user: { select: { avatarUrl: true } },
            },
          },
          guestUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          booking: {
            select: { bookingReference: true },
          },
        },
      });
      conversation = created;
    } else if (bookingId && !conversation.bookingId) {
      // Update with booking if not previously linked
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { bookingId },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: {
                orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { secureUrl: true },
              },
            },
          },
          hostProfile: {
            select: {
              id: true,
              userId: true,
              displayName: true,
              user: { select: { avatarUrl: true } },
            },
          },
          guestUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          booking: {
            select: { bookingReference: true },
          },
        },
      });
    }

    return {
      id: conversation.id,
      property: {
        id: conversation.property.id,
        title: conversation.property.title,
        slug: conversation.property.slug,
        coverImageUrl: conversation.property.images[0]?.secureUrl ?? null,
      },
      otherParticipant: {
        id: conversation.hostProfile.userId,
        displayName: conversation.hostProfile.displayName,
        avatarUrl: conversation.hostProfile.user.avatarUrl ?? null,
        role: 'host',
      },
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
      unreadCount: 0,
      status: conversation.status,
      bookingReference: conversation.booking?.bookingReference ?? null,
    };
  }

  /**
   * Retrieves conversation inbox list for either guest or host.
   */
  async getUserConversations(userId: string): Promise<SerializedConversationSummary[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ guestUserId: userId }, { hostProfile: { userId } }],
        status: 'ACTIVE',
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: {
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { secureUrl: true },
            },
          },
        },
        hostProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            user: { select: { avatarUrl: true } },
          },
        },
        guestUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        booking: {
          select: { bookingReference: true },
        },
      },
    });

    // Compute unread count for each conversation
    const result: SerializedConversationSummary[] = await Promise.all(
      conversations.map(async (c) => {
        const isGuest = c.guestUserId === userId;
        const lastReadAt = isGuest ? c.guestLastReadAt : c.hostLastReadAt;

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            senderUserId: { not: userId },
            readAt: null,
            deletedAt: null,
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });

        const otherParticipant = isGuest
          ? {
              id: c.hostProfile.userId,
              displayName: c.hostProfile.displayName,
              avatarUrl: c.hostProfile.user.avatarUrl ?? null,
              role: 'host' as const,
            }
          : {
              id: c.guestUser.id,
              displayName: this.formatGuestDisplayName(c.guestUser.firstName, c.guestUser.lastName),
              avatarUrl: c.guestUser.avatarUrl ?? null,
              role: 'guest' as const,
            };

        return {
          id: c.id,
          property: {
            id: c.property.id,
            title: c.property.title,
            slug: c.property.slug,
            coverImageUrl: c.property.images[0]?.secureUrl ?? null,
          },
          otherParticipant,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
          unreadCount,
          status: c.status,
          bookingReference: c.booking?.bookingReference ?? null,
        };
      }),
    );

    return result;
  }

  /**
   * Verifies that the authenticated user is a valid participant of the conversation.
   */
  async verifyParticipant(
    userId: string,
    conversationId: string,
  ): Promise<Conversation & { hostProfileUserId: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        hostProfile: { select: { userId: true, status: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isGuest = conversation.guestUserId === userId;
    const isHost = conversation.hostProfile.userId === userId;

    if (!isGuest && !isHost) {
      throw new ForbiddenException(
        'You are not authorized to view or send messages in this conversation.',
      );
    }

    return {
      ...conversation,
      hostProfileUserId: conversation.hostProfile.userId,
    };
  }

  /**
   * Retrieves paginated messages for a conversation with cursor-based pagination.
   */
  async getMessages(userId: string, conversationId: string, query: MessageQueryDto) {
    const conversation = await this.verifyParticipant(userId, conversationId);

    const limit = query.limit ?? 30;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id ?? null;
    }

    // Mark unread messages sent by the other party as read
    const isGuest = conversation.guestUserId === userId;
    const now = new Date();

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderUserId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isGuest ? { guestLastReadAt: now } : { hostLastReadAt: now },
    });

    // Display chronological order (earliest to latest)
    const chronological = messages.reverse();

    return {
      data: chronological.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderUserId: m.senderUserId,
        clientMessageId: m.clientMessageId,
        content: m.content,
        readAt: m.readAt ? m.readAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }

  /**
   * Persists a message to PostgreSQL (used by Socket.IO & HTTP fallback).
   */
  async saveMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<SerializedMessage> {
    // 1. Rate limiting: 20 messages per minute per user
    await this.enforceRateLimit(
      `ratelimit:msg:${userId}`,
      20,
      60,
      'Message rate limit exceeded. Please wait a moment before sending another message.',
    );

    // 2. Verify participant and conversation status
    const conversation = await this.verifyParticipant(userId, conversationId);

    if (conversation.status !== 'ACTIVE') {
      throw new BadRequestException(
        'This conversation is archived and cannot receive new messages.',
      );
    }

    const cleanContent = dto.content.trim();
    if (cleanContent.length === 0) {
      throw new BadRequestException('Message content cannot be blank.');
    }

    // 3. Upsert / deduplicate by (conversationId, senderUserId, clientMessageId)
    const now = new Date();
    const preview = cleanContent.length > 100 ? `${cleanContent.slice(0, 97)}...` : cleanContent;

    const message = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.message.upsert({
        where: {
          conversationId_senderUserId_clientMessageId: {
            conversationId,
            senderUserId: userId,
            clientMessageId: dto.clientMessageId,
          },
        },
        create: {
          conversationId,
          senderUserId: userId,
          clientMessageId: dto.clientMessageId,
          content: cleanContent,
        },
        update: {},
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: now,
          lastMessagePreview: preview,
        },
      });

      return saved;
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      clientMessageId: message.clientMessageId,
      content: message.content,
      readAt: message.readAt ? message.readAt.toISOString() : null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Marks unread messages as read and returns reader details.
   */
  async markMessagesRead(
    userId: string,
    conversationId: string,
  ): Promise<{ readCount: number; readAt: string }> {
    const conversation = await this.verifyParticipant(userId, conversationId);
    const now = new Date();

    const updateRes = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderUserId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    const isGuest = conversation.guestUserId === userId;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isGuest ? { guestLastReadAt: now } : { hostLastReadAt: now },
    });

    return {
      readCount: updateRes.count,
      readAt: now.toISOString(),
    };
  }
}
