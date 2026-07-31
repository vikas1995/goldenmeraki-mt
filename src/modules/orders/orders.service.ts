import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from './enums/order-status.enum';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  private generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `GM-${dateStr}-${randomSuffix}`;
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const cart = await this.cartService.getCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty. Cannot place an order');
    }

    const orderItems: any[] = [];
    let subTotal = 0;

    for (const cartItem of cart.items) {
      const product = await this.productsService.findById(cartItem.product._id.toString());
      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${cartItem.product} is unavailable`);
      }
      if (product.stock < cartItem.quantity) {
        throw new BadRequestException(`Product "${product.title}" has insufficient stock`);
      }

      const itemPrice = product.discountPrice ?? product.price;
      subTotal += itemPrice * cartItem.quantity;

      orderItems.push({
        product: product._id,
        title: product.title,
        sku: product.sku,
        quantity: cartItem.quantity,
        price: itemPrice,
        image: product.images && product.images.length > 0 ? product.images[0] : undefined,
      });

      // Deduct Stock
      await this.productsService.update(product._id.toString(), {
        stock: product.stock - cartItem.quantity,
      });
    }

    const shippingFee = subTotal > 2000 ? 0 : 150; // Free shipping over 2000
    const tax = Math.round(subTotal * 0.05 * 100) / 100; // 5% tax
    const totalAmount = subTotal + shippingFee + tax;

    const order = new this.orderModel({
      orderNumber: this.generateOrderNumber(),
      user: new Types.ObjectId(userId),
      items: orderItems,
      shippingAddress: createOrderDto.shippingAddress,
      paymentMethod: createOrderDto.paymentMethod,
      paymentStatus:
        createOrderDto.paymentMethod === PaymentMethod.COD
          ? PaymentStatus.PENDING
          : PaymentStatus.PAID,
      orderStatus: OrderStatus.PENDING,
      subTotal,
      shippingFee,
      tax,
      totalAmount,
      notes: createOrderDto.notes,
    });

    const savedOrder = await order.save();
    await this.cartService.clearCart(userId);

    return savedOrder;
  }

  async findMyOrders(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string, role: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).populate('user', 'name email phone').exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (role !== UserRole.ADMIN && order.user._id.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to view this order');
    }

    return order;
  }

  async findAllOrders(status?: OrderStatus): Promise<OrderDocument[]> {
    const filter = status ? { orderStatus: status } : {};
    return this.orderModel
      .find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    id: string,
    updateDto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (updateDto.orderStatus) {
      order.orderStatus = updateDto.orderStatus;
    }
    if (updateDto.paymentStatus) {
      order.paymentStatus = updateDto.paymentStatus;
    }

    return order.save();
  }

  async cancelOrder(id: string, userId: string, role: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (role !== UserRole.ADMIN && order.user.toString() !== userId) {
      throw new ForbiddenException('You are not authorized to cancel this order');
    }

    if (order.orderStatus === OrderStatus.SHIPPED || order.orderStatus === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel order that is already shipped or delivered');
    }

    order.orderStatus = OrderStatus.CANCELLED;

    // Restore stock
    for (const item of order.items) {
      const product = await this.productsService.findById(item.product.toString());
      if (product) {
        await this.productsService.update(product._id.toString(), {
          stock: product.stock + item.quantity,
        });
      }
    }

    return order.save();
  }
}
