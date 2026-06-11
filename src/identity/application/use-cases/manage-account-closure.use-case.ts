import { Inject, Injectable } from '@nestjs/common';
import { userDeactivatedEvent, userDeletionRequestedEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { authError } from '../auth.errors';

@Injectable()
export class ManageAccountClosureUseCase {
  constructor(@Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository) {}

  async deactivate(input: { userId: string; reason?: string }): Promise<{ status: 'DEACTIVATED' }> {
    const user = await this.identityRepository.findUserById(input.userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    await this.identityRepository.updateAccountStatus({
      userId: user.id,
      status: 'DEACTIVATED',
      closureType: 'DEACTIVATION',
      reason: input.reason,
      outboxEvent: userDeactivatedEvent({
        userId: user.id,
        email: user.email,
        reason: input.reason
      })
    });

    return { status: 'DEACTIVATED' };
  }

  async requestDeletion(input: { userId: string; reason?: string }): Promise<{ status: 'DELETION_REQUESTED' }> {
    const user = await this.identityRepository.findUserById(input.userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    await this.identityRepository.updateAccountStatus({
      userId: user.id,
      status: 'DELETION_REQUESTED',
      closureType: 'DELETION_REQUEST',
      reason: input.reason,
      outboxEvent: userDeletionRequestedEvent({
        userId: user.id,
        email: user.email,
        reason: input.reason
      })
    });

    return { status: 'DELETION_REQUESTED' };
  }
}

