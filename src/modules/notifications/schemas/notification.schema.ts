import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationStatus } from '../enums/notification-status.enum';

export type NotificationDocument = ProductNotification & Document;

@Schema({ timestamps: true })
export class ProductNotification {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productTitle!: string;

  @Prop({ required: true, trim: true })
  customerName!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  whatsapp!: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  requestedSize?: string;

  @Prop({ required: true, default: Date.now })
  requestedDate!: Date;

  @Prop({
    required: true,
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
    index: true,
  })
  status!: NotificationStatus;

  @Prop()
  notifiedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(ProductNotification);

NotificationSchema.index({ customerName: 'text', phone: 'text', whatsapp: 'text', productTitle: 'text' });
NotificationSchema.index({ productId: 1, status: 1 });
