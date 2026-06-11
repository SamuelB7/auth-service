import { randomUUID } from 'node:crypto';
import { jwtRefreshExpiresInDays } from '../../config/auth.config';
import { CreateRefreshSessionInput } from '../domain/ports/identity.repository';
import { TokenService } from '../domain/ports/token-service';
import { daysFromNow, hashOpaqueToken } from './security';

export type CreatedRefreshSession = CreateRefreshSessionInput & {
  refreshToken: string;
};

export async function createRefreshSession(tokenService: TokenService, userId: string): Promise<CreatedRefreshSession> {
  const refreshTokenId = randomUUID();
  const refreshToken = await tokenService.signRefreshToken(userId, refreshTokenId);

  return {
    refreshToken,
    userId,
    refreshTokenId,
    refreshTokenHash: hashOpaqueToken(refreshToken),
    refreshTokenExpiresAt: daysFromNow(jwtRefreshExpiresInDays())
  };
}

