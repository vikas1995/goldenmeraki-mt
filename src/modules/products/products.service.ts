import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { validateImageFile, validateVideoFile } from '../../common/utils/file-validation.util';
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
import { FtpService } from '../../common/services/ftp.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly ftpService: FtpService,
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

  /**
   * Migrate legacy widthSizes to the new sizes format on read.
   * If a product has widthSizes but no sizes, auto-map them.
   */
  private migrateLegacySizes(product: any): void {
    if (product && (!product.sizes || product.sizes.length === 0) && product.widthSizes && product.widthSizes.length > 0) {
      product.sizes = product.widthSizes.map((ws: any) => {
        if (typeof ws === 'string') {
          return {
            size: ws,
            price: product.price || 0,
            originalPrice: product.originalPrice,
            stock: product.stock || 0,
            isActive: true,
          };
        }
        return {
          size: ws.size,
          price: ws.price ?? product.price ?? 0,
          originalPrice: ws.originalPrice ?? product.originalPrice,
          discountPrice: ws.discountPrice,
          stock: ws.stock ?? product.stock ?? 0,
          isActive: ws.isActive !== false,
        };
      });
    }
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const slug = this.slugify(createProductDto.title);

    // Normalize sizes — ensure isActive defaults to true
    const sizes = (createProductDto.sizes || []).map((s) => ({
      ...s,
      isActive: s.isActive !== false,
    }));

    // Auto set inventory status
    let inventoryStatus = createProductDto.inventoryStatus || InventoryStatus.IN_STOCK;
    if (sizes.length > 0) {
      // For sized products, check if any active size has stock
      const hasActiveStock = sizes.some((s) => s.isActive && s.stock > 0);
      inventoryStatus = hasActiveStock ? InventoryStatus.IN_STOCK : InventoryStatus.OUT_OF_STOCK;
    } else if (createProductDto.stock <= 0 && inventoryStatus === InventoryStatus.IN_STOCK) {
      inventoryStatus = InventoryStatus.OUT_OF_STOCK;
    }

    const product = new this.productModel({
      ...createProductDto,
      sizes,
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
      includeInactive,
      intention,
      chakra,
    } = queryDto;

    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else if (includeInactive !== true) {
      filter.isActive = true;
    }

    if (category && category !== 'all') {
      if (Types.ObjectId.isValid(category)) {
        filter.category = {
          $in: [
            new Types.ObjectId(category),
            category
          ]
        };
      } else {
        filter.category = category;
      }
    }

    if (intention) {
      filter.intention = intention;
    }

    if (chakra) {
      filter.chakra = chakra;
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
        .lean()
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    // Migrate legacy widthSizes for each product on read
    for (const product of products) {
      this.migrateLegacySizes(product);
    }

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

  async findFeatured(): Promise<any[]> {
    const products = await this.productModel
      .find({ isFeatured: true, isActive: true })
      .populate('category')
      .limit(10)
      .lean()
      .exec();

    for (const product of products) {
      this.migrateLegacySizes(product);
    }

    return products;
  }

  async findBySlug(slug: string): Promise<any> {
    const product = await this.productModel
      .findOne({ slug, isActive: true })
      .populate('category')
      .lean()
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    this.migrateLegacySizes(product);
    return product;
  }

  async findById(id: string): Promise<any> {
    const product = await this.productModel.findById(id).populate('category').lean().exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.migrateLegacySizes(product);
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

    // Normalize sizes if provided
    if (updateData.sizes && Array.isArray(updateData.sizes)) {
      updateData.sizes = updateData.sizes.map((s: any) => ({
        ...s,
        isActive: s.isActive !== false,
      }));

      // Recompute inventory status based on sizes
      const hasActiveStock = updateData.sizes.some((s: any) => s.isActive && s.stock > 0);
      if (updateProductDto.inventoryStatus === undefined) {
        updateData.inventoryStatus = hasActiveStock ? InventoryStatus.IN_STOCK : InventoryStatus.OUT_OF_STOCK;
      }
    } else if (updateProductDto.stock !== undefined && updateProductDto.inventoryStatus === undefined) {
      // Auto adjust inventory status based on stock if updated (non-sized products)
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

    // Clean up physical images from disk and FTP
    if (product.images && product.images.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products');
      const oldUploadDir = path.join(process.cwd(), 'public_html', 'Images', 'products');
      for (const imageUrl of product.images) {
        try {
          const filename = path.basename(imageUrl);
          const filePath = path.join(uploadDir, filename);
          const oldFilePath = path.join(oldUploadDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          } else if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
          // FTP Delete
          await this.ftpService.deleteFile(`goldenmerakigems-images/products/${filename}`);
        } catch (err) {
          console.error(`Failed to delete image file ${imageUrl}:`, err.message);
        }
      }
    }

    // Clean up video if present
    if (product.video) {
      try {
        const videoFilename = path.basename(product.video);
        const videoDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products', 'videos');
        const videoPath = path.join(videoDir, videoFilename);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
        await this.ftpService.deleteFile(`goldenmerakigems-images/products/videos/${videoFilename}`);
      } catch (err) {
        console.error(`Failed to delete video file:`, err.message);
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

    validateImageFile(file);

    const ext = path.extname(file.originalname).toLowerCase();

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
    const uploadDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // FTP Upload new image
    try {
      await this.ftpService.uploadFile(file.buffer, `goldenmerakigems-images/products/${filename}`);
    } catch (err) {
      console.error(`Failed to upload product image via FTP:`, err.message);
    }

    const imageUrl = `https://goldenmerakigems.com/goldenmerakigems-images/products/${filename}`;
    
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

    validateImageFile(file);

    const ext = path.extname(file.originalname).toLowerCase();

    const oldFilename = path.basename(oldImageUrl);
    const slug = product.slug;
    const match = oldFilename.match(new RegExp(`^${slug}-(\\d+)\\.`));
    const seq = match ? match[1] : (product.images.indexOf(oldImageUrl) + 1).toString();

    const newFilename = `${slug}-${seq}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products');

    const oldFilePath = path.join(uploadDir, oldFilename);
    const oldOldFilePath = path.join(process.cwd(), 'public_html', 'Images', 'products', oldFilename);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error(`Failed to delete old image ${oldFilePath}:`, err.message);
      }
    } else if (fs.existsSync(oldOldFilePath)) {
      try {
        fs.unlinkSync(oldOldFilePath);
      } catch (err) {
        console.error(`Failed to delete old image ${oldOldFilePath}:`, err.message);
      }
    }

    // FTP Delete old image
    try {
      await this.ftpService.deleteFile(`goldenmerakigems-images/products/${oldFilename}`);
    } catch (err) {
      console.error(`Failed to delete old FTP product image:`, err.message);
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const newFilePath = path.join(uploadDir, newFilename);
    fs.writeFileSync(newFilePath, file.buffer);

    // FTP Upload new image
    try {
      await this.ftpService.uploadFile(file.buffer, `goldenmerakigems-images/products/${newFilename}`);
    } catch (err) {
      console.error(`Failed to upload replaced product image via FTP:`, err.message);
    }

    const newImageUrl = `https://goldenmerakigems.com/goldenmerakigems-images/products/${newFilename}`;

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
    const filePath = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products', filename);
    const oldFilePath = path.join(process.cwd(), 'public_html', 'Images', 'products', filename);
    
    // Try deleting from the new path first, then the old path as fallback
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete physical file ${filePath}:`, err.message);
      }
    } else if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error(`Failed to delete physical file ${oldFilePath}:`, err.message);
      }
    }

    // FTP Delete image
    try {
      await this.ftpService.deleteFile(`goldenmerakigems-images/products/${filename}`);
    } catch (err) {
      console.error(`Failed to delete FTP product image:`, err.message);
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

  // ============================================================
  // Video Upload / Delete APIs
  // ============================================================

  /**
   * Upload a product video. Saves to local disk + FTP.
   * Stores public URL in the product's `video` field.
   */
  async uploadVideo(id: string, file: Express.Multer.File): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    validateVideoFile(file);

    // If product already has a video, delete the old one first
    if (product.video) {
      await this._deleteVideoFiles(product.video);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const slug = product.slug;
    const filename = `${slug}-video${ext}`;
    const uploadDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products', 'videos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // FTP Upload video
    try {
      await this.ftpService.uploadFile(file.buffer, `goldenmerakigems-images/products/videos/${filename}`);
    } catch (err) {
      console.error(`Failed to upload product video via FTP:`, err.message);
    }

    const videoUrl = `https://goldenmerakigems.com/goldenmerakigems-images/products/videos/${filename}`;

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $set: { video: videoUrl } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  /**
   * Delete a product's video from disk, FTP, and database.
   */
  async deleteVideo(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (!product.video) {
      throw new BadRequestException('This product does not have a video to delete.');
    }

    await this._deleteVideoFiles(product.video);

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(
        id,
        { $unset: { video: 1 } },
        { new: true }
      )
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  /**
   * Internal helper: delete video files from disk and FTP.
   */
  private async _deleteVideoFiles(videoUrl: string): Promise<void> {
    try {
      const videoFilename = path.basename(videoUrl);
      const videoDir = path.join(process.cwd(), 'public_html', 'goldenmerakigems-images', 'products', 'videos');
      const videoPath = path.join(videoDir, videoFilename);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      await this.ftpService.deleteFile(`goldenmerakigems-images/products/videos/${videoFilename}`);
    } catch (err) {
      console.error(`Failed to delete video file ${videoUrl}:`, err.message);
    }
  }
}
