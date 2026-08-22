import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InventoryStatus } from '../enums/inventory-status.enum';

/**
 * DTO for a single size variant within a product.
 * Supports per-size pricing, stock, and active/inactive toggling.
 */
export class SizeVariantDto {
  @ApiProperty({ example: '8mm', description: 'Size label (e.g. 8mm, 10mm)' })
  @IsString()
  @IsNotEmpty()
  size!: string;

  @ApiProperty({ example: 550, description: 'Selling price for this size' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 950, description: 'Original / MRP price for this size' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiPropertyOptional({ example: 500, description: 'Discount price for this size' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ example: 20, description: 'Stock quantity for this size' })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: true, description: 'Whether this size variant is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Golden Meraki Silk Sari' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Luxurious handcrafted pure silk sari with intricate gold embroidery.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 4999.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 5999.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiPropertyOptional({ example: 3999.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ enum: InventoryStatus, default: InventoryStatus.IN_STOCK })
  @IsEnum(InventoryStatus)
  @IsOptional()
  inventoryStatus?: InventoryStatus;

  @ApiProperty({ example: '60d5ec49f1b2c81234567890', description: 'Category ID' })
  @IsMongoId()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 'Sale' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'wealth' })
  @IsString()
  @IsOptional()
  intention?: string;

  @ApiPropertyOptional({ example: 'heart' })
  @IsString()
  @IsOptional()
  chakra?: string;

  @ApiPropertyOptional({ example: 'Pyrite Stone AAA Grade | Natural Crystal Cluster | Golden Meraki' })
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Buy raw natural AAA grade pyrite stone cluster at Golden Meraki Gems. Attract wealth, abundance & protection.' })
  @IsString()
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional({ example: 'pyrite stone, fool gold, crystal for wealth, raw pyrite cluster' })
  @IsString()
  @IsOptional()
  seoKeywords?: string;

  @ApiPropertyOptional({
    description: 'Size variants with per-size pricing and stock',
    type: [SizeVariantDto],
    example: [
      { size: '8mm', price: 550, originalPrice: 950, stock: 20, isActive: true },
      { size: '10mm', price: 650, originalPrice: 1050, stock: 15, isActive: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeVariantDto)
  @IsOptional()
  sizes?: SizeVariantDto[];

  @ApiPropertyOptional({
    example: 'https://goldenmerakigems.com/goldenmerakigems-images/products/videos/terahertz-bracelet.mp4',
    description: 'Public URL of the product video',
  })
  @IsString()
  @IsOptional()
  video?: string;

  /**
   * @deprecated — Use `sizes` instead. Kept for backward compatibility.
   */
  @ApiPropertyOptional({
    example: ['8 mm', '10 mm'],
    description: '(Deprecated) Use sizes[] instead. Legacy width sizes field.',
  })
  @IsArray()
  @IsOptional()
  widthSizes?: (string | { size: string; price?: number; stock?: number })[];
}
