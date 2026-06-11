import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { userRegisteredEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher';
import { TOKEN_SERVICE, TokenPair, TokenService } from '../../domain/ports/token-service';
import { authError } from '../auth.errors';
import { createRefreshSession } from '../session.factory';
import { createTokenPair } from '../token-pair.factory';
import { normalizeEmail } from '../normalize-email';

export type RegisterIdentityInput = {
  email: string;
  password: string;
  name?: string;
};

@Injectable()
export class RegisterCustomerUseCase {
  constructor(
    @Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService
  ) {}

  async execute(input: RegisterIdentityInput): Promise<TokenPair> {
    const email = normalizeEmail(input.email);
    const existingUser = await this.identityRepository.findUserByEmail(email);

    if (existingUser) {
      throw authError('EMAIL_ALREADY_REGISTERED', 'Email already registered.');
    }

    const userId = randomUUID();
    const session = await createRefreshSession(this.tokenService, userId);
    const user = await this.identityRepository.createUserWithSession({
      userId,
      email,
      name: input.name?.trim(),
      passwordHash: await this.passwordHasher.hash(input.password),
      role: 'CUSTOMER',
      session,
      outboxEvent: userRegisteredEvent({ userId, email, role: 'CUSTOMER' })
    });

    return createTokenPair(this.tokenService, user, session.refreshToken);
  }
}

