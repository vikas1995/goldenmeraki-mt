import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAbandonedCartDto } from './dto/create-abandoned-cart.dto';
import { QueryAbandonedCartDto } from './dto/query-abandoned-cart.dto';
import { UpdateAbandonedCartDto } from './dto/update-abandoned-cart.dto';
import { RecoveryStatus } from './enums/recovery-status.enum';
import { AbandonedCart, AbandonedCartDocument } from './schemas/abandoned-cart.schema';

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    @InjectModel(AbandonedCart.name)
    private readonly abandonedCartModel: Model<AbandonedCartDocument>,
  ) {}

  async upsertCart(dto: CreateAbandonedCartDto): Promise<AbandonedCartDocument> {
    const formattedProducts = dto.products.map((p) => ({
      productId: new Types.ObjectId(p.productId),
      title: p.title,
      quantity: p.quantity,
      price: p.price,
      image: p.image,
    }));

    const updateData: any = {
      cartId: dto.cartId,
      products: formattedProducts,
      cartTotal: dto.cartTotal,
      lastActivity: new Date(),
      source: dto.source || 'WEB_CHECKOUT',
    };

    if (dto.customerName) updateData.customerName = dto.customerName;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.whatsapp) updateData.whatsapp = dto.whatsapp;
    if (dto.email) updateData.email = dto.email;
    if (dto.shippingAddress) updateData.shippingAddress = dto.shippingAddress;
    if (dto.recoveryStatus) updateData.recoveryStatus = dto.recoveryStatus;

    const cart = await this.abandonedCartModel.findOneAndUpdate(
      { cartId: dto.cartId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return cart;
  }

  async findAll(queryDto: QueryAbandonedCartDto) {
    const { page = 1, limit = 10, search, recoveryStatus, sort } = queryDto;
    const filter: any = {};

    if (recoveryStatus) {
      filter.recoveryStatus = recoveryStatus;
    }

    if (search) {
      filter.$or = [
        { cartId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { whatsapp: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOptions: any = { lastActivity: -1 };
    if (sort === 'cartTotal_desc') sortOptions = { cartTotal: -1 };
    if (sort === 'cartTotal_asc') sortOptions = { cartTotal: 1 };
    if (sort === 'lastActivity_desc') sortOptions = { lastActivity: -1 };

    const skip = (page - 1) * limit;

    const [carts, total] = await Promise.all([
      this.abandonedCartModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.abandonedCartModel.countDocuments(filter),
    ]);

    return {
      abandonedCarts: carts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<AbandonedCartDocument> {
    const cart = await this.abandonedCartModel.findById(id).exec();
    if (!cart) {
      throw new NotFoundException(`Abandoned Cart record with ID ${id} not found`);
    }
    return cart;
  }

  async update(id: string, updateDto: UpdateAbandonedCartDto): Promise<AbandonedCartDocument> {
    const updateData: any = { ...updateDto, lastActivity: new Date() };

    if (updateDto.products) {
      updateData.products = updateDto.products.map((p) => ({
        productId: new Types.ObjectId(p.productId),
        title: p.title,
        quantity: p.quantity,
        price: p.price,
        image: p.image,
      }));
    }

    const updated = await this.abandonedCartModel
      .findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Abandoned Cart record with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.abandonedCartModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException(`Abandoned Cart record with ID ${id} not found`);
    }
    return { message: 'Abandoned Cart record deleted successfully' };
  }

  async exportCsv(queryDto: QueryAbandonedCartDto): Promise<string> {
    const { abandonedCarts } = await this.findAll({ ...queryDto, limit: 10000 });
    const headers = [
      'Cart ID',
      'Customer Name',
      'Phone',
      'WhatsApp',
      'Email',
      'Products Count',
      'Cart Value',
      'Recovery Status',
      'Recovery Count',
      'Last Activity',
    ];

    const rows = abandonedCarts.map((c) => [
      c.cartId,
      `"${(c.customerName || '').replace(/"/g, '""')}"`,
      c.phone || '',
      c.whatsapp || '',
      c.email || '',
      c.products?.length || 0,
      c.cartTotal,
      c.recoveryStatus,
      c.recoveryCount,
      new Date(c.lastActivity).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // --- Future-Ready Architecture Extensions ---
  async triggerWhatsAppReminder(id: string): Promise<boolean> {
    const cart = await this.findById(id);
    cart.recoveryCount += 1;
    await cart.save();
    this.logger.log(`[WhatsApp Reminder Queued] Cart #${cart.cartId} to ${cart.whatsapp}`);
    return true;
  }

  async triggerEmailReminder(id: string): Promise<boolean> {
    const cart = await this.findById(id);
    this.logger.log(`[Email Reminder Queued] Cart #${cart.cartId} to ${cart.email}`);
    return true;
  }
}
