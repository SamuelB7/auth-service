import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ example: '018f8fd0-7f61-7cc2-a955-4e2d18f4e544' })
  @IsString()
  @MinLength(10)
  challengeId: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class DisableMfaDto {
  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  currentPassword: string;
}

