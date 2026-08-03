import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RecoveryStatus } from '../enums/recovery-status.enum';

export type AbandonedCartDocument = AbandonedCart & Document;

@Schema({ _id: false })
export class CartItemSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop()
  image?: string;
}

const CartItemSnapshotSchema = SchemaFactory.createForClass(CartItemSnapshot);

@Schema({ _id: false })
export class ShippingAddressSnapshot {
  @Prop({ trim: true })
  street?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  country?: string;

  @Prop({ trim: true })
  pincode?: string;
}

const ShippingAddressSnapshotSchema = SchemaFactory.createForClass(ShippingAddressSnapshot);

@Schema({ timestamps: true })
export class AbandonedCart {
  @Prop({ required: true, unique: true, index: true })
  cartId!: string;

  @Prop({ trim: true })
  customerName?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  whatsapp?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ type: ShippingAddressSnapshotSchema })
  shippingAddress?: ShippingAddressSnapshot;

  @Prop({ type: [CartItemSnapshotSchema], default: [] })
  products!: CartItemSnapshot[];

  @Prop({ required: true, min: 0, default: 0 })
  cartTotal!: number;

  @Prop({ required: true, default: Date.now })
  lastActivity!: Date;

  @Prop({
    required: true,
    enum: RecoveryStatus,
    default: RecoveryStatus.PENDING,
    index: true,
  })
  recoveryStatus!: RecoveryStatus;

  @Prop({ default: 0, min: 0 })
  recoveryCount!: number;

  @Prop({ default: 'WEB_CHECKOUT' })
  source!: string;
}

export const AbandonedCartSchema = SchemaFactory.createForClass(AbandonedCart);

AbandonedCartSchema.index({ customerName: 'text', phone: 'text', whatsapp: 'text', email: 'text' });
AbandonedCartSchema.index({ recoveryStatus: 1, lastActivity: -1 });
