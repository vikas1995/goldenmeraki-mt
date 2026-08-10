import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { FtpService } from '../../common/services/ftp.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    NotificationsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, FtpService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
