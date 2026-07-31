import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Golden Meraki Silk Sari' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'GM-SAR-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Luxurious handcrafted pure silk sari with intricate gold embroidery.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 4999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 3999.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: '60d5ec49f1b2c81234567890', description: 'Category ID' })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ example: ['silk', 'sari', 'gold'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: { color: 'Gold', fabric: 'Pure Silk' } })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;
}
