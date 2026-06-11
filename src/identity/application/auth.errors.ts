export type AuthErrorCode =
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'USER_NOT_FOUND'
  | 'USER_NOT_ACTIVE'
  | 'INVALID_PASSWORD'
  | 'INVALID_RESET_TOKEN'
  | 'INVALID_MFA_CHALLENGE'
  | 'MFA_REQUIRED'
  | 'MFA_NOT_ENABLED'
  | 'ROLE_REQUIRED';

export class AuthApplicationError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string
  ) {
    super(message);
  }
}

export const authError = (code: AuthErrorCode, message: string) => new AuthApplicationError(code, message);

