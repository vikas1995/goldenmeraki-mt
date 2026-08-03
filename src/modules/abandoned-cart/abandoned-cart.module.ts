import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AbandonedCartController } from './abandoned-cart.controller';
import { AbandonedCartService } from './abandoned-cart.service';
import { AbandonedCart, AbandonedCartSchema } from './schemas/abandoned-cart.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AbandonedCart.name, schema: AbandonedCartSchema },
    ]),
  ],
  controllers: [AbandonedCartController],
  providers: [AbandonedCartService],
  exports: [AbandonedCartService, MongooseModule],
})
export class AbandonedCartModule {}
