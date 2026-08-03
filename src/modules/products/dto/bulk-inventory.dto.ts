import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { InventoryStatus } from '../enums/inventory-status.enum';

export class BulkInventoryDto {
  @ApiProperty({ type: [String], description: 'Array of Product IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  productIds!: string[];

  @ApiPropertyOptional({ enum: InventoryStatus })
  @IsEnum(InventoryStatus)
  @IsOptional()
  inventoryStatus?: InventoryStatus;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;
}
