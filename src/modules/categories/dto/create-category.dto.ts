import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Jewelry', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'BRACELETS', description: 'Short pre-title shown above the main title' })
  @IsString()
  @IsOptional()
  preTitle?: string;

  @ApiPropertyOptional({ example: 'Handcrafted premium jewelry collection' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/category-image.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: '60d5ec49f1b2c81234567890', description: 'Parent category ID for sub-categories' })
  @IsMongoId()
  @IsOptional()
  parent?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
