import { AuthRole } from '../../domain/auth-role';

export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: AuthRole[];
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user: AuthenticatedUser;
};

