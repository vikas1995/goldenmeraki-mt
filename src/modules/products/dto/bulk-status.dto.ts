import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class BulkStatusDto {
  @ApiProperty({ type: [String], description: 'Array of Product IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  productIds!: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Featured status' })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
