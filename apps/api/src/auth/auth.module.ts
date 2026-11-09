import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OriginGuard } from './guards/origin.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthRateLimitService } from './services/auth-rate-limit.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    AuthRateLimitService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OriginGuard,
  ],
  exports: [AuthService, PasswordService, TokenService, JwtAuthGuard, RolesGuard, OriginGuard],
})
export class AuthModule {}
