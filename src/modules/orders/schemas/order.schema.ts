import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true, trim: true })
  street!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true, default: 'India' })
  country!: string;

  @Prop({ required: true, trim: true })
  pincode!: string;
}

const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ _id: false })
export class OrderItem {
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

  @Prop({ trim: true })
  selectedWidthSize?: string;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

export enum OrderStatus {
  AWAITING_WHATSAPP = 'AWAITING_WHATSAPP',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber!: string;

  @Prop({ required: true, trim: true })
  customerName!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  whatsapp!: string;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress!: ShippingAddress;

  @Prop({ type: [OrderItemSchema], required: true })
  cartItems!: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ required: true, default: Date.now })
  orderDate!: Date;

  @Prop({
    type: String,
    required: true,
    enum: OrderStatus,
    default: OrderStatus.AWAITING_WHATSAPP,
    index: true,
  })
  orderStatus!: OrderStatus;

  @Prop({
    type: String,
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Prop({ default: 'WHATSAPP_WEB' })
  source!: string;

  @Prop({ trim: true })
  orderNotes?: string;

  @Prop()
  generatedWhatsappMessage?: string;

  @Prop()
  whatsappHandoffAt?: Date;

  @Prop()
  awaitingWhatsappExpiresAt?: Date;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  expiredAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ customerName: 'text', phone: 'text', orderNumber: 'text', whatsapp: 'text' });
OrderSchema.index({ orderStatus: 1, paymentStatus: 1, createdAt: -1 });
