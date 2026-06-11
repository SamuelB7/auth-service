import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mfaDisabledEvent, mfaEnabledEvent, mfaEnrollmentRequestedEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../../domain/ports/token-service';
import { authError } from '../auth.errors';
import { createOtpCode, minutesFromNow } from '../security';
import { createRefreshSession } from '../session.factory';
import { createTokenPair } from '../token-pair.factory';

@Injectable()
export class ManageMfaUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService
  ) {}

  async enroll(userId: string): Promise<{ challengeId: string; deliveryChannel: 'EMAIL'; expiresIn: '10m' }> {
    const user = await this.identityRepository.findUserById(userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    const factor = await this.identityRepository.upsertPendingEmailMfaFactor({
      userId: user.id,
      target: user.email
    });
    const code = createOtpCode();
    const challengeId = randomUUID();

    const challenge = await this.identityRepository.createMfaChallenge({
      challengeId,
      userId: user.id,
      factorId: factor.id,
      purpose: 'ENROLLMENT',
      challengeHash: await this.passwordHasher.hash(code),
      expiresAt: minutesFromNow(10),
      outboxEvent: mfaEnrollmentRequestedEvent({
        userId: user.id,
        email: user.email,
        challengeId,
        code
      })
    });

    return {
      challengeId: challenge.id,
      deliveryChannel: 'EMAIL',
      expiresIn: '10m'
    };
  }

  async verifyEnrollment(input: { userId: string; challengeId: string; code: string }): Promise<{ enabled: true }> {
    const challenge = await this.identityRepository.findMfaChallengeById(input.challengeId);

    if (!challenge || challenge.userId !== input.userId || challenge.purpose !== 'ENROLLMENT' || !challenge.factorId) {
      throw authError('INVALID_MFA_CHALLENGE', 'Invalid MFA challenge.');
    }

    await this.assertValidChallengeCode(challenge, input.code);
    await this.identityRepository.enableMfaFactorFromChallenge({
      challengeId: challenge.id,
      factorId: challenge.factorId,
      outboxEvent: mfaEnabledEvent({
        userId: challenge.user.id,
        email: challenge.user.email
      })
    });

    return { enabled: true };
  }

  async verifySignin(input: { challengeId: string; code: string }): Promise<TokenPair> {
    const challenge = await this.identityRepository.findMfaChallengeById(input.challengeId);

    if (!challenge || challenge.purpose !== 'SIGNIN' || challenge.factor?.status !== 'ENABLED') {
      throw authError('INVALID_MFA_CHALLENGE', 'Invalid MFA challenge.');
    }

    await this.assertValidChallengeCode(challenge, input.code);
    const user = await this.identityRepository.consumeMfaSigninChallenge(challenge.id);

    if (user.status !== 'ACTIVE') {
      throw authError('USER_NOT_ACTIVE', 'User is not active.');
    }

    const session = await createRefreshSession(this.tokenService, user.id);
    await this.identityRepository.createSession(session);

    return createTokenPair(this.tokenService, user, session.refreshToken);
  }

  async disable(input: { userId: string; currentPassword: string }): Promise<{ disabled: true }> {
    const user = await this.identityRepository.findUserById(input.userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    if (!(await this.passwordHasher.verify(user.passwordHash, input.currentPassword))) {
      throw authError('INVALID_PASSWORD', 'Invalid current password.');
    }

    await this.identityRepository.disableMfaFactorsForUser({
      userId: user.id,
      outboxEvent: mfaDisabledEvent({
        userId: user.id,
        email: user.email
      })
    });

    return { disabled: true };
  }

  private async assertValidChallengeCode(challenge: { challengeHash: string; expiresAt: Date; consumedAt?: Date | null }, code: string): Promise<void> {
    if (challenge.consumedAt || challenge.expiresAt <= new Date()) {
      throw authError('INVALID_MFA_CHALLENGE', 'Invalid or expired MFA challenge.');
    }

    if (!(await this.passwordHasher.verify(challenge.challengeHash, code))) {
      throw authError('INVALID_MFA_CHALLENGE', 'Invalid MFA code.');
    }
  }
}
