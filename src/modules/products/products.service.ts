import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
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

    const existingSku = await this.productModel.findOne({
      sku: createProductDto.sku.toUpperCase(),
    });
    if (existingSku) {
      throw new ConflictException('Product SKU already exists');
    }

    const product = new this.productModel({
      ...createProductDto,
      sku: createProductDto.sku.toUpperCase(),
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
      minPrice,
      maxPrice,
      isFeatured,
      sort,
    } = queryDto;

    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
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
    const updateData: any = { ...updateProductDto };
    if (updateProductDto.title) {
      updateData.slug = this.slugify(updateProductDto.title);
    }
    if (updateProductDto.sku) {
      updateData.sku = updateProductDto.sku.toUpperCase();
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate('category')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
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
}
