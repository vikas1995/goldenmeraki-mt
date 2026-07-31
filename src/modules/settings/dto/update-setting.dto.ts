import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ example: 'free_shipping_threshold' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 2000 })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({ example: 'Minimum cart total amount required for free delivery' })
  @IsString()
  @IsOptional()
  description?: string;
}
