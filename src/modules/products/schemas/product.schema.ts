import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InventoryStatus } from '../enums/inventory-status.enum';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ min: 0 })
  originalPrice?: number;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ min: 0 })
  discountPrice?: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({
    type: String,
    required: true,
    enum: InventoryStatus,
    default: InventoryStatus.IN_STOCK,
    index: true,
  })
  inventoryStatus!: InventoryStatus;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category!: Types.ObjectId;

  @Prop({ trim: true })
  badge?: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ default: false, index: true })
  isFeatured!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Array, default: [] })
  widthSizes?: (string | { size: string; price?: number; stock?: number })[];

  @Prop({
    type: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    default: { average: 0, count: 0 },
  })
  ratings!: {
    average: number;
    count: number;
  };
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ title: 'text', description: 'text' });
ProductSchema.index({ category: 1, inventoryStatus: 1, isActive: 1 });
