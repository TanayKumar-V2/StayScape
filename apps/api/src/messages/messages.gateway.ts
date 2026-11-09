import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MessagesService } from './messages.service';
import { AccountStatus } from '@prisma/client';
import { TOKEN_TYPE_ACCESS } from '../auth/auth.constants';

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  role: string;
}

interface SocketWithUser extends Socket {
  data: {
    user?: AuthenticatedSocketUser;
  };
}

/** Runtime caps applied to untyped socket payloads (sockets bypass DTO validation). */
const MAX_MESSAGE_CONTENT_LENGTH = 4000;
const MAX_CLIENT_MESSAGE_ID_LENGTH = 64;
const MAX_CONVERSATION_ID_LENGTH = 36;

/**
 * Socket.IO origins are validated statically at gateway definition time
 * (decorators run before any instance exists), mirroring main.ts CORS config.
 */
function getAllowedSocketOrigins(): string[] {
  return [
    process.env['WEB_ORIGIN'] ?? 'http://localhost:3000',
    ...(process.env['WEB_ORIGINS'] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];
}

@WebSocketGateway({
  cors: {
    // Strict static origin allow-list; a wildcard/reflected origin with
    // credentials is never accepted.
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = getAllowedSocketOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  },
  namespace: '/',
  // Bound raw payloads so oversized frames are rejected by Socket.IO itself
  // before reaching application handlers.
  maxHttpBufferSize: 64 * 1024,
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Authenticates the socket handshake using the HTTP-only stayscape_access cookie.
   */
  async handleConnection(client: SocketWithUser): Promise<void> {
    try {
      const cookieHeader = client.handshake.headers.cookie || '';
      let token: string | null = null;

      // Extract stayscape_access cookie
      const match = cookieHeader.match(/(?:^|;\s*)stayscape_access=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      } else if (client.handshake.auth?.token) {
        token = client.handshake.auth.token as string;
      }

      if (!token) {
        this.logger.warn(
          `Unauthorized socket connection attempt: no access token found (socket ${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('app.auth.accessTokenSecret') ?? '';
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
        secret,
        algorithms: ['HS256'],
      });

      if (
        !payload ||
        typeof payload.sub !== 'string' ||
        payload.type !== TOKEN_TYPE_ACCESS ||
        typeof payload.tokenVersion !== 'number' ||
        !Number.isInteger(payload.tokenVersion) ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        this.logger.warn(`Invalid JWT payload in socket connection (socket ${client.id})`);
        client.disconnect(true);
        return;
      }

      const subject = payload.sub;
      const tokenVersion = payload.tokenVersion;

      // Verify user account state and token version
      const user = await this.prisma.user.findUnique({
        where: { id: subject },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          tokenVersion: true,
        },
      });

      if (!user || user.status !== AccountStatus.ACTIVE || user.tokenVersion !== tokenVersion) {
        this.logger.warn(
          `User account invalid, suspended, or tokenVersion mismatch for socket ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      client.data.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      // Ephemeral presence tracking in Redis
      await this.setUserOnline(user.id, client.id);

      this.logger.log(`Socket client authenticated: user ${user.id} (${client.id})`);
    } catch (err: unknown) {
      this.logger.warn(
        `Socket authentication failed: ${err instanceof Error ? err.message : String(err)} (socket ${client.id})`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: SocketWithUser): Promise<void> {
    const userId = client.data.user?.id;
    if (userId) {
      await this.setUserOffline(userId, client.id);
      this.logger.log(`Socket disconnected: user ${userId} (${client.id})`);
    }
  }

  // ── Ephemeral Presence Helpers (Redis) ───────────────────────────────────

  private async setUserOnline(userId: string, socketId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client) return;

      await client.sadd(`presence:sockets:${userId}`, socketId);
      await client.set(`presence:user:${userId}`, 'online', 'EX', 180);
      this.server.emit('presence:updated', { userId, status: 'online' });
    } catch (err: unknown) {
      this.logger.warn(`Redis presence error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async setUserOffline(userId: string, socketId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client) return;

      await client.srem(`presence:sockets:${userId}`, socketId);
      const remaining = await client.scard(`presence:sockets:${userId}`);
      if (remaining === 0) {
        await client.del(`presence:user:${userId}`);
        this.server.emit('presence:updated', { userId, status: 'offline' });
      }
    } catch (err: unknown) {
      this.logger.warn(`Redis presence error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Gateway Events ───────────────────────────────────────────────────────

  /**
   * Validates an untyped message payload arriving over a socket (sockets bypass
   * the global DTO validation pipe).
   */
  private validateMessagePayload(payload: {
    conversationId?: unknown;
    clientMessageId?: unknown;
    content?: unknown;
  }): { conversationId: string; clientMessageId: string; content: string } | null {
    const { conversationId, clientMessageId, content } = payload ?? {};
    if (typeof conversationId !== 'string' || conversationId.length > MAX_CONVERSATION_ID_LENGTH) {
      return null;
    }
    if (
      typeof clientMessageId !== 'string' ||
      clientMessageId.length === 0 ||
      clientMessageId.length > MAX_CLIENT_MESSAGE_ID_LENGTH
    ) {
      return null;
    }
    if (
      typeof content !== 'string' ||
      content.trim().length === 0 ||
      content.length > MAX_MESSAGE_CONTENT_LENGTH
    ) {
      return null;
    }
    return { conversationId, clientMessageId, content };
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: unknown },
  ) {
    const user = client.data.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const { conversationId } = payload ?? {};
    if (
      typeof conversationId !== 'string' ||
      conversationId.length === 0 ||
      conversationId.length > MAX_CONVERSATION_ID_LENGTH
    ) {
      return { status: 'error', message: 'conversationId is required' };
    }

    try {
      await this.messagesService.verifyParticipant(user.id, conversationId);
      await client.join(`conversation:${conversationId}`);
      this.logger.log(`User ${user.id} joined conversation room: ${conversationId}`);
      return { status: 'ok', conversationId };
    } catch (err: unknown) {
      return { status: 'error', message: err instanceof Error ? err.message : 'Unauthorized' };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody()
    payload: { conversationId?: unknown; clientMessageId?: unknown; content?: unknown },
  ) {
    const user = client.data.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const validated = this.validateMessagePayload(payload);
    if (!validated) {
      return {
        status: 'error',
        message: `Message must be 1-4000 characters with a clientMessageId of at most 64 characters and a valid conversationId`,
      };
    }
    const { conversationId, clientMessageId, content } = validated;

    try {
      // 1. Persist to PostgreSQL first
      const savedMessage = await this.messagesService.saveMessage(user.id, conversationId, {
        clientMessageId,
        content,
      });

      // 2. Broadcast to room
      this.server.to(`conversation:${conversationId}`).emit('message:new', savedMessage);

      // 3. Return acknowledgement to sender
      return { status: 'ok', message: savedMessage };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      return { status: 'error', message: msg };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: unknown },
  ) {
    const user = client.data.user;
    if (!user) return;

    const { conversationId } = payload ?? {};
    if (
      typeof conversationId !== 'string' ||
      conversationId.length === 0 ||
      conversationId.length > MAX_CONVERSATION_ID_LENGTH
    ) {
      return;
    }

    try {
      const result = await this.messagesService.markMessagesRead(user.id, conversationId);
      this.server.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        readerUserId: user.id,
        readAt: result.readAt,
      });
      return { status: 'ok', ...result };
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to mark messages as read: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Identity-preserving typing indicator. A client may only emit typing
   * signals for conversations it has actually verified and joined, so a user
   * who knows a foreign conversation ID cannot inject spoofed activity.
   * The userId broadcast is always the authenticated socket user — never a
   * client-supplied value.
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: unknown },
  ) {
    const user = client.data.user;
    const conversationId = payload?.conversationId;
    if (
      !user ||
      typeof conversationId !== 'string' ||
      conversationId.length === 0 ||
      conversationId.length > MAX_CONVERSATION_ID_LENGTH ||
      // Requires prior conversation:join membership — prevents injecting
      // typing activity into conversations the user cannot access.
      !client.rooms.has(`conversation:${conversationId}`)
    ) {
      return;
    }

    client.to(`conversation:${conversationId}`).emit('typing:started', {
      conversationId,
      userId: user.id,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId?: unknown },
  ) {
    const user = client.data.user;
    const conversationId = payload?.conversationId;
    if (
      !user ||
      typeof conversationId !== 'string' ||
      conversationId.length === 0 ||
      conversationId.length > MAX_CONVERSATION_ID_LENGTH ||
      !client.rooms.has(`conversation:${conversationId}`)
    ) {
      return;
    }

    client.to(`conversation:${conversationId}`).emit('typing:stopped', {
      conversationId,
      userId: user.id,
    });
  }

  @SubscribeMessage('presence:update')
  async handlePresenceHeartbeat(@ConnectedSocket() client: SocketWithUser) {
    const user = client.data.user;
    if (!user) return;

    try {
      const redisClient = this.redisService.getClient();
      if (redisClient) {
        await redisClient.set(`presence:user:${user.id}`, 'online', 'EX', 180);
      }
    } catch {
      // Graceful degradation
    }
  }
}
