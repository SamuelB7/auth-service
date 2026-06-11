import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { ManageAccountClosureUseCase } from '../../application/use-cases/manage-account-closure.use-case';
import { AuthenticateCredentialsUseCase } from '../../application/use-cases/authenticate-credentials.use-case';
import { ManageMfaUseCase } from '../../application/use-cases/manage-mfa.use-case';
import { ManagePasswordUseCase } from '../../application/use-cases/manage-password.use-case';
import { ManageRolesUseCase } from '../../application/use-cases/manage-roles.use-case';
import { ManageSessionsUseCase } from '../../application/use-cases/manage-sessions.use-case';
import { RegisterCustomerUseCase } from '../../application/use-cases/register-customer.use-case';
import { RegisterSellerUseCase } from '../../application/use-cases/register-seller.use-case';
import { AccountClosureDto } from './dtos/account-closure.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { DisableMfaDto, VerifyMfaDto } from './dtos/mfa.dto';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dtos/password-reset.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { ReplaceRolesDto } from './dtos/roles.dto';
import { SigninDto } from './dtos/signin.dto';
import { SignupDto } from './dtos/signup.dto';
import { AuthenticatedRequest } from './authenticated-request';
import { mapAuthError } from './auth-error.mapper';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RequireRoles } from './guards/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

const tokenPairExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  tokenType: 'Bearer',
  accessTokenExpiresIn: '15m'
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly registerSellerUseCase: RegisterSellerUseCase,
    private readonly authenticateCredentialsUseCase: AuthenticateCredentialsUseCase,
    private readonly manageSessionsUseCase: ManageSessionsUseCase,
    private readonly managePasswordUseCase: ManagePasswordUseCase,
    private readonly manageMfaUseCase: ManageMfaUseCase,
    private readonly manageRolesUseCase: ManageRolesUseCase,
    private readonly manageAccountClosureUseCase: ManageAccountClosureUseCase
  ) {}

  @ApiOperation({ summary: 'Create a customer account and session' })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.handle(this.registerCustomerUseCase.execute(dto));
  }

  @ApiOperation({ summary: 'Create a customer identity and session' })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @Post('customers/signup')
  signupCustomer(@Body() dto: SignupDto) {
    return this.handle(this.registerCustomerUseCase.execute(dto));
  }

  @ApiOperation({ summary: 'Create a seller-access identity before onboarding' })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @Post('sellers/signup')
  signupSeller(@Body() dto: SignupDto) {
    return this.handle(this.registerSellerUseCase.execute(dto));
  }

  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiBody({ type: SigninDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @HttpCode(200)
  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.handle(this.authenticateCredentialsUseCase.execute(dto));
  }

  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid, revoked or expired refresh token.' })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.handle(this.manageSessionsUseCase.refresh(dto.refreshToken));
  }

  @ApiOperation({ summary: 'Revoke a refresh token session' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ schema: { example: { revoked: true } } })
  @ApiUnauthorizedResponse({ description: 'Invalid, revoked or expired refresh token.' })
  @HttpCode(200)
  @Post('signout')
  signout(@Body() dto: RefreshTokenDto) {
    return this.handle(this.manageSessionsUseCase.signout(dto.refreshToken));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active refresh token sessions' })
  @UseGuards(AccessTokenGuard)
  @Get('sessions')
  listSessions(@Req() request: AuthenticatedRequest) {
    return this.handle(this.manageSessionsUseCase.list(request.user.id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one active refresh token session' })
  @UseGuards(AccessTokenGuard)
  @Delete('sessions/:sessionId')
  revokeSession(@Req() request: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.handle(this.manageSessionsUseCase.revoke(request.user.id, sessionId));
  }

  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiBody({ type: RequestPasswordResetDto })
  @HttpCode(200)
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.handle(this.managePasswordUseCase.requestReset(dto.email));
  }

  @ApiOperation({ summary: 'Confirm password reset with a reset token' })
  @ApiBody({ type: ConfirmPasswordResetDto })
  @HttpCode(200)
  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.handle(this.managePasswordUseCase.confirmReset(dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change authenticated user password and rotate sessions' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid access token or current password.' })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('change-password')
  changePassword(@Req() request: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.handle(
      this.managePasswordUseCase.changeAuthenticatedPassword({
        userId: request.user.id,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword
      })
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an email OTP MFA enrollment challenge' })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('mfa/enroll')
  enrollMfa(@Req() request: AuthenticatedRequest) {
    return this.handle(this.manageMfaUseCase.enroll(request.user.id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA enrollment challenge' })
  @ApiBody({ type: VerifyMfaDto })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('mfa/verify-enrollment')
  verifyMfaEnrollment(@Req() request: AuthenticatedRequest, @Body() dto: VerifyMfaDto) {
    return this.handle(
      this.manageMfaUseCase.verifyEnrollment({
        userId: request.user.id,
        challengeId: dto.challengeId,
        code: dto.code
      })
    );
  }

  @ApiOperation({ summary: 'Verify MFA signin challenge and issue tokens' })
  @ApiBody({ type: VerifyMfaDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @HttpCode(200)
  @Post('mfa/verify-signin')
  verifyMfaSignin(@Body() dto: VerifyMfaDto) {
    return this.handle(this.manageMfaUseCase.verifySignin(dto));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for authenticated user' })
  @ApiBody({ type: DisableMfaDto })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('mfa/disable')
  disableMfa(@Req() request: AuthenticatedRequest, @Body() dto: DisableMfaDto) {
    return this.handle(
      this.manageMfaUseCase.disable({
        userId: request.user.id,
        currentPassword: dto.currentPassword
      })
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user roles' })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Get('users/:userId/roles')
  getRoles(@Param('userId') userId: string) {
    return this.handle(this.manageRolesUseCase.getRoles(userId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace user roles' })
  @ApiBody({ type: ReplaceRolesDto })
  @UseGuards(AccessTokenGuard, RolesGuard)
  @RequireRoles('ADMIN')
  @Put('users/:userId/roles')
  replaceRoles(@Req() request: AuthenticatedRequest, @Param('userId') userId: string, @Body() dto: ReplaceRolesDto) {
    return this.handle(
      this.manageRolesUseCase.replaceRoles({
        actorUserId: request.user.id,
        userId,
        roles: dto.roles
      })
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate authenticated user account' })
  @ApiBody({ type: AccountClosureDto })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('account/deactivate')
  deactivateAccount(@Req() request: AuthenticatedRequest, @Body() dto: AccountClosureDto) {
    return this.handle(
      this.manageAccountClosureUseCase.deactivate({
        userId: request.user.id,
        reason: dto.reason
      })
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request authenticated user account deletion' })
  @ApiBody({ type: AccountClosureDto })
  @UseGuards(AccessTokenGuard)
  @HttpCode(200)
  @Post('account/deletion-request')
  requestAccountDeletion(@Req() request: AuthenticatedRequest, @Body() dto: AccountClosureDto) {
    return this.handle(
      this.manageAccountClosureUseCase.requestDeletion({
        userId: request.user.id,
        reason: dto.reason
      })
    );
  }

  private async handle<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      mapAuthError(error);
    }
  }
}

