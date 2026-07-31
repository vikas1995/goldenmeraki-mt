import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: '60d5ec49f1b2c81234567890' })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent quality sari!' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'The silk fabric is incredibly rich and authentic. Highly recommended!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
