import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class NotifyProductDto {
  @ApiProperty({ example: 'Rohan Sharma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

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
