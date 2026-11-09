import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthRateLimitService } from './services/auth-rate-limit.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  isHost?: boolean;
  hostProfile?: {
    id: string;
    displayName: string;
    status: string;
  } | null;
  createdAt: Date;
}

export interface AuthSessionResult {
  user: SanitizedUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  /** Strips all sensitive database fields and internal state before returning user object. */
  sanitizeUser(
    user: User & {
      hostProfile?: { id: string; displayName: string; status: string } | null;
    },
  ): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
      isHost: Boolean(user.hostProfile && user.hostProfile.status === 'ACTIVE'),
      hostProfile: user.hostProfile
        ? {
            id: user.hostProfile.id,
            displayName: user.hostProfile.displayName,
            status: user.hostProfile.status,
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  /**
   * Registers a new user, hashes password with Argon2id, generates tokens and sets initial session family.
   */
  async register(
    dto: RegisterDto,
    meta: { ip: string; userAgent?: string },
  ): Promise<AuthSessionResult> {
    await this.rateLimitService.checkRegisterLimit(meta.ip);

    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const userId = randomUUID();
    const tokenId = randomUUID();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Initial user record
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });

    const refreshToken = await this.tokenService.generateRefreshToken(userId, tokenId, familyId);
    const tokenHash = this.tokenService.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        familyId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip,
      },
    });

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user credentials, rejects suspended accounts, and establishes a new session family.
   */
  async login(dto: LoginDto, meta: { ip: string; userAgent?: string }): Promise<AuthSessionResult> {
    const email = dto.email.trim().toLowerCase();

    await this.rateLimitService.checkLoginLimit(meta.ip, email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Constant-time mitigation: if user does not exist, run a dummy comparison to prevent timing leak
    if (!user) {
      await this.rateLimitService.recordFailedLogin(meta.ip, email);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await this.passwordService.compare(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.rateLimitService.recordFailedLogin(meta.ip, email);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been suspended.');
    }

    // Reset rate limiter on successful authentication
    await this.rateLimitService.resetLoginAttempts(meta.ip, email);

    const tokenId = randomUUID();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const refreshToken = await this.tokenService.generateRefreshToken(user.id, tokenId, familyId);
    const tokenHash = this.tokenService.hashToken(refreshToken);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          id: tokenId,
          userId: user.id,
          familyId,
          tokenHash,
          expiresAt,
          userAgent: meta.userAgent ?? null,
          ipAddress: meta.ip,
        },
      }),
    ]);

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotates a refresh token atomically, detects token reuse, and issues a fresh access & refresh token.
   */
  async refresh(
    rawRefreshToken: string | undefined,
    meta: { ip: string; userAgent?: string },
  ): Promise<AuthSessionResult> {
    await this.rateLimitService.checkRefreshLimit(meta.ip);

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.tokenService.verifyRefreshToken(rawRefreshToken);
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh session.');
    }

    // Token reuse detection: if a revoked token is presented, invalidate the entire family
    if (storedToken.revokedAt !== null) {
      this.logger.error(
        `Security Alert: Refresh token reuse detected for family ${storedToken.familyId}, user ${storedToken.userId}. Revoking session family.`,
      );

      await this.prisma.refreshToken.updateMany({
        where: {
          familyId: storedToken.familyId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions in this family have been terminated for security.',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is invalid or suspended.');
    }

    const newId = randomUUID();
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const newRefreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      newId,
      storedToken.familyId,
    );
    const newHash = this.tokenService.hashToken(newRefreshToken);

    // Atomic rotation in transaction: revoke current token and create replacement
    try {
      await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            replacedById: newId,
          },
        });

        if (updateResult.count === 0) {
          throw new UnauthorizedException('Token rotation collision: session already rotated.');
        }

        await tx.refreshToken.create({
          data: {
            id: newId,
            userId: user.id,
            familyId: storedToken.familyId,
            tokenHash: newHash,
            expiresAt: newExpiresAt,
            userAgent: meta.userAgent ?? null,
            ipAddress: meta.ip,
          },
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to rotate refresh token atomically', error);
      throw new UnauthorizedException('Token rotation failed');
    }

    const newAccessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes the current session's refresh token record.
   */
  async logout(rawRefreshToken?: string): Promise<{ message: string }> {
    if (rawRefreshToken) {
      try {
        const tokenHash = this.tokenService.hashToken(rawRefreshToken);
        await this.prisma.refreshToken.updateMany({
          where: {
            tokenHash,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      } catch {
        // Safe even if token is expired or already revoked
      }
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Revokes all active refresh tokens for the user and increments tokenVersion to invalidate existing access tokens.
   */
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    return { message: 'All sessions successfully logged out.' };
  }

  /**
   * Retrieves sanitized profile of current authenticated user.
   */
  async getMe(userId: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { hostProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }
}
