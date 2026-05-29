import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type RefreshTokenWithUser = Prisma.RefreshTokenGetPayload<{
  include: { user: true };
}>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  }

  createUserWithSession(params: {
    userId: string;
    email: string;
    name?: string;
    passwordHash: string;
    refreshTokenId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    outboxEvent: {
      topic: string;
      type: string;
      payload: Prisma.InputJsonValue;
    };
  }): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: params.userId,
          email: params.email,
          name: params.name,
          passwordHash: params.passwordHash
        }
      });

      await tx.refreshToken.create({
        data: {
          id: params.refreshTokenId,
          userId: user.id,
          tokenHash: params.refreshTokenHash,
          expiresAt: params.refreshTokenExpiresAt
        }
      });

      await tx.outboxEvent.create({
        data: params.outboxEvent
      });

      return user;
    });
  }

  createSession(params: {
    userId: string;
    refreshTokenId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
  }): Promise<void> {
    return this.prisma.refreshToken
      .create({
        data: {
          id: params.refreshTokenId,
          userId: params.userId,
          tokenHash: params.refreshTokenHash,
          expiresAt: params.refreshTokenExpiresAt
        }
      })
      .then(() => undefined);
  }

  rotateRefreshToken(params: {
    currentRefreshTokenId: string;
    newRefreshTokenId: string;
    userId: string;
    newRefreshTokenHash: string;
    newRefreshTokenExpiresAt: Date;
  }): Promise<void> {
    const now = new Date();

    return this.prisma
      .$transaction(async (tx) => {
        await tx.refreshToken.update({
          where: { id: params.currentRefreshTokenId },
          data: {
            revokedAt: now,
            replacedByTokenId: params.newRefreshTokenId
          }
        });

        await tx.refreshToken.create({
          data: {
            id: params.newRefreshTokenId,
            userId: params.userId,
            tokenHash: params.newRefreshTokenHash,
            expiresAt: params.newRefreshTokenExpiresAt
          }
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

  changePasswordAndRotateSessions(params: {
    userId: string;
    passwordHash: string;
    refreshTokenId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
    outboxEvent: {
      topic: string;
      type: string;
      payload: Prisma.InputJsonValue;
    };
  }): Promise<User> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.userId },
        data: {
          passwordHash: params.passwordHash,
          passwordChangedAt: now
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: params.userId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      await tx.refreshToken.create({
        data: {
          id: params.refreshTokenId,
          userId: params.userId,
          tokenHash: params.refreshTokenHash,
          expiresAt: params.refreshTokenExpiresAt
        }
      });

      await tx.outboxEvent.create({
        data: params.outboxEvent
      });

      return user;
    });
  }
}

