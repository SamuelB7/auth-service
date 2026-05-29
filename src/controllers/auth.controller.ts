import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { SigninDto } from '../dtos/signin.dto';
import { SignupDto } from '../dtos/signup.dto';
import { AccessTokenGuard } from '../guards/access-token.guard';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

const tokenPairExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  tokenType: 'Bearer',
  accessTokenExpiresIn: '15m'
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Create a user account and session' })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiConflictResponse({ description: 'Email already registered.' })
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiBody({ type: SigninDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @HttpCode(200)
  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ schema: { example: tokenPairExample } })
  @ApiUnauthorizedResponse({ description: 'Invalid, revoked or expired refresh token.' })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: 'Revoke a refresh token session' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ schema: { example: { revoked: true } } })
  @ApiUnauthorizedResponse({ description: 'Invalid, revoked or expired refresh token.' })
  @HttpCode(200)
  @Post('signout')
  signout(@Body() dto: RefreshTokenDto) {
    return this.authService.signout(dto);
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
    return this.authService.changePassword(request.user.id, dto);
  }
}

