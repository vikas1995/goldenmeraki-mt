import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ _id: true })
export class Address {
  @ApiProperty({ example: 'Home' })
  @Prop({ required: true, trim: true })
  title: string;

  @ApiProperty({ example: '123 Main Street' })
  @Prop({ required: true, trim: true })
  street: string;

  @ApiProperty({ example: 'Mumbai' })
  @Prop({ required: true, trim: true })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @Prop({ required: true, trim: true })
  state: string;

  @ApiProperty({ example: '400001' })
  @Prop({ required: true, trim: true })
  postalCode: string;

  @ApiProperty({ example: 'India' })
  @Prop({ required: true, trim: true, default: 'India' })
  country: string;

  @ApiPropertyOptional({ example: true })
  @Prop({ default: false })
  isDefault: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
