import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'bcb39558-4767-4744-81ab-4892e877c6fd' })
  @IsString()
  @MinLength(20)
  resetToken: string;

  @ApiProperty({ example: 'NewStrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

