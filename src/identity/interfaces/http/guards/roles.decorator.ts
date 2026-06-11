import { SetMetadata } from '@nestjs/common';
import { AuthRole } from '../../../domain/auth-role';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const RequireRoles = (...roles: AuthRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

