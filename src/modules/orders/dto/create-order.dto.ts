import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ example: '123 Meraki Lane' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsString()
  @IsOptional()
  country?: string = 'India';

  @ApiProperty({ example: '400001' })
  @IsString()
  @IsNotEmpty()
  pincode!: string;
}

export class OrderItemDto {
  @ApiProperty({ example: '60d5ec49f1b2c81234567890' })
  @IsMongoId()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 'Golden Meraki Silk Sari' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 4999.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  image?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Aarav Patel' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  whatsapp!: string;

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  cartItems!: OrderItemDto[];

  @ApiProperty({ example: 4999.99 })
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiPropertyOptional({ example: 'WHATSAPP_WEB' })
  @IsString()
  @IsOptional()
  source?: string = 'WHATSAPP_WEB';

  @ApiPropertyOptional({ example: 'Please gift wrap this sari' })
  @IsString()
  @IsOptional()
  orderNotes?: string;
}
