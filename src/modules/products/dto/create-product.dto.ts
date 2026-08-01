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

  @ApiProperty({ example: '60d5ec49f1b2c81234567890', description: 'Category ID' })
  @IsMongoId()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 'Sale' })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiPropertyOptional({ example: 'ISO Certified 100% Natural Crystal' })
  @IsString()
  @IsOptional()
  certificate?: string;

  @ApiPropertyOptional({ example: 'root' })
  @IsString()
  @IsOptional()
  chakra?: string;

  @ApiPropertyOptional({ example: 'health' })
  @IsString()
  @IsOptional()
  intention?: string;

  @ApiPropertyOptional({ example: 'Pearl' })
  @IsString()
  @IsOptional()
  stone?: string;

  @ApiPropertyOptional({ example: 'diwali-special' })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiPropertyOptional({ example: ['Benefits...', 'More benefits...'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

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

  @ApiPropertyOptional({ example: ['origin', 'authenticity'], type: Object })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, string>;

  @ApiPropertyOptional({ example: ['100g', '200g'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  weights?: string[];

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
