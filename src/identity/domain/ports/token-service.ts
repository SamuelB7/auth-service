import { IdentityUser } from '../identity-user';

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export type RefreshTokenPayload = {
  sub: string;
  tokenId: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
};

export interface TokenService {
  signAccessToken(user: IdentityUser): Promise<string>;
  signRefreshToken(userId: string, refreshTokenId: string): Promise<string>;
  verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload>;
  accessTokenExpiresIn(): string;
}

