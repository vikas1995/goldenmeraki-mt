import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getAdminStats() {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders,
      lowStockProducts,
      revenueResult,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.productModel.countDocuments({ isActive: true }),
      this.orderModel.countDocuments(),
      this.orderModel
        .find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
      this.productModel
        .find({ stock: { $lte: 5 }, isActive: true })
        .select('title sku stock price')
        .limit(10)
        .exec(),
      this.orderModel.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      recentOrders,
      lowStockProducts,
    };
  }
}
