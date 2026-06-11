import { AuthRole } from './auth-role';
import { UserStatus } from './user-status';

export type IdentityUser = {
  id: string;
  email: string;
  name?: string | null;
  passwordHash: string;
  status: UserStatus;
  roles: AuthRole[];
};

export function assertUserCanAuthenticate(user: IdentityUser): void {
  if (user.status !== 'ACTIVE') {
    throw new Error('USER_NOT_ACTIVE');
  }
}

