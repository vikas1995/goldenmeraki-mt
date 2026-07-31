import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all store settings' })
  @ApiResponse({ status: 200, description: 'List of store settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Get setting value by key' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch()
  @ApiOperation({ summary: 'Update or create setting (Admin only)' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  upsert(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.upsert(updateSettingDto);
  }
}
