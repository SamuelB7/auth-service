import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtAccessExpiresIn, jwtAccessSecret, jwtRefreshExpiresInDays, jwtRefreshSecret } from '../../../config/auth.config';
import { IdentityUser } from '../../domain/identity-user';
import { RefreshTokenPayload, TokenService } from '../../domain/ports/token-service';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  roles: string[];
};

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(user: IdentityUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtAccessSecret(),
      expiresIn: jwtAccessExpiresIn() as never
    });
  }

  signRefreshToken(userId: string, refreshTokenId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      tokenId: refreshTokenId
    };

    return this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret(),
      expiresIn: `${jwtRefreshExpiresInDays()}d` as never
    });
  }

  verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
      secret: jwtRefreshSecret()
    });
  }

  accessTokenExpiresIn(): string {
    return jwtAccessExpiresIn();
  }
}

