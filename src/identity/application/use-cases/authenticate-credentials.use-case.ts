import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mfaChallengeRequestedEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../../domain/ports/token-service';
import { authError } from '../auth.errors';
import { createOtpCode, minutesFromNow } from '../security';
import { createRefreshSession } from '../session.factory';
import { createTokenPair } from '../token-pair.factory';
import { normalizeEmail } from '../normalize-email';

export type SigninResult =
  | TokenPair
  | {
      mfaRequired: true;
      challengeId: string;
      deliveryChannel: 'EMAIL';
      tokenType: 'MFA_CHALLENGE';
      expiresIn: '10m';
    };

@Injectable()
export class AuthenticateCredentialsUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService
  ) {}

  async execute(input: { email: string; password: string }): Promise<SigninResult> {
    const email = normalizeEmail(input.email);
    const user = await this.identityRepository.findUserByEmail(email);

    if (!user || !(await this.passwordHasher.verify(user.passwordHash, input.password))) {
      throw authError('INVALID_CREDENTIALS', 'Invalid credentials.');
    }

    if (user.status !== 'ACTIVE') {
      throw authError('USER_NOT_ACTIVE', 'User is not active.');
    }

    const enabledMfaFactors = await this.identityRepository.findEnabledMfaFactorsByUserId(user.id);

    if (enabledMfaFactors.length > 0) {
      const factor = enabledMfaFactors[0];
      const code = createOtpCode();
      const challengeId = randomUUID();
      const challenge = await this.identityRepository.createMfaChallenge({
        challengeId,
        userId: user.id,
        factorId: factor.id,
        purpose: 'SIGNIN',
        challengeHash: await this.passwordHasher.hash(code),
        expiresAt: minutesFromNow(10),
        outboxEvent: mfaChallengeRequestedEvent({
          userId: user.id,
          email: user.email,
          challengeId,
          code
        })
      });

      return {
        mfaRequired: true,
        challengeId: challenge.id,
        deliveryChannel: 'EMAIL',
        tokenType: 'MFA_CHALLENGE',
        expiresIn: '10m'
      };
    }

    const session = await createRefreshSession(this.tokenService, user.id);
    await this.identityRepository.createSession(session);

    return createTokenPair(this.tokenService, user, session.refreshToken);
  }
}
