import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryStatus } from '../enums/inventory-status.enum';

export class QueryProductsDto {
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

  @ApiPropertyOptional({ description: 'Search term for product title or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: InventoryStatus, description: 'Filter by inventory status' })
  @IsEnum(InventoryStatus)
  @IsOptional()
  inventoryStatus?: InventoryStatus;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter featured products' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filter active status' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'newest', enum: ['newest', 'price_asc', 'price_desc', 'rating'] })
  @IsString()
  @IsOptional()
  sort?: string;
}
