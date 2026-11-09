import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationStatus, PropertyStatus } from '@prisma/client';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockPrisma = {
    property: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisClient = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('createOrGetConversation', () => {
    it('throws NotFoundException if property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrGetConversation('user-1', { propertySlug: 'unknown-slug' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if guest is also the host (prevent self-messaging)', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        title: 'Manali Cabin',
        slug: 'manali-cabin',
        status: PropertyStatus.PUBLISHED,
        hostProfile: {
          id: 'hp-1',
          userId: 'user-1', // same as caller
        },
      });

      await expect(
        service.createOrGetConversation('user-1', { propertySlug: 'manali-cabin' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing conversation if already created for this guest and property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        title: 'Manali Cabin',
        slug: 'manali-cabin',
        status: PropertyStatus.PUBLISHED,
        hostProfile: {
          id: 'hp-1',
          userId: 'host-user-2',
        },
      });

      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        propertyId: 'prop-1',
        guestUserId: 'guest-1',
        hostProfileId: 'hp-1',
        status: ConversationStatus.ACTIVE,
        lastMessagePreview: 'Hello',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        property: {
          id: 'prop-1',
          title: 'Manali Cabin',
          slug: 'manali-cabin',
          images: [],
        },
        hostProfile: {
          id: 'hp-1',
          userId: 'host-user-2',
          displayName: 'Vikram',
          user: { avatarUrl: null },
        },
        guestUser: {
          id: 'guest-1',
          firstName: 'Ananya',
          lastName: 'Sharma',
          avatarUrl: null,
        },
      });

      const res = await service.createOrGetConversation('guest-1', {
        propertySlug: 'manali-cabin',
      });
      expect(res.id).toBe('conv-1');
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates new conversation when none exists yet', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        title: 'Manali Cabin',
        slug: 'manali-cabin',
        status: PropertyStatus.PUBLISHED,
        hostProfile: {
          id: 'hp-1',
          userId: 'host-user-2',
        },
      });

      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-new-1',
        propertyId: 'prop-1',
        guestUserId: 'guest-1',
        hostProfileId: 'hp-1',
        status: ConversationStatus.ACTIVE,
        lastMessagePreview: null,
        lastMessageAt: null,
        createdAt: new Date(),
        property: {
          id: 'prop-1',
          title: 'Manali Cabin',
          slug: 'manali-cabin',
          images: [],
        },
        hostProfile: {
          id: 'hp-1',
          userId: 'host-user-2',
          displayName: 'Vikram',
          user: { avatarUrl: null },
        },
        guestUser: {
          id: 'guest-1',
          firstName: 'Ananya',
          lastName: 'Sharma',
          avatarUrl: null,
        },
      });

      const res = await service.createOrGetConversation('guest-1', {
        propertySlug: 'manali-cabin',
      });
      expect(res.id).toBe('conv-new-1');
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('saveMessage', () => {
    it('throws ForbiddenException if user is not a participant in the conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        guestUserId: 'guest-1',
        hostProfile: {
          userId: 'host-1',
          status: 'ACTIVE',
        },
        status: ConversationStatus.ACTIVE,
      });

      await expect(
        service.saveMessage('intruder-user', 'conv-1', {
          clientMessageId: 'cm_123',
          content: 'Hello!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('saves message to database and updates conversation lastMessageAt', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        guestUserId: 'guest-1',
        hostProfile: {
          userId: 'host-1',
          status: 'ACTIVE',
        },
        status: ConversationStatus.ACTIVE,
      });

      const savedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderUserId: 'guest-1',
        clientMessageId: 'cm_123',
        content: 'Hi, what time is check-in?',
        readAt: null,
        createdAt: new Date('2026-03-01T12:00:00Z'),
      };

      const mockTx = {
        message: {
          upsert: jest.fn().mockResolvedValue(savedMessage),
        },
        conversation: {
          update: jest.fn().mockResolvedValue({ id: 'conv-1' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => {
        return cb(mockTx);
      });

      const res = await service.saveMessage('guest-1', 'conv-1', {
        clientMessageId: 'cm_123',
        content: 'Hi, what time is check-in?',
      });

      expect(res.id).toBe('msg-1');
      expect(res.content).toBe('Hi, what time is check-in?');
      expect(mockTx.message.upsert).toHaveBeenCalled();
      expect(mockTx.conversation.update).toHaveBeenCalled();
    });
  });
});
