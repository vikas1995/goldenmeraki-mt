import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
