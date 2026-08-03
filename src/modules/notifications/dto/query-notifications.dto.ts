import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { NotificationStatus } from '../enums/notification-status.enum';

export class QueryNotificationsDto {
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

  @ApiPropertyOptional({ description: 'Search customer name, phone, whatsapp, or product title' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filter by notification status' })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsMongoId()
  @IsOptional()
  productId?: string;
}
