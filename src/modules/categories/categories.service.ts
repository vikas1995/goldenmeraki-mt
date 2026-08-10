import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { validateImageFile } from '../../common/utils/file-validation.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
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

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = this.slugify(createCategoryDto.name);
    const existing = await this.categoryModel.findOne({ slug });
    if (existing) {
      throw new ConflictException('Category with this name/slug already exists');
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      slug,
    });

    return category.save();
  }

  async findAll(includeInactive = false): Promise<CategoryDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.categoryModel.find(filter).populate('parent').sort({ name: 1 }).exec();
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findOne({ slug, isActive: true })
      .populate('parent')
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return category;
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).populate('parent').exec();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryDocument> {
    const updateData: any = { ...updateCategoryDto };
    if (updateCategoryDto.name) {
      updateData.slug = this.slugify(updateCategoryDto.name);
    }

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.image && (category.image.startsWith('https://goldenmerakigems.com/Images/categories/') || category.image.startsWith('https://goldenmerakigems.com/goldenmerakigems-images/category/'))) {
      try {
        const filename = path.basename(category.image);
        const filePath = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'category', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to delete category image file ${category.image}:`, err.message);
      }
    }

    await this.categoryModel.findByIdAndDelete(id);
    return { message: 'Category deleted successfully' };
  }

  async uploadImage(id: string, file: Express.Multer.File): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    validateImageFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const slug = category.slug;
    const filename = `${slug}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'category');

    // Clean up old image if different extension or overwrite if same
    if (category.image && (category.image.startsWith('https://goldenmerakigems.com/Images/categories/') || category.image.startsWith('https://goldenmerakigems.com/goldenmerakigems-images/category/'))) {
      const oldFilename = path.basename(category.image);
      if (oldFilename !== filename) {
        const oldFilePath = path.join(uploadDir, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error(`Failed to delete old category image ${oldFilePath}:`, err.message);
          }
        }
      }
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const imageUrl = `https://goldenmerakigems.com/goldenmerakigems-images/category/${filename}`;

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      { $set: { image: imageUrl } },
      { new: true }
    );

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updatedCategory;
  }

  async deleteImage(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.image && (category.image.startsWith('https://goldenmerakigems.com/Images/categories/') || category.image.startsWith('https://goldenmerakigems.com/goldenmerakigems-images/category/'))) {
      const filename = path.basename(category.image);
      const filePath = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'category', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Failed to delete physical file ${filePath}:`, err.message);
        }
      }
    }

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      { $unset: { image: 1 } },
      { new: true }
    );

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updatedCategory;
  }
}
