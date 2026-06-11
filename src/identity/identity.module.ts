import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { IDENTITY_REPOSITORY } from './domain/ports/identity.repository';
import { PASSWORD_HASHER } from './domain/ports/password-hasher';
import { TOKEN_SERVICE } from './domain/ports/token-service';
import { ManageAccountClosureUseCase } from './application/use-cases/manage-account-closure.use-case';
import { AuthenticateCredentialsUseCase } from './application/use-cases/authenticate-credentials.use-case';
import { ManageMfaUseCase } from './application/use-cases/manage-mfa.use-case';
import { ManagePasswordUseCase } from './application/use-cases/manage-password.use-case';
import { ManageRolesUseCase } from './application/use-cases/manage-roles.use-case';
import { ManageSessionsUseCase } from './application/use-cases/manage-sessions.use-case';
import { RegisterCustomerUseCase } from './application/use-cases/register-customer.use-case';
import { RegisterSellerUseCase } from './application/use-cases/register-seller.use-case';
import { AuthController } from './interfaces/http/auth.controller';
import { AccessTokenGuard } from './interfaces/http/guards/access-token.guard';
import { RolesGuard } from './interfaces/http/guards/roles.guard';
import { PrismaIdentityRepository } from './infrastructure/persistence/prisma-identity.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    PrismaService,
    RegisterCustomerUseCase,
    RegisterSellerUseCase,
    AuthenticateCredentialsUseCase,
    ManageSessionsUseCase,
    ManagePasswordUseCase,
    ManageMfaUseCase,
    ManageRolesUseCase,
    ManageAccountClosureUseCase,
    AccessTokenGuard,
    RolesGuard,
    { provide: IDENTITY_REPOSITORY, useClass: PrismaIdentityRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService }
  ]
})
export class IdentityModule {}

