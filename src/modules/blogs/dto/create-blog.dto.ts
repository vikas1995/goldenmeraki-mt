import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ example: 'The Art of Pure Silk Weaving' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '<p>Full blog content HTML or markdown...</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'Discover the heritage techniques behind traditional silk sarees.' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({ example: 'Master Weaver Manoj' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ example: 'https://example.com/blog-cover.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: ['craftsmanship', 'silk', 'fashion'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
