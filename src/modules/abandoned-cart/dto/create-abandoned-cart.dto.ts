import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { RecoveryStatus } from '../enums/recovery-status.enum';

export class AbandonedCartItemDto {
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

export class AbandonedCartShippingDto {
  @ApiPropertyOptional({ example: '123 Meraki Lane' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsString()
  @IsOptional()
  pincode?: string;
}

export class CreateAbandonedCartDto {
  @ApiProperty({ example: 'cart-session-123456' })
  @IsString()
  @IsNotEmpty()
  cartId!: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ type: AbandonedCartShippingDto })
  @ValidateNested()
  @Type(() => AbandonedCartShippingDto)
  @IsOptional()
  shippingAddress?: AbandonedCartShippingDto;

  @ApiProperty({ type: [AbandonedCartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbandonedCartItemDto)
  products!: AbandonedCartItemDto[];

  @ApiProperty({ example: 4999.99 })
  @IsNumber()
  @Min(0)
  cartTotal!: number;

  @ApiPropertyOptional({ enum: RecoveryStatus })
  @IsEnum(RecoveryStatus)
  @IsOptional()
  recoveryStatus?: RecoveryStatus;

  @ApiPropertyOptional({ example: 'WEB_CHECKOUT' })
  @IsString()
  @IsOptional()
  source?: string;
}
