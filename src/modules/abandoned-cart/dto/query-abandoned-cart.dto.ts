import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RecoveryStatus } from '../enums/recovery-status.enum';

export class QueryAbandonedCartDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search customer name, phone, whatsapp, email, or cart ID' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: RecoveryStatus })
  @IsEnum(RecoveryStatus)
  @IsOptional()
  recoveryStatus?: RecoveryStatus;

  @ApiPropertyOptional({ example: 'lastActivity_desc', enum: ['lastActivity_desc', 'cartTotal_desc', 'cartTotal_asc'] })
  @IsString()
  @IsOptional()
  sort?: string;
}
