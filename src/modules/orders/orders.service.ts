import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order, OrderDocument, OrderStatus, PaymentStatus } from './schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { InventoryStatus } from '../products/enums/inventory-status.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  private generateOrderNumber(): string {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `GM-ORD-${Date.now().toString().slice(-6)}${randomDigits}`;
  }

  private async findOrderDoc(id: string): Promise<OrderDocument | null> {
    const res = this.orderModel.findById(id);
    if (res && typeof res.exec === 'function') {
      return await res.exec();
    }
    return await res;
  }

  /**
   * Helper to check and release stock reservations for expired AWAITING_WHATSAPP orders.
   */
  async checkAndReleaseExpiredOrders(): Promise<number> {
    const now = new Date();
    const query = this.orderModel.find({
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      awaitingWhatsappExpiresAt: { $lte: now },
    });
    const expiredOrders: OrderDocument[] = (query && typeof query.exec === 'function') ? await query.exec() : await query;

    if (Array.isArray(expiredOrders)) {
      for (const order of expiredOrders) {
        await this.releaseOrderReservation(order);
        order.orderStatus = OrderStatus.EXPIRED;
        order.expiredAt = now;
        await order.save();
      }
      return expiredOrders.length;
    }
    return 0;
  }

  /**
   * Internal helper to release reserved stock back to available pool.
   */
  private async releaseOrderReservation(order: OrderDocument) {
    for (const item of order.cartItems) {
      if (!item.productId || !Types.ObjectId.isValid(item.productId)) continue;
      const res = this.productModel.findById(item.productId);
      const product = (res && typeof res.exec === 'function') ? await res.exec() : await res;
      if (!product) continue;

      if (product.sizes && product.sizes.length > 0 && item.selectedWidthSize) {
        const sizeObj = product.sizes.find(
          (s) => s.size.toLowerCase() === item.selectedWidthSize?.toLowerCase(),
        );
        if (sizeObj) {
          sizeObj.reservedStock = Math.max(0, (sizeObj.reservedStock || 0) - item.quantity);
        }
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
      } else {
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
      }

      await product.save();
    }
  }

  async createOrder(createDto: CreateOrderDto) {
    // Release any expired orders first to ensure accurate inventory
    await this.checkAndReleaseExpiredOrders();

    // Step 1: Validate available stock for each cart item (Available = Stock - ReservedStock)
    for (const item of createDto.cartItems) {
      if (!item.productId || !Types.ObjectId.isValid(item.productId)) continue;

      const res = this.productModel.findById(item.productId);
      const product = (res && typeof res.exec === 'function') ? await res.exec() : await res;
      if (!product) {
        throw new BadRequestException(`Product "${item.title}" was not found.`);
      }

      if (!product.isActive) {
        throw new BadRequestException(`Product "${item.title}" is currently unavailable.`);
      }

      let availableStock = Math.max(0, product.stock - (product.reservedStock || 0));
      if (product.sizes && product.sizes.length > 0 && item.selectedWidthSize) {
        const sizeObj = product.sizes.find(
          (s) => s.size.toLowerCase() === item.selectedWidthSize?.toLowerCase(),
        );
        if (sizeObj) {
          availableStock = sizeObj.isActive !== false ? Math.max(0, sizeObj.stock - (sizeObj.reservedStock || 0)) : 0;
        }
      }

      if (item.quantity > availableStock) {
        const sizeStr = item.selectedWidthSize ? ` (${item.selectedWidthSize})` : '';
        throw new BadRequestException(
          `Cannot place order: Requested quantity (${item.quantity}) for "${item.title}"${sizeStr} exceeds available stock (${availableStock}).`,
        );
      }
    }

    // Step 2: Reserve stock (increment reservedStock, do NOT decrement stock yet)
    for (const item of createDto.cartItems) {
      if (!item.productId || !Types.ObjectId.isValid(item.productId)) continue;

      const res = this.productModel.findById(item.productId);
      const product = (res && typeof res.exec === 'function') ? await res.exec() : await res;
      if (!product) continue;

      if (product.sizes && product.sizes.length > 0 && item.selectedWidthSize) {
        const sizeObj = product.sizes.find(
          (s) => s.size.toLowerCase() === item.selectedWidthSize?.toLowerCase(),
        );
        if (sizeObj) {
          sizeObj.reservedStock = (sizeObj.reservedStock || 0) + item.quantity;
        }
        product.reservedStock = (product.reservedStock || 0) + item.quantity;
      } else {
        product.reservedStock = (product.reservedStock || 0) + item.quantity;
      }

      await product.save();
    }

    const orderNumber = this.generateOrderNumber();

    const formattedCartItems = createDto.cartItems.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      selectedWidthSize: item.selectedWidthSize,
    }));

    const whatsappUrl = this.whatsAppService.generateOrderWhatsAppLink({
      orderNumber,
      customerName: createDto.customerName,
      items: createDto.cartItems,
      totalAmount: createDto.totalAmount,
      shippingAddress: createDto.shippingAddress,
    });

    const awaitingWhatsappExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours expiration window

    const newOrder = new this.orderModel({
      orderNumber,
      customerName: createDto.customerName,
      phone: createDto.phone,
      whatsapp: createDto.whatsapp,
      shippingAddress: createDto.shippingAddress,
      cartItems: formattedCartItems,
      totalAmount: createDto.totalAmount,
      orderDate: new Date(),
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      paymentStatus: PaymentStatus.PENDING,
      source: createDto.source || 'WHATSAPP_WEB',
      orderNotes: createDto.orderNotes,
      generatedWhatsappMessage: whatsappUrl,
      awaitingWhatsappExpiresAt,
    });

    const savedOrder = await newOrder.save();

    return {
      order: savedOrder,
      whatsappUrl,
    };
  }

  /**
   * Record that customer initiated WhatsApp handoff from Thank You page.
   */
  async recordWhatsappHandoff(id: string): Promise<OrderDocument> {
    const order = await this.findOrderDoc(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    order.whatsappHandoffAt = new Date();
    // Keep status as AWAITING_WHATSAPP as requirement explicitly specifies:
    // Opening WhatsApp must NOT automatically mark order as confirmed!
    return await order.save();
  }

  /**
   * Admin Action: Confirm Order (Finalize stock deduction & release reservation atomically).
   */
  async confirmOrder(id: string): Promise<OrderDocument> {
    const order = await this.findOrderDoc(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.orderStatus === OrderStatus.CONFIRMED) {
      throw new BadRequestException(`Order #${order.orderNumber} is already confirmed.`);
    }

    if (order.orderStatus === OrderStatus.CANCELLED || order.orderStatus === OrderStatus.EXPIRED) {
      throw new BadRequestException(`Order #${order.orderNumber} cannot be confirmed because it is ${order.orderStatus}.`);
    }

    // Finalize stock deduction and release reservation
    for (const item of order.cartItems) {
      if (!item.productId || !Types.ObjectId.isValid(item.productId)) continue;

      const res = this.productModel.findById(item.productId);
      const product = (res && typeof res.exec === 'function') ? await res.exec() : await res;
      if (!product) continue;

      if (product.sizes && product.sizes.length > 0 && item.selectedWidthSize) {
        const sizeObj = product.sizes.find(
          (s) => s.size.toLowerCase() === item.selectedWidthSize?.toLowerCase(),
        );
        if (sizeObj) {
          sizeObj.stock = Math.max(0, sizeObj.stock - item.quantity);
          sizeObj.reservedStock = Math.max(0, (sizeObj.reservedStock || 0) - item.quantity);
        }
        const totalSizeStock = product.sizes.reduce(
          (sum, s) => sum + (s.isActive !== false ? s.stock : 0),
          0,
        );
        product.stock = totalSizeStock;
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);

        if (totalSizeStock <= 0) {
          product.inventoryStatus = InventoryStatus.OUT_OF_STOCK;
        }
      } else {
        product.stock = Math.max(0, product.stock - item.quantity);
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);

        if (product.stock <= 0) {
          product.inventoryStatus = InventoryStatus.OUT_OF_STOCK;
        }
      }

      await product.save();
    }

    order.orderStatus = OrderStatus.CONFIRMED;
    order.confirmedAt = new Date();
    return await order.save();
  }

  /**
   * Admin Action: Cancel Order (Release reservation if AWAITING_WHATSAPP, or restore stock if CONFIRMED).
   */
  async cancelOrder(id: string): Promise<OrderDocument> {
    const order = await this.findOrderDoc(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      return order;
    }

    if (order.orderStatus === OrderStatus.AWAITING_WHATSAPP) {
      await this.releaseOrderReservation(order);
    } else if (
      order.orderStatus === OrderStatus.CONFIRMED ||
      order.orderStatus === OrderStatus.PROCESSING ||
      order.orderStatus === OrderStatus.SHIPPED
    ) {
      // Restore physical stock for already confirmed order
      for (const item of order.cartItems) {
        if (!item.productId || !Types.ObjectId.isValid(item.productId)) continue;

        const res = this.productModel.findById(item.productId);
        const product = (res && typeof res.exec === 'function') ? await res.exec() : await res;
        if (!product) continue;

        if (product.sizes && product.sizes.length > 0 && item.selectedWidthSize) {
          const sizeObj = product.sizes.find(
            (s) => s.size.toLowerCase() === item.selectedWidthSize?.toLowerCase(),
          );
          if (sizeObj) {
            sizeObj.stock = sizeObj.stock + item.quantity;
          }
          const totalSizeStock = product.sizes.reduce(
            (sum, s) => sum + (s.isActive !== false ? s.stock : 0),
            0,
          );
          product.stock = totalSizeStock;
          if (totalSizeStock > 0) {
            product.inventoryStatus = InventoryStatus.IN_STOCK;
          }
        } else {
          product.stock = product.stock + item.quantity;
          if (product.stock > 0) {
            product.inventoryStatus = InventoryStatus.IN_STOCK;
          }
        }
        await product.save();
      }
    }

    order.orderStatus = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    return await order.save();
  }

  async findAll(queryDto: QueryOrdersDto) {
    await this.checkAndReleaseExpiredOrders();

    const { page = 1, limit = 10, search, orderStatus, paymentStatus } = queryDto;
    const filter: any = {};

    if (orderStatus && (orderStatus as any) !== 'all') filter.orderStatus = orderStatus;
    if (paymentStatus && (paymentStatus as any) !== 'all') filter.paymentStatus = paymentStatus;

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
    await this.checkAndReleaseExpiredOrders();

    const order = await this.findOrderDoc(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto): Promise<OrderDocument> {
    if (updateDto.orderStatus === OrderStatus.CONFIRMED) {
      return this.confirmOrder(id);
    }

    if (updateDto.orderStatus === OrderStatus.CANCELLED) {
      return this.cancelOrder(id);
    }

    const existingOrder = await this.findOrderDoc(id);
    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const updateData: any = {};
    if (updateDto.orderStatus) updateData.orderStatus = updateDto.orderStatus;
    if (updateDto.paymentStatus) updateData.paymentStatus = updateDto.paymentStatus;

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    return updatedOrder!;
  }

  async remove(id: string): Promise<{ message: string }> {
    const order = await this.findOrderDoc(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.orderStatus === OrderStatus.AWAITING_WHATSAPP) {
      await this.releaseOrderReservation(order);
    }

    await this.orderModel.findByIdAndDelete(id);
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
      'WhatsApp Handoff At',
      'Confirmed At',
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
      o.whatsappHandoffAt ? new Date(o.whatsappHandoffAt).toISOString() : '',
      o.confirmedAt ? new Date(o.confirmedAt).toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
