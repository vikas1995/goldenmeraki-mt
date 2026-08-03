import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: '60d5ec49f1b2c81234567890' })
  @IsMongoId()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 'Golden Meraki Silk Sari' })
  @IsString()
  @IsNotEmpty()
  productTitle!: string;

  @ApiProperty({ example: 'Rohan Sharma' })
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

  @ApiPropertyOptional({ example: 'rohan@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
