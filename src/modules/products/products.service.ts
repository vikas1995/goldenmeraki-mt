import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

    if (category) {
      filter.category = new Types.ObjectId(category);
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
    const product = await this.productModel.findByIdAndDelete(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
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
}
