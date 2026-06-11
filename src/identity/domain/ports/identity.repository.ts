import { AuthRole } from '../auth-role';
import { DomainEventDraft } from '../domain-event';
import { IdentityUser } from '../identity-user';
import { UserStatus } from '../user-status';

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY');

export type RefreshSessionWithUser = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
  createdAt: Date;
  user: IdentityUser;
};

export type SessionView = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenId?: string | null;
};

export type PasswordResetTokenWithUser = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
  user: IdentityUser;
};

export type MfaFactorRecord = {
  id: string;
  userId: string;
  type: 'EMAIL_OTP';
  target: string;
  status: 'PENDING' | 'ENABLED' | 'DISABLED';
};

export type MfaChallengeRecord = {
  id: string;
  userId: string;
  factorId?: string | null;
  purpose: 'ENROLLMENT' | 'SIGNIN';
  challengeHash: string;
  expiresAt: Date;
  verifiedAt?: Date | null;
  consumedAt?: Date | null;
};

export type MfaChallengeWithUser = MfaChallengeRecord & {
  user: IdentityUser;
  factor?: MfaFactorRecord | null;
};

export type CreateRefreshSessionInput = {
  userId: string;
  refreshTokenId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
};

export interface IdentityRepository {
  findUserByEmail(email: string): Promise<IdentityUser | null>;
  findUserById(id: string): Promise<IdentityUser | null>;
  createUserWithSession(input: {
    userId: string;
    email: string;
    name?: string;
    passwordHash: string;
    role: Extract<AuthRole, 'CUSTOMER' | 'SELLER'>;
    session: CreateRefreshSessionInput;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser>;
  createSession(input: CreateRefreshSessionInput): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshSessionWithUser | null>;
  rotateRefreshToken(input: {
    currentRefreshTokenId: string;
    newSession: CreateRefreshSessionInput;
  }): Promise<void>;
  revokeRefreshToken(refreshTokenId: string): Promise<void>;
  listActiveSessions(userId: string): Promise<SessionView[]>;
  revokeUserSession(userId: string, sessionId: string): Promise<boolean>;
  changePasswordAndRotateSessions(input: {
    userId: string;
    passwordHash: string;
    session: CreateRefreshSessionInput;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser>;
  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    outboxEvent: DomainEventDraft;
  }): Promise<void>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenWithUser | null>;
  consumePasswordResetTokenAndChangePassword(input: {
    resetTokenId: string;
    userId: string;
    passwordHash: string;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser>;
  findEnabledMfaFactorsByUserId(userId: string): Promise<MfaFactorRecord[]>;
  upsertPendingEmailMfaFactor(input: { userId: string; target: string }): Promise<MfaFactorRecord>;
  createMfaChallenge(input: {
    challengeId: string;
    userId: string;
    factorId?: string;
    purpose: 'ENROLLMENT' | 'SIGNIN';
    challengeHash: string;
    expiresAt: Date;
    outboxEvent: DomainEventDraft;
  }): Promise<MfaChallengeRecord>;
  findMfaChallengeById(challengeId: string): Promise<MfaChallengeWithUser | null>;
  enableMfaFactorFromChallenge(input: {
    challengeId: string;
    factorId: string;
    outboxEvent: DomainEventDraft;
  }): Promise<MfaFactorRecord>;
  consumeMfaSigninChallenge(challengeId: string): Promise<IdentityUser>;
  disableMfaFactorsForUser(input: { userId: string; outboxEvent: DomainEventDraft }): Promise<void>;
  replaceUserRoles(input: { userId: string; roles: AuthRole[]; actorUserId: string; outboxEvent: DomainEventDraft }): Promise<IdentityUser>;
  updateAccountStatus(input: {
    userId: string;
    status: UserStatus;
    closureType: 'DEACTIVATION' | 'DELETION_REQUEST';
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser>;
}
