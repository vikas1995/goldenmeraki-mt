import { PartialType } from '@nestjs/swagger';
import { CreateAbandonedCartDto } from './create-abandoned-cart.dto';

export class UpdateAbandonedCartDto extends PartialType(CreateAbandonedCartDto) {}
