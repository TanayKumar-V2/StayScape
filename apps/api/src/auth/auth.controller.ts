import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AUTH_COOKIE_ACCESS, AUTH_COOKIE_REFRESH } from './auth.constants';
import { AuthService, SanitizedUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OriginGuard } from './guards/origin.guard';
import { TokenService } from './services/token.service';
import { extractClientIp } from '../common/utils/client-ip';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  private getRequestMeta(req: Request): { ip: string; userAgent?: string } {
    // X-Forwarded-For is honoured only when the direct socket peer is a
    // configured trusted proxy (TRUSTED_PROXIES). Untrusted header values are
    // ignored so a forged header cannot rotate rate-limit keys.
    const trustedProxies = (this.configService.get<string[]>('app.trustedProxies') ?? []).slice();
    const ip = extractClientIp(req, trustedProxies);
    const userAgent = req.headers['user-agent'];
    return { ip, userAgent };
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new guest account' })
  @ApiResponse({ status: 201, description: 'User registered successfully and cookies set' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email address already exists' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUser> {
    const meta = this.getRequestMeta(req);
    const session = await this.authService.register(dto, meta);

    res.cookie(AUTH_COOKIE_ACCESS, session.accessToken, this.tokenService.getAccessCookieOptions());
    res.cookie(
      AUTH_COOKIE_REFRESH,
      session.refreshToken,
      this.tokenService.getRefreshCookieOptions(),
    );

    return session.user;
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Logged in successfully and cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid email or password / Account suspended' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUser> {
    const meta = this.getRequestMeta(req);
    const session = await this.authService.login(dto, meta);

    res.cookie(AUTH_COOKIE_ACCESS, session.accessToken, this.tokenService.getAccessCookieOptions());
    res.cookie(
      AUTH_COOKIE_REFRESH,
      session.refreshToken,
      this.tokenService.getRefreshCookieOptions(),
    );

    return session.user;
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Session tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or reused refresh token' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUser> {
    const rawRefreshToken = req.cookies?.[AUTH_COOKIE_REFRESH] as string | undefined;
    const meta = this.getRequestMeta(req);
    const session = await this.authService.refresh(rawRefreshToken, meta);

    res.cookie(AUTH_COOKIE_ACCESS, session.accessToken, this.tokenService.getAccessCookieOptions());
    res.cookie(
      AUTH_COOKIE_REFRESH,
      session.refreshToken,
      this.tokenService.getRefreshCookieOptions(),
    );

    return session.user;
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current session and clear auth cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const rawRefreshToken = req.cookies?.[AUTH_COOKIE_REFRESH] as string | undefined;
    const result = await this.authService.logout(rawRefreshToken);

    res.clearCookie(AUTH_COOKIE_ACCESS, this.tokenService.getClearAccessCookieOptions());
    res.clearCookie(AUTH_COOKIE_REFRESH, this.tokenService.getClearRefreshCookieOptions());

    return result;
  }

  @UseGuards(JwtAuthGuard, OriginGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out from all devices and invalidate all access tokens' })
  @ApiResponse({ status: 200, description: 'All sessions terminated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const result = await this.authService.logoutAll(userId);

    res.clearCookie(AUTH_COOKIE_ACCESS, this.tokenService.getClearAccessCookieOptions());
    res.clearCookie(AUTH_COOKIE_REFRESH, this.tokenService.getClearRefreshCookieOptions());

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser('id') userId: string): Promise<SanitizedUser> {
    return this.authService.getMe(userId);
  }
}
