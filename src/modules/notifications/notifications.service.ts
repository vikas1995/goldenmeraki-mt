import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationStatus } from './enums/notification-status.enum';
import { NotificationDocument, ProductNotification } from './schemas/notification.schema';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(ProductNotification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async createNotification(createDto: CreateNotificationDto): Promise<ProductNotification> {
    const notification = new this.notificationModel({
      productId: new Types.ObjectId(createDto.productId),
      productTitle: createDto.productTitle,
      customerName: createDto.customerName,
      phone: createDto.phone || createDto.whatsapp,
      whatsapp: createDto.whatsapp,
      email: createDto.email,
      requestedSize: createDto.requestedSize,
      requestedDate: new Date(),
      status: NotificationStatus.PENDING,
    });

    const saved = await notification.save();

    // Trigger WhatsApp notification to Business Admin immediately (Requirement #7)
    await this.whatsAppService.sendNotifyMeAlertToBusiness({
      productTitle: createDto.productTitle,
      customerName: createDto.customerName,
      phone: createDto.phone || createDto.whatsapp,
      whatsapp: createDto.whatsapp,
      email: createDto.email,
      requestedSize: createDto.requestedSize,
    });

    return saved;
  }

  async findAll(queryDto: QueryNotificationsDto) {
    const { page = 1, limit = 10, search, status, productId } = queryDto;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { whatsapp: { $regex: search, $options: 'i' } },
        { productTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      notifications: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<ProductNotification> {
    const updateData: any = { status };
    if (status === NotificationStatus.CONTACTED || status === NotificationStatus.COMPLETED) {
      updateData.notifiedAt = new Date();
    }

    const notification = await this.notificationModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' },
    );

    if (!notification) {
      throw new NotFoundException(`Notification request with ID ${id} not found`);
    }

    return notification;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.notificationModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException(`Notification request with ID ${id} not found`);
    }
    return { message: 'Notification deleted successfully' };
  }

  async exportCsv(queryDto: QueryNotificationsDto): Promise<string> {
    const { notifications } = await this.findAll({ ...queryDto, limit: 10000 });
    const headers = ['ID', 'Product Title', 'Requested Width Size', 'Customer Name', 'WhatsApp', 'Email', 'Status', 'Requested Date'];
    const rows = notifications.map((n) => [
      n._id,
      `"${n.productTitle.replace(/"/g, '""')}"`,
      `"${(n.requestedSize || '').replace(/"/g, '""')}"`,
      `"${n.customerName.replace(/"/g, '""')}"`,
      n.whatsapp,
      n.email || '',
      n.status,
      new Date(n.requestedDate).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Future ready auto notify trigger when product moves from OUT_OF_STOCK to IN_STOCK (Requirement #13)
   */
  async triggerAutoNotify(productId: string): Promise<number> {
    const pendingNotifications = await this.notificationModel.find({
      productId: new Types.ObjectId(productId),
      status: NotificationStatus.PENDING,
    });

    let count = 0;
    for (const notif of pendingNotifications) {
      await this.whatsAppService.notifyCustomerRestock({
        productTitle: notif.productTitle,
        customerWhatsApp: notif.whatsapp,
        customerName: notif.customerName,
        requestedSize: notif.requestedSize,
      });
      notif.status = NotificationStatus.COMPLETED;
      notif.notifiedAt = new Date();
      await notif.save();
      count++;
    }
    return count;
  }
}
