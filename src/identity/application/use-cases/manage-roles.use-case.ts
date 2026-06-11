import { Inject, Injectable } from '@nestjs/common';
import { AuthRole, AUTH_ROLES } from '../../domain/auth-role';
import { userRolesChangedEvent } from '../../domain/identity-events';
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../domain/ports/identity.repository';
import { authError } from '../auth.errors';

@Injectable()
export class ManageRolesUseCase {
  constructor(@Inject(IDENTITY_REPOSITORY) private readonly identityRepository: IdentityRepository) {}

  async getRoles(userId: string): Promise<{ userId: string; roles: AuthRole[] }> {
    const user = await this.identityRepository.findUserById(userId);

    if (!user) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    return { userId: user.id, roles: user.roles };
  }

  async replaceRoles(input: { actorUserId: string; userId: string; roles: AuthRole[] }): Promise<{ userId: string; roles: AuthRole[] }> {
    const invalidRole = input.roles.find((role) => !AUTH_ROLES.includes(role));

    if (invalidRole) {
      throw authError('ROLE_REQUIRED', `Invalid role: ${invalidRole}`);
    }

    const existingUser = await this.identityRepository.findUserById(input.userId);

    if (!existingUser) {
      throw authError('USER_NOT_FOUND', 'User not found.');
    }

    const user = await this.identityRepository.replaceUserRoles({
      userId: input.userId,
      roles: [...new Set(input.roles)],
      actorUserId: input.actorUserId,
      outboxEvent: userRolesChangedEvent({
        userId: input.userId,
        roles: [...new Set(input.roles)],
        actorUserId: input.actorUserId
      })
    });

    return { userId: user.id, roles: user.roles };
  }
}
