import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create order and reserve stock' })
  @ApiResponse({ status: 201, description: 'Order created with AWAITING_WHATSAPP status and WhatsApp URL generated' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Public()
  @Post(':id/whatsapp-handoff')
  @ApiOperation({ summary: 'Record customer initiating WhatsApp handoff' })
  @ApiResponse({ status: 200, description: 'WhatsApp handoff timestamp recorded' })
  recordWhatsappHandoff(@Param('id') id: string) {
    return this.ordersService.recordWhatsappHandoff(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm order and finalize stock deduction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order confirmed and stock permanently deducted' })
  confirmOrder(@Param('id') id: string) {
    return this.ordersService.confirmOrder(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order and release reserved stock / restore stock (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock released/restored' })
  cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get paginated list of orders (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  findAll(@Query() queryOrdersDto: QueryOrdersDto) {
    return this.ordersService.findAll(queryOrdersDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @ApiOperation({ summary: 'Export orders as CSV (Admin only)' })
  exportCsv(@Query() queryOrdersDto: QueryOrdersDto) {
    return this.ordersService.exportCsv(queryOrdersDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status / payment status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
