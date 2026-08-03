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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a product restock notification request (Notify Me)' })
  @ApiResponse({ status: 201, description: 'Notification request saved' })
  create(@Body() createDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get list of notification requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated notifications list' })
  findAll(@Query() queryDto: QueryNotificationsDto) {
    return this.notificationsService.findAll(queryDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="notifications.csv"')
  @ApiOperation({ summary: 'Export notification requests as CSV (Admin only)' })
  exportCsv(@Query() queryDto: QueryNotificationsDto) {
    return this.notificationsService.exportCsv(queryDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update notification request status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationStatusDto,
  ) {
    return this.notificationsService.updateStatus(id, updateDto.status);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification request deleted' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
