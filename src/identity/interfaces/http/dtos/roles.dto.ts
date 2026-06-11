import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { AUTH_ROLES, AuthRole } from '../../../domain/auth-role';

export class ReplaceRolesDto {
  @ApiProperty({ example: ['CUSTOMER', 'SELLER'], enum: AUTH_ROLES, isArray: true })
  @IsArray()
  @IsIn(AUTH_ROLES, { each: true })
  roles: AuthRole[];
}

