import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.auth.accessTokenSecret')
          return 'test-access-token-secret-minimum-32-chars-long';
        if (key === 'app.auth.refreshTokenSecret')
          return 'test-refresh-token-secret-minimum-32-chars-long';
        if (key === 'app.auth.accessTokenExpiresIn') return '15m';
        if (key === 'app.auth.refreshTokenExpiresIn') return '7d';
        if (key === 'app.nodeEnv') return 'test';
        return undefined;
      }),
    } as unknown as ConfigService;

    tokenService = new TokenService(jwtService, configService);
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  it('should generate valid access token with minimal claims', async () => {
    const user = {
      id: 'uuid-1234',
      email: 'test@example.com',
      role: 'USER',
      tokenVersion: 0,
    };

    const token = await tokenService.generateAccessToken(user);
    expect(token).toBeDefined();

    const decoded = jwtService.decode(token) as {
      sub: string;
      email: string;
      role: string;
      tokenVersion: number;
      type: string;
    };
    expect(decoded.sub).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
    expect(decoded.tokenVersion).toBe(0);
    expect(decoded.type).toBe('access');
  });

  it('should generate and verify refresh token with sub, jti, and familyId', async () => {
    const userId = 'user-uuid-1';
    const tokenId = 'token-uuid-1';
    const familyId = 'family-uuid-1';

    const token = await tokenService.generateRefreshToken(userId, tokenId, familyId);
    expect(token).toBeDefined();

    const verified = await tokenService.verifyRefreshToken(token);
    expect(verified.sub).toBe(userId);
    expect(verified.jti).toBe(tokenId);
    expect(verified.familyId).toBe(familyId);
    expect(verified.type).toBe('refresh');
  });

  it('rejects refresh tokens signed with an unsupported algorithm', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-uuid-1',
        jti: 'token-uuid-1',
        familyId: 'family-uuid-1',
        type: 'refresh',
      },
      {
        secret: 'test-refresh-token-secret-minimum-32-chars-long',
        algorithm: 'HS384',
        expiresIn: '7d',
      },
    );

    await expect(tokenService.verifyRefreshToken(token)).rejects.toThrow('Invalid or expired');
  });

  it('should produce deterministic SHA-256 token hash', () => {
    const rawToken = 'sample-random-refresh-token-string';
    const hash1 = tokenService.hashToken(rawToken);
    const hash2 = tokenService.hashToken(rawToken);

    expect(hash1).toEqual(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('should return correct cookie configurations', () => {
    const accessCookie = tokenService.getAccessCookieOptions();
    expect(accessCookie.httpOnly).toBe(true);
    expect(accessCookie.sameSite).toBe('lax');
    expect(accessCookie.path).toBe('/');
    expect(accessCookie.maxAge).toBe(15 * 60 * 1000);

    const refreshCookie = tokenService.getRefreshCookieOptions();
    expect(refreshCookie.httpOnly).toBe(true);
    expect(refreshCookie.sameSite).toBe('lax');
    expect(refreshCookie.path).toBe('/api/v1/auth');
    expect(refreshCookie.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
