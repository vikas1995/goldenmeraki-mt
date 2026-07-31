import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<ReviewDocument> {
    const { productId, rating, title, comment } = createReviewDto;

    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingReview = await this.reviewModel.findOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = new this.reviewModel({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
      rating,
      title,
      comment,
    });

    const savedReview = await review.save();
    await this.updateProductRating(productId);
    return savedReview.populate('user', 'name');
  }

  async findByProduct(productId: string): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ product: new Types.ObjectId(productId), isApproved: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(reviewId: string, userId: string, role: string): Promise<{ message: string }> {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (role !== UserRole.ADMIN && review.user.toString() !== userId) {
      throw new ForbiddenException('Unauthorized to delete this review');
    }

    const productId = review.product.toString();
    await this.reviewModel.findByIdAndDelete(reviewId);
    await this.updateProductRating(productId);

    return { message: 'Review deleted successfully' };
  }

  private async updateProductRating(productId: string): Promise<void> {
    const reviews = await this.reviewModel.find({
      product: new Types.ObjectId(productId),
      isApproved: true,
    });

    const count = reviews.length;
    const average =
      count === 0
        ? 0
        : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;

    await this.productsService.update(productId, {
      ratings: { average, count },
    } as any);
  }
}
