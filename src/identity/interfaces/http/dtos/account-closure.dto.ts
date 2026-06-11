import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AccountClosureDto {
  @ApiPropertyOptional({ example: 'Customer requested account closure.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

