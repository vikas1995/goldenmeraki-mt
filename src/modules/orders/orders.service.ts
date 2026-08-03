import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order, OrderDocument, OrderStatus, PaymentStatus } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  private generateOrderNumber(): string {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `GM-ORD-${Date.now().toString().slice(-6)}${randomDigits}`;
  }

  async createOrder(createDto: CreateOrderDto) {
    const orderNumber = this.generateOrderNumber();

    const formattedCartItems = createDto.cartItems.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    }));

    const whatsappUrl = this.whatsAppService.generateOrderWhatsAppLink({
      orderNumber,
      customerName: createDto.customerName,
      items: createDto.cartItems,
      totalAmount: createDto.totalAmount,
      shippingAddress: createDto.shippingAddress,
    });

    const newOrder = new this.orderModel({
      orderNumber,
      customerName: createDto.customerName,
      phone: createDto.phone,
      whatsapp: createDto.whatsapp,
      shippingAddress: createDto.shippingAddress,
      cartItems: formattedCartItems,
      totalAmount: createDto.totalAmount,
      orderDate: new Date(),
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      source: createDto.source || 'WHATSAPP_WEB',
      orderNotes: createDto.orderNotes,
      generatedWhatsappMessage: whatsappUrl,
    });

    const savedOrder = await newOrder.save();

    return {
      order: savedOrder,
      whatsappUrl,
    };
  }

  async findAll(queryDto: QueryOrdersDto) {
    const { page = 1, limit = 10, search, orderStatus, paymentStatus } = queryDto;
    const filter: any = {};

    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { whatsapp: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto): Promise<OrderDocument> {
    const updateData: any = {};
    if (updateDto.orderStatus) updateData.orderStatus = updateDto.orderStatus;
    if (updateDto.paymentStatus) updateData.paymentStatus = updateDto.paymentStatus;

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return updatedOrder;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.orderModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return { message: 'Order deleted successfully' };
  }

  async exportCsv(queryDto: QueryOrdersDto): Promise<string> {
    const { orders } = await this.findAll({ ...queryDto, limit: 10000 });
    const headers = [
      'Order Number',
      'Customer Name',
      'Phone',
      'WhatsApp',
      'Address',
      'Total Amount',
      'Order Status',
      'Payment Status',
      'Source',
      'Date',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.phone,
      o.whatsapp,
      `"${o.shippingAddress.street}, ${o.shippingAddress.city}, ${o.shippingAddress.state} ${o.shippingAddress.pincode}"`,
      o.totalAmount,
      o.orderStatus,
      o.paymentStatus,
      o.source,
      new Date(o.orderDate).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
