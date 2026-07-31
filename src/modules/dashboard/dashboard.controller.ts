import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(UserRole.ADMIN)
  @Get('stats')
  @ApiOperation({ summary: 'Get administrative dashboard analytics and metrics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Store statistics, revenue, recent orders, low stock items' })
  getAdminStats() {
    return this.dashboardService.getAdminStats();
  }
}
