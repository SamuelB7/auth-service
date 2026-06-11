import { Inject, Injectable } from '@nestjs/common';
import { passwordChangedEvent, passwordResetRequestedEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../../domain/ports/token-service';
import { authError } from '../auth.errors';
import { createOpaqueToken, hashOpaqueToken, minutesFromNow } from '../security';
import { normalizeEmail } from '../normalize-email';
import { createRefreshSession } from '../session.factory';
import { createTokenPair } from '../token-pair.factory';

@Injectable()
export class ManagePasswordUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService
  ) {}

  async requestReset(emailInput: string): Promise<{ requested: true }> {
    const email = normalizeEmail(emailInput);
    const user = await this.identityRepository.findUserByEmail(email);

    if (!user || user.status !== 'ACTIVE') {
      return { requested: true };
    }

    const resetToken = createOpaqueToken();
    await this.identityRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashOpaqueToken(resetToken),
      expiresAt: minutesFromNow(30),
      outboxEvent: passwordResetRequestedEvent({
        userId: user.id,
        email: user.email,
        resetToken
      })
    });

    return { requested: true };
  }

  async confirmReset(input: { resetToken: string; newPassword: string }): Promise<{ changed: true }> {
    const resetToken = await this.identityRepository.findPasswordResetTokenByHash(hashOpaqueToken(input.resetToken));

    if (!resetToken || resetToken.consumedAt || resetToken.expiresAt <= new Date()) {
      throw authError('INVALID_RESET_TOKEN', 'Invalid or expired reset token.');
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.identityRepository.consumePasswordResetTokenAndChangePassword({
      resetTokenId: resetToken.id,
      userId: resetToken.userId,
      passwordHash,
      outboxEvent: passwordChangedEvent({
        userId: resetToken.user.id,
        email: resetToken.user.email
      })
    });

    return { changed: true };
  }

  async changeAuthenticatedPassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<TokenPair> {
    const user = await this.identityRepository.findUserById(input.userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    if (!(await this.passwordHasher.verify(user.passwordHash, input.currentPassword))) {
      throw authError('INVALID_PASSWORD', 'Invalid current password.');
    }

    if (await this.passwordHasher.verify(user.passwordHash, input.newPassword)) {
      throw authError('INVALID_PASSWORD', 'New password must be different from current password.');
    }

    const session = await createRefreshSession(this.tokenService, user.id);
    const updatedUser = await this.identityRepository.changePasswordAndRotateSessions({
      userId: user.id,
      passwordHash: await this.passwordHasher.hash(input.newPassword),
      session,
      outboxEvent: passwordChangedEvent({
        userId: user.id,
        email: user.email
      })
    });

    return createTokenPair(this.tokenService, updatedUser, session.refreshToken);
  }
}
