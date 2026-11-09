import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, AccountStatus } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockPasswordService: any;
  let mockTokenService: any;
  let mockRateLimitService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    mockPasswordService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
      hashToken: jest.fn().mockReturnValue('mock-sha256-hash'),
      verifyRefreshToken: jest.fn(),
    };

    mockRateLimitService = {
      checkRegisterLimit: jest.fn().mockResolvedValue(undefined),
      checkLoginLimit: jest.fn().mockResolvedValue(undefined),
      recordFailedLogin: jest.fn().mockResolvedValue(undefined),
      resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
      checkRefreshLimit: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      mockPrisma,
      mockPasswordService,
      mockTokenService,
      mockRateLimitService,
    );
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-uuid',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        role: UserRole.USER,
        status: AccountStatus.ACTIVE,
        emailVerified: false,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.register(
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'John@Example.com',
          password: 'Password123!',
        },
        { ip: '127.0.0.1' },
      );

      expect(result.user.email).toBe('john@example.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('Password123!');
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.register(
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'Password123!',
          },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and establish session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        role: UserRole.USER,
        status: AccountStatus.ACTIVE,
        emailVerified: false,
        tokenVersion: 0,
        createdAt: new Date(),
      });
      mockPasswordService.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login(
        { email: 'john@example.com', password: 'Password123!' },
        { ip: '127.0.0.1' },
      );

      expect(result.user.email).toBe('john@example.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(mockRateLimitService.resetLoginAttempts).toHaveBeenCalled();
    });

    it('should reject invalid password with generic UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
      });
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(
        authService.login(
          { email: 'john@example.com', password: 'WrongPassword!' },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRateLimitService.recordFailedLogin).toHaveBeenCalled();
    });

    it('should reject nonexistent email with generic UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login(
          { email: 'notfound@example.com', password: 'Password123!' },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRateLimitService.recordFailedLogin).toHaveBeenCalled();
    });

    it('should reject suspended user accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'suspended@example.com',
        passwordHash: 'hashed-password',
        status: AccountStatus.SUSPENDED,
      });
      mockPasswordService.compare.mockResolvedValue(true);

      await expect(
        authService.login(
          { email: 'suspended@example.com', password: 'Password123!' },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh token rotation & reuse detection', () => {
    it('should rotate token successfully on valid refresh request', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        jti: 'token-1',
        familyId: 'family-1',
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'john@example.com',
        status: AccountStatus.ACTIVE,
        role: UserRole.USER,
        tokenVersion: 0,
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        emailVerified: false,
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.refresh('valid-refresh-token', { ip: '127.0.0.1' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should detect reuse of a revoked refresh token and revoke entire family', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        jti: 'token-1',
        familyId: 'compromised-family-1',
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        familyId: 'compromised-family-1',
        revokedAt: new Date(Date.now() - 5000), // ALREADY REVOKED!
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        authService.refresh('reused-refresh-token', { ip: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify all family tokens revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          familyId: 'compromised-family-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should reject expired refresh token', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        jti: 'token-1',
        familyId: 'family-1',
        type: 'refresh',
      });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // EXPIRED
      });

      await expect(
        authService.refresh('expired-refresh-token', { ip: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout and logout-all', () => {
    it('should revoke current refresh token on logout', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await authService.logout('current-refresh-token');
      expect(res.message).toBe('Logged out successfully');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should revoke all tokens and increment tokenVersion on logoutAll', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await authService.logoutAll('user-1');
      expect(res.message).toBe('All sessions successfully logged out.');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });
});
