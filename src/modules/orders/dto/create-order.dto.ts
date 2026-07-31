import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AddAddressDto } from '../../users/dto/add-address.dto';
import { PaymentMethod } from '../enums/order-status.enum';

export class CreateOrderDto {
  @ApiProperty({ type: AddAddressDto })
  @ValidateNested()
  @Type(() => AddAddressDto)
  @IsNotEmpty()
  shippingAddress: AddAddressDto;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Please deliver between 2 PM and 5 PM' })
  @IsString()
  @IsOptional()
  notes?: string;
}
