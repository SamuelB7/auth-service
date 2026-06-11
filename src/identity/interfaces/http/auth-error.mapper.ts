import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthApplicationError } from '../../application/auth.errors';

export function mapAuthError(error: unknown): never {
  if (!(error instanceof AuthApplicationError)) {
    throw error;
  }

  switch (error.code) {
    case 'EMAIL_ALREADY_REGISTERED':
      throw new ConflictException(error.message);
    case 'INVALID_CREDENTIALS':
    case 'INVALID_REFRESH_TOKEN':
    case 'USER_NOT_ACTIVE':
    case 'INVALID_PASSWORD':
    case 'INVALID_RESET_TOKEN':
    case 'INVALID_MFA_CHALLENGE':
      throw new UnauthorizedException(error.message);
    case 'USER_NOT_FOUND':
      throw new NotFoundException(error.message);
    case 'ROLE_REQUIRED':
      throw new ForbiddenException(error.message);
    case 'MFA_REQUIRED':
    case 'MFA_NOT_ENABLED':
      throw new BadRequestException(error.message);
  }
}

