import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import { Address, AddressSchema } from './address.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password?: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.ADMIN })
  role: UserRole;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ select: false })
  refreshToken?: string;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);
