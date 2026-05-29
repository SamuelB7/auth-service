import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { jwtAccessExpiresIn, jwtAccessSecret, jwtRefreshExpiresInDays, jwtRefreshSecret } from '../config/auth.config';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { SigninDto } from '../dtos/signin.dto';
import { SignupDto } from '../dtos/signup.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { AccessTokenPayload, RefreshTokenPayload } from '../types/token-payloads';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService
  ) {}

  async signup(dto: SignupDto): Promise<TokenPair> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already registered.');
    }

    const userId = randomUUID();
    const passwordHash = await argon2.hash(dto.password);
    const session = await this.createRefreshSession(userId);

    const user = await this.authRepository.createUserWithSession({
      userId,
      email,
      name: dto.name?.trim(),
      passwordHash,
      refreshTokenId: session.refreshTokenId,
      refreshTokenHash: session.refreshTokenHash,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
      outboxEvent: {
        topic: 'auth.user.registered.v1',
        type: 'auth.user.registered.v1',
        payload: {
          userId,
          email,
          occurredAt: new Date().toISOString()
        }
      }
    });

    return this.createTokenPair(user, session.refreshToken);
  }

  async signin(dto: SigninDto): Promise<TokenPair> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.authRepository.findUserByEmail(email);

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const session = await this.createRefreshSession(user.id);
    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenId: session.refreshTokenId,
      refreshTokenHash: session.refreshTokenHash,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt
    });

    return this.createTokenPair(user, session.refreshToken);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const currentToken = await this.getValidStoredRefreshToken(dto.refreshToken, payload);
    const session = await this.createRefreshSession(currentToken.userId);

    await this.authRepository.rotateRefreshToken({
      currentRefreshTokenId: currentToken.id,
      newRefreshTokenId: session.refreshTokenId,
      userId: currentToken.userId,
      newRefreshTokenHash: session.refreshTokenHash,
      newRefreshTokenExpiresAt: session.refreshTokenExpiresAt
    });

    return this.createTokenPair(currentToken.user, session.refreshToken);
  }

  async signout(dto: RefreshTokenDto): Promise<{ revoked: true }> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const currentToken = await this.getValidStoredRefreshToken(dto.refreshToken, payload);

    await this.authRepository.revokeRefreshToken(currentToken.id);

    return { revoked: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<TokenPair> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const currentPasswordMatches = await argon2.verify(user.passwordHash, dto.currentPassword);

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Invalid current password.');
    }

    const newPasswordMatchesCurrent = await argon2.verify(user.passwordHash, dto.newPassword);

    if (newPasswordMatchesCurrent) {
      throw new BadRequestException('New password must be different from current password.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const session = await this.createRefreshSession(user.id);
    const updatedUser = await this.authRepository.changePasswordAndRotateSessions({
      userId: user.id,
      passwordHash,
      refreshTokenId: session.refreshTokenId,
      refreshTokenHash: session.refreshTokenHash,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
      outboxEvent: {
        topic: 'auth.user.password_changed.v1',
        type: 'auth.user.password_changed.v1',
        payload: {
          userId: user.id,
          email: user.email,
          occurredAt: new Date().toISOString()
        }
      }
    });

    return this.createTokenPair(updatedUser, session.refreshToken);
  }

  private async createRefreshSession(userId: string) {
    const refreshTokenId = randomUUID();
    const refreshToken = await this.signRefreshToken(userId, refreshTokenId);

    return {
      refreshToken,
      refreshTokenId,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      refreshTokenExpiresAt: this.refreshTokenExpiresAt()
    };
  }

  private async createTokenPair(user: User, refreshToken: string): Promise<TokenPair> {
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: jwtAccessExpiresIn()
    };
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtAccessSecret(),
      expiresIn: jwtAccessExpiresIn() as never
    });
  }

  private signRefreshToken(userId: string, refreshTokenId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      tokenId: refreshTokenId
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret(),
      expiresIn: `${jwtRefreshExpiresInDays()}d` as never
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: jwtRefreshSecret()
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private async getValidStoredRefreshToken(refreshToken: string, payload: RefreshTokenPayload) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.id !== payload.tokenId || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired.');
    }

    return storedToken;
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + jwtRefreshExpiresInDays() * 24 * 60 * 60 * 1000);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

