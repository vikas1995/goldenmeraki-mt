import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class BulkCategoryDto {
  @ApiProperty({ type: [String], description: 'Array of Product IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  productIds!: string[];

  @ApiProperty({ description: 'Target Category ID' })
  @IsMongoId()
  @IsNotEmpty()
  categoryId!: string;
}
