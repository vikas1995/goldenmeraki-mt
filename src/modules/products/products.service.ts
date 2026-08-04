import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationsService } from '../notifications/notifications.service';
import { BulkCategoryDto } from './dto/bulk-category.dto';
import { BulkInventoryDto } from './dto/bulk-inventory.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { NotifyProductDto } from './dto/notify-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InventoryStatus } from './enums/inventory-status.enum';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly notificationsService: NotificationsService,
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

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const slug = this.slugify(createProductDto.title);

    // Auto set inventory status if stock <= 0
    let inventoryStatus = createProductDto.inventoryStatus || InventoryStatus.IN_STOCK;
    if (createProductDto.stock <= 0 && inventoryStatus === InventoryStatus.IN_STOCK) {
      inventoryStatus = InventoryStatus.OUT_OF_STOCK;
    }

    const product = new this.productModel({
      ...createProductDto,
      inventoryStatus,
      slug,
    });

    return (await product.save()).populate('category');
  }

  async findAll(queryDto: QueryProductsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      inventoryStatus,
      minPrice,
      maxPrice,
      isFeatured,
      isActive,
      sort,
    } = queryDto;

    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else {
      filter.isActive = true;
    }

    if (category && category !== 'all') {
      if (Types.ObjectId.isValid(category)) {
        filter.category = new Types.ObjectId(category);
      }
    }

    if (inventoryStatus) {
      filter.inventoryStatus = inventoryStatus;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    let sortOptions: any = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { price: 1 };
    if (sort === 'price_desc') sortOptions = { price: -1 };
    if (sort === 'newest') sortOptions = { createdAt: -1 };
    if (sort === 'rating') sortOptions = { 'ratings.average': -1 };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFeatured(): Promise<ProductDocument[]> {
    return this.productModel
      .find({ isFeatured: true, isActive: true })
      .populate('category')
      .limit(10)
      .exec();
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ slug, isActive: true })
      .populate('category')
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).populate('category').exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductDocument> {
    const existingProduct = await this.productModel.findById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updateData: any = { ...updateProductDto };
    if (updateProductDto.title) {
      updateData.slug = this.slugify(updateProductDto.title);
    }

    // Auto adjust inventory status based on stock if updated
    if (updateProductDto.stock !== undefined && updateProductDto.inventoryStatus === undefined) {
      if (updateProductDto.stock > 0 && existingProduct.inventoryStatus === InventoryStatus.OUT_OF_STOCK) {
        updateData.inventoryStatus = InventoryStatus.IN_STOCK;
      } else if (updateProductDto.stock <= 0 && existingProduct.inventoryStatus === InventoryStatus.IN_STOCK) {
        updateData.inventoryStatus = InventoryStatus.OUT_OF_STOCK;
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Trigger auto-notify if restocked (OUT_OF_STOCK -> IN_STOCK) (Requirement #13)
    if (
      existingProduct.inventoryStatus === InventoryStatus.OUT_OF_STOCK &&
      updatedProduct.inventoryStatus === InventoryStatus.IN_STOCK
    ) {
      await this.notificationsService.triggerAutoNotify(id);
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Clean up physical images from disk
    if (product.images && product.images.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public_html', 'Images', 'products');
      for (const imageUrl of product.images) {
        try {
          if (imageUrl.startsWith('https://goldenmerakigems.com/Images/products/')) {
            const filename = path.basename(imageUrl);
            const filePath = path.join(uploadDir, filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        } catch (err) {
          console.error(`Failed to delete image file ${imageUrl}:`, err.message);
        }
      }
    }

    await this.productModel.findByIdAndDelete(id);
    return { message: 'Product deleted successfully' };
  }

  // Requirement #4: Bulk Category Update
  async bulkUpdateCategory(dto: BulkCategoryDto) {
    const result = await this.productModel.updateMany(
      { _id: { $in: dto.productIds.map((id) => new Types.ObjectId(id)) } },
      { $set: { category: new Types.ObjectId(dto.categoryId) } },
    );
    return { modifiedCount: result.modifiedCount };
  }

  // Requirement #4: Bulk Status Update (Activate / Deactivate / Feature / Unfeature)
  async bulkUpdateStatus(dto: BulkStatusDto) {
    const updateFields: any = {};
    if (dto.isActive !== undefined) updateFields.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) updateFields.isFeatured = dto.isFeatured;

    const result = await this.productModel.updateMany(
      { _id: { $in: dto.productIds.map((id) => new Types.ObjectId(id)) } },
      { $set: updateFields },
    );
    return { modifiedCount: result.modifiedCount };
  }

  // Requirement #4: Bulk Inventory Update (Status & Stock)
  async bulkUpdateInventory(dto: BulkInventoryDto) {
    const updateFields: any = {};
    if (dto.inventoryStatus) updateFields.inventoryStatus = dto.inventoryStatus;
    if (dto.stockQuantity !== undefined) updateFields.stock = dto.stockQuantity;

    const result = await this.productModel.updateMany(
      { _id: { $in: dto.productIds.map((id) => new Types.ObjectId(id)) } },
      { $set: updateFields },
    );

    // Auto notify customers for any products updated to IN_STOCK (Requirement #13)
    if (dto.inventoryStatus === InventoryStatus.IN_STOCK) {
      for (const id of dto.productIds) {
        await this.notificationsService.triggerAutoNotify(id);
      }
    }

    return { modifiedCount: result.modifiedCount };
  }

  // Requirement #5 & #7: Notify Me API
  async notifyMe(productId: string, dto: NotifyProductDto) {
    const product = await this.findById(productId);
    return this.notificationsService.createNotification({
      productId,
      productTitle: product.title,
      customerName: dto.name,
      phone: dto.phone || dto.whatsapp,
      whatsapp: dto.whatsapp,
      email: dto.email,
      requestedSize: dto.requestedSize,
    });
  }

  // Image Upload APIs
  async uploadImage(id: string, file: Express.Multer.File): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException('Invalid file type. Only jpg, jpeg, png, and webp are allowed.');
    }

    const slug = product.slug;

    // Find next sequence number
    let nextSeq = 1;
    if (product.images && product.images.length > 0) {
      const seqs = product.images
        .map((url) => {
          const filename = path.basename(url);
          const match = filename.match(new RegExp(`^${slug}-(\\d+)\\.`));
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((val): val is number => val !== null);
      if (seqs.length > 0) {
        nextSeq = Math.max(...seqs) + 1;
      }
    }

    const filename = `${slug}-${nextSeq}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public_html', 'Images', 'products');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const imageUrl = `https://goldenmerakigems.com/Images/products/${filename}`;
    
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $push: { images: imageUrl } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  async replaceImage(id: string, oldImageUrl: string, file: Express.Multer.File): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!product.images || !product.images.includes(oldImageUrl)) {
      throw new BadRequestException('Original image URL not found in product images.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException('Invalid file type. Only jpg, jpeg, png, and webp are allowed.');
    }

    const oldFilename = path.basename(oldImageUrl);
    const slug = product.slug;
    const match = oldFilename.match(new RegExp(`^${slug}-(\\d+)\\.`));
    const seq = match ? match[1] : (product.images.indexOf(oldImageUrl) + 1).toString();

    const newFilename = `${slug}-${seq}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public_html', 'Images', 'products');

    const oldFilePath = path.join(uploadDir, oldFilename);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error(`Failed to delete old image ${oldFilePath}:`, err.message);
      }
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const newFilePath = path.join(uploadDir, newFilename);
    fs.writeFileSync(newFilePath, file.buffer);

    const newImageUrl = `https://goldenmerakigems.com/Images/products/${newFilename}`;

    const index = product.images.indexOf(oldImageUrl);
    const updatedImages = [...product.images];
    updatedImages[index] = newImageUrl;

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { images: updatedImages } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  async reorderImages(id: string, newImagesOrder: string[]): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { images: newImagesOrder } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  async deleteImage(id: string, imageUrl: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!product.images || !product.images.includes(imageUrl)) {
      throw new BadRequestException('Image URL not found in product images.');
    }

    const filename = path.basename(imageUrl);
    const filePath = path.join(process.cwd(), 'public_html', 'Images', 'products', filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete physical file ${filePath}:`, err.message);
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $pull: { images: imageUrl } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }
}
