import { Inject, Injectable } from '@nestjs/common';
import { IDENTITY_REPOSITORY, IdentityRepository, SessionView } from '../../domain/ports/identity.repository';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../../domain/ports/token-service';
import { authError } from '../auth.errors';
import { hashOpaqueToken } from '../security';
import { createRefreshSession } from '../session.factory';
import { createTokenPair } from '../token-pair.factory';

@Injectable()
export class ManageSessionsUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService
  ) {}

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.getValidStoredRefreshToken(refreshToken, payload.sub, payload.tokenId);
    const session = await createRefreshSession(this.tokenService, storedToken.userId);

    await this.identityRepository.rotateRefreshToken({
      currentRefreshTokenId: storedToken.id,
      newSession: session
    });

    return createTokenPair(this.tokenService, storedToken.user, session.refreshToken);
  }

  async signout(refreshToken: string): Promise<{ revoked: true }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.getValidStoredRefreshToken(refreshToken, payload.sub, payload.tokenId);

    await this.identityRepository.revokeRefreshToken(storedToken.id);

    return { revoked: true };
  }

  list(userId: string): Promise<SessionView[]> {
    return this.identityRepository.listActiveSessions(userId);
  }

  async revoke(userId: string, sessionId: string): Promise<{ revoked: true }> {
    const revoked = await this.identityRepository.revokeUserSession(userId, sessionId);

    if (!revoked) {
      throw authError('INVALID_REFRESH_TOKEN', 'Session not found.');
    }

    return { revoked: true };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw authError('INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    }
  }

  private async getValidStoredRefreshToken(refreshToken: string, userId: string, tokenId: string) {
    const storedToken = await this.identityRepository.findRefreshTokenByHash(hashOpaqueToken(refreshToken));

    if (!storedToken || storedToken.id !== tokenId || storedToken.userId !== userId) {
      throw authError('INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    }

    if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw authError('INVALID_REFRESH_TOKEN', 'Refresh token revoked or expired.');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw authError('USER_NOT_ACTIVE', 'User is not active.');
    }

    return storedToken;
  }
}

