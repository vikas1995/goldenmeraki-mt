import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchema, ProductNotification } from './schemas/notification.schema';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductNotification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, WhatsAppService],
  exports: [NotificationsService, WhatsAppService],
})
export class NotificationsModule {}
