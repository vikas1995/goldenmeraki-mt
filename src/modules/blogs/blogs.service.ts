import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Blog, BlogDocument } from './schemas/blog.schema';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  async create(createBlogDto: CreateBlogDto): Promise<BlogDocument> {
    const slug = this.slugify(createBlogDto.title);
    const existing = await this.blogModel.findOne({ slug });
    if (existing) {
      throw new ConflictException('Blog post with this title/slug already exists');
    }

    const blog = new this.blogModel({
      ...createBlogDto,
      slug,
    });

    return blog.save();
  }

  async findAll(includeUnpublished = false): Promise<BlogDocument[]> {
    const filter = includeUnpublished ? {} : { isPublished: true };
    return this.blogModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findBySlug(slug: string): Promise<BlogDocument> {
    const blog = await this.blogModel.findOne({ slug, isPublished: true }).exec();
    if (!blog) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }
    return blog;
  }

  async findById(id: string): Promise<BlogDocument> {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return blog;
  }

  async update(id: string, updateBlogDto: UpdateBlogDto): Promise<BlogDocument> {
    const updateData: any = { ...updateBlogDto };
    if (updateBlogDto.title) {
      updateData.slug = this.slugify(updateBlogDto.title);
    }

    const updatedBlog = await this.blogModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' },
    );

    if (!updatedBlog) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return updatedBlog;
  }

  async remove(id: string): Promise<{ message: string }> {
    const blog = await this.blogModel.findByIdAndDelete(id);
    if (!blog) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return { message: 'Blog post deleted successfully' };
  }
}
