import { IdentityUser } from '../domain/identity-user';
import { TokenPair, TokenService } from '../domain/ports/token-service';

export async function createTokenPair(tokenService: TokenService, user: IdentityUser, refreshToken: string): Promise<TokenPair> {
  return {
    accessToken: await tokenService.signAccessToken(user),
    refreshToken,
    tokenType: 'Bearer',
    accessTokenExpiresIn: tokenService.accessTokenExpiresIn()
  };
}

