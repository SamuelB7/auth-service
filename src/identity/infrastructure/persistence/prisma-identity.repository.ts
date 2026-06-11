import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthRole } from '../../domain/auth-role';
import { DomainEventDraft } from '../../domain/domain-event';
import { IdentityUser } from '../../domain/identity-user';
import {
  CreateRefreshSessionInput,
  IdentityRepository,
  MfaChallengeRecord,
  MfaChallengeWithUser,
  MfaFactorRecord,
  PasswordResetTokenWithUser,
  RefreshSessionWithUser,
  SessionView
} from '../../domain/ports/identity.repository';
import { UserStatus } from '../../domain/user-status';

type PrismaUserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;
type PrismaRefreshTokenWithUser = Prisma.RefreshTokenGetPayload<{ include: { user: { include: { roles: true } } } }>;
type PrismaPasswordResetTokenWithUser = Prisma.PasswordResetTokenGetPayload<{ include: { user: { include: { roles: true } } } }>;
type PrismaMfaChallengeWithUser = Prisma.MfaChallengeGetPayload<{
  include: { user: { include: { roles: true } }; factor: true };
}>;
type PrismaMfaFactor = Prisma.MfaFactorGetPayload<object>;

@Injectable()
export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<IdentityUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true }
    });

    return user ? this.mapUser(user) : null;
  }

  async findUserById(id: string): Promise<IdentityUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    });

    return user ? this.mapUser(user) : null;
  }

  createUserWithSession(input: {
    userId: string;
    email: string;
    name?: string;
    passwordHash: string;
    role: Extract<AuthRole, 'CUSTOMER' | 'SELLER'>;
    session: CreateRefreshSessionInput;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: input.userId,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          roles: {
            create: {
              role: input.role
            }
          }
        },
        include: { roles: true }
      });

      await tx.refreshToken.create({
        data: this.toRefreshTokenCreate(input.session)
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapUser(user);
    });
  }

  createSession(input: CreateRefreshSessionInput): Promise<void> {
    return this.prisma.refreshToken
      .create({
        data: this.toRefreshTokenCreate(input)
      })
      .then(() => undefined);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshSessionWithUser | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } }
    });

    return refreshToken ? this.mapRefreshToken(refreshToken) : null;
  }

  rotateRefreshToken(input: {
    currentRefreshTokenId: string;
    newSession: CreateRefreshSessionInput;
  }): Promise<void> {
    const now = new Date();

    return this.prisma
      .$transaction(async (tx) => {
        await tx.refreshToken.update({
          where: { id: input.currentRefreshTokenId },
          data: {
            revokedAt: now,
            replacedByTokenId: input.newSession.refreshTokenId
          }
        });

        await tx.refreshToken.create({
          data: this.toRefreshTokenCreate(input.newSession)
        });
      })
      .then(() => undefined);
  }

  revokeRefreshToken(refreshTokenId: string): Promise<void> {
    return this.prisma.refreshToken
      .update({
        where: { id: refreshTokenId },
        data: { revokedAt: new Date() }
      })
      .then(() => undefined);
  }

  async listActiveSessions(userId: string): Promise<SessionView[]> {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      replacedByTokenId: session.replacedByTokenId
    }));
  }

  async revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });

    return result.count > 0;
  }

  changePasswordAndRotateSessions(input: {
    userId: string;
    passwordHash: string;
    session: CreateRefreshSessionInput;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: now
        },
        include: { roles: true }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      await tx.refreshToken.create({
        data: this.toRefreshTokenCreate(input.session)
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapUser(user);
    });
  }

  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    outboxEvent: DomainEventDraft;
  }): Promise<void> {
    return this.prisma
      .$transaction(async (tx) => {
        await tx.passwordResetToken.create({
          data: {
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt
          }
        });

        await tx.outboxEvent.create({
          data: this.toOutboxCreate(input.outboxEvent)
        });
      })
      .then(() => undefined);
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenWithUser | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } }
    });

    return token
      ? {
          id: token.id,
          userId: token.userId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          consumedAt: token.consumedAt,
          user: this.mapUser(token.user)
        }
      : null;
  }

  consumePasswordResetTokenAndChangePassword(input: {
    resetTokenId: string;
    userId: string;
    passwordHash: string;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (input.resetTokenId) {
        await tx.passwordResetToken.update({
          where: { id: input.resetTokenId },
          data: { consumedAt: now }
        });
      }

      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: now
        },
        include: { roles: true }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapUser(user);
    });
  }

  async findEnabledMfaFactorsByUserId(userId: string): Promise<MfaFactorRecord[]> {
    const factors = await this.prisma.mfaFactor.findMany({
      where: {
        userId,
        status: 'ENABLED'
      },
      orderBy: { createdAt: 'asc' }
    });

    return factors.map((factor) => this.mapMfaFactor(factor));
  }

  async upsertPendingEmailMfaFactor(input: { userId: string; target: string }): Promise<MfaFactorRecord> {
    const factor = await this.prisma.mfaFactor.upsert({
      where: {
        userId_type_target: {
          userId: input.userId,
          type: 'EMAIL_OTP',
          target: input.target
        }
      },
      update: {
        status: 'PENDING',
        disabledAt: null
      },
      create: {
        userId: input.userId,
        type: 'EMAIL_OTP',
        target: input.target,
        status: 'PENDING'
      }
    });

    return this.mapMfaFactor(factor);
  }

  createMfaChallenge(input: {
    challengeId: string;
    userId: string;
    factorId?: string;
    purpose: 'ENROLLMENT' | 'SIGNIN';
    challengeHash: string;
    expiresAt: Date;
    outboxEvent: DomainEventDraft;
  }): Promise<MfaChallengeRecord> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.mfaChallenge.create({
        data: {
          id: input.challengeId,
          userId: input.userId,
          factorId: input.factorId,
          purpose: input.purpose,
          challengeHash: input.challengeHash,
          expiresAt: input.expiresAt
        }
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapMfaChallenge(challenge);
    });
  }

  async findMfaChallengeById(challengeId: string): Promise<MfaChallengeWithUser | null> {
    const challenge = await this.prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: {
        user: { include: { roles: true } },
        factor: true
      }
    });

    return challenge ? this.mapMfaChallengeWithUser(challenge) : null;
  }

  enableMfaFactorFromChallenge(input: {
    challengeId: string;
    factorId: string;
    outboxEvent: DomainEventDraft;
  }): Promise<MfaFactorRecord> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.mfaChallenge.update({
        where: { id: input.challengeId },
        data: {
          verifiedAt: now,
          consumedAt: now
        }
      });

      const factor = await tx.mfaFactor.update({
        where: { id: input.factorId },
        data: {
          status: 'ENABLED',
          verifiedAt: now,
          disabledAt: null
        }
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapMfaFactor(factor);
    });
  }

  consumeMfaSigninChallenge(challengeId: string): Promise<IdentityUser> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.mfaChallenge.update({
        where: { id: challengeId },
        data: {
          verifiedAt: now,
          consumedAt: now
        },
        include: {
          user: { include: { roles: true } }
        }
      });

      return this.mapUser(challenge.user);
    });
  }

  disableMfaFactorsForUser(input: { userId: string; outboxEvent: DomainEventDraft }): Promise<void> {
    const now = new Date();

    return this.prisma
      .$transaction(async (tx) => {
        await tx.mfaFactor.updateMany({
          where: {
            userId: input.userId,
            status: 'ENABLED'
          },
          data: {
            status: 'DISABLED',
            disabledAt: now
          }
        });

        await tx.outboxEvent.create({
          data: this.toOutboxCreate(input.outboxEvent)
        });
      })
      .then(() => undefined);
  }

  replaceUserRoles(input: {
    userId: string;
    roles: AuthRole[];
    actorUserId: string;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser> {
    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: input.userId }
      });

      if (input.roles.length > 0) {
        await tx.userRole.createMany({
          data: input.roles.map((role) => ({
            userId: input.userId,
            role,
            grantedByUserId: input.actorUserId
          }))
        });
      }

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        include: { roles: true }
      });

      return this.mapUser(user);
    });
  }

  updateAccountStatus(input: {
    userId: string;
    status: UserStatus;
    closureType: 'DEACTIVATION' | 'DELETION_REQUEST';
    reason?: string;
    outboxEvent: DomainEventDraft;
  }): Promise<IdentityUser> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          status: input.status,
          deactivatedAt: input.status === 'DEACTIVATED' ? now : undefined,
          deletionRequestedAt: input.status === 'DELETION_REQUESTED' ? now : undefined
        },
        include: { roles: true }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      await tx.accountClosureRequest.create({
        data: {
          userId: input.userId,
          type: input.closureType,
          reason: input.reason
        }
      });

      await tx.outboxEvent.create({
        data: this.toOutboxCreate(input.outboxEvent)
      });

      return this.mapUser(user);
    });
  }

  private mapUser(user: PrismaUserWithRoles): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      status: user.status as UserStatus,
      roles: user.roles.map((role) => role.role as AuthRole)
    };
  }

  private mapRefreshToken(refreshToken: PrismaRefreshTokenWithUser): RefreshSessionWithUser {
    return {
      id: refreshToken.id,
      userId: refreshToken.userId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
      revokedAt: refreshToken.revokedAt,
      replacedByTokenId: refreshToken.replacedByTokenId,
      createdAt: refreshToken.createdAt,
      user: this.mapUser(refreshToken.user)
    };
  }

  private mapMfaFactor(factor: PrismaMfaFactor): MfaFactorRecord {
    return {
      id: factor.id,
      userId: factor.userId,
      type: factor.type as 'EMAIL_OTP',
      target: factor.target,
      status: factor.status as 'PENDING' | 'ENABLED' | 'DISABLED'
    };
  }

  private mapMfaChallenge(challenge: MfaChallengeRecord): MfaChallengeRecord {
    return {
      id: challenge.id,
      userId: challenge.userId,
      factorId: challenge.factorId,
      purpose: challenge.purpose as 'ENROLLMENT' | 'SIGNIN',
      challengeHash: challenge.challengeHash,
      expiresAt: challenge.expiresAt,
      verifiedAt: challenge.verifiedAt,
      consumedAt: challenge.consumedAt
    };
  }

  private mapMfaChallengeWithUser(challenge: PrismaMfaChallengeWithUser): MfaChallengeWithUser {
    return {
      ...this.mapMfaChallenge(challenge),
      user: this.mapUser(challenge.user),
      factor: challenge.factor ? this.mapMfaFactor(challenge.factor) : null
    };
  }

  private toRefreshTokenCreate(input: CreateRefreshSessionInput) {
    return {
      id: input.refreshTokenId,
      userId: input.userId,
      tokenHash: input.refreshTokenHash,
      expiresAt: input.refreshTokenExpiresAt
    };
  }

  private toOutboxCreate(event: DomainEventDraft) {
    return {
      topic: event.topic,
      type: event.type,
      payload: event.payload as Prisma.InputJsonValue
    };
  }
}

