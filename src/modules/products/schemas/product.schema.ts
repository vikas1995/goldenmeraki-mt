import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category!: Types.ObjectId;

  @Prop({ trim: true })
  badge?: string;

  @Prop({ trim: true })
  certificate?: string;

  @Prop({ trim: true })
  chakra?: string;

  @Prop({ trim: true })
  intention?: string;

  @Prop({ trim: true })
  stone?: string;

  @Prop({ trim: true })
  subCategory?: string;

  @Prop({ type: [String], default: [] })
  benefits!: string[];

  @Prop({ type: [String], default: [] })
  weights!: string[];

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: false, index: true })
  isFeatured!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

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

  @Prop({ type: Map, of: String, default: {} })
  attributes?: Map<string, string>;

  @Prop({ type: Map, of: String, default: {} })
  specifications?: Map<string, string>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Text Index for Search
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });
