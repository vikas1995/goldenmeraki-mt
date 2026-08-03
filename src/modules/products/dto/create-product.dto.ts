import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { InventoryStatus } from '../enums/inventory-status.enum';

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
}
