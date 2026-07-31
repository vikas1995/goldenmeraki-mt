import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop({ trim: true })
  excerpt?: string;

  @Prop({ default: 'GoldenMeraki Team', trim: true })
  author: string;

  @Prop({ trim: true })
  image?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true, index: true })
  isPublished: boolean;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
