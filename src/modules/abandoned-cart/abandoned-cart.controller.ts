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
import { AbandonedCartService } from './abandoned-cart.service';
import { CreateAbandonedCartDto } from './dto/create-abandoned-cart.dto';
import { QueryAbandonedCartDto } from './dto/query-abandoned-cart.dto';
import { UpdateAbandonedCartDto } from './dto/update-abandoned-cart.dto';

@ApiTags('Abandoned Cart')
@Controller('abandoned-cart')
@UseGuards(RolesGuard)
export class AbandonedCartController {
  constructor(private readonly abandonedCartService: AbandonedCartService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Save or update abandoned cart record automatically' })
  @ApiResponse({ status: 201, description: 'Abandoned cart record saved' })
  createOrUpdate(@Body() dto: CreateAbandonedCartDto) {
    return this.abandonedCartService.upsertCart(dto);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Update abandoned cart details or recovery status' })
  @ApiResponse({ status: 200, description: 'Abandoned cart updated' })
  update(@Param('id') id: string, @Body() dto: UpdateAbandonedCartDto) {
    return this.abandonedCartService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get list of abandoned carts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated abandoned carts list' })
  findAll(@Query() queryDto: QueryAbandonedCartDto) {
    return this.abandonedCartService.findAll(queryDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="abandoned_carts.csv"')
  @ApiOperation({ summary: 'Export abandoned carts as CSV (Admin only)' })
  exportCsv(@Query() queryDto: QueryAbandonedCartDto) {
    return this.abandonedCartService.exportCsv(queryDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Get abandoned cart by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Abandoned cart details' })
  findById(@Param('id') id: string) {
    return this.abandonedCartService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete abandoned cart record (Admin only)' })
  @ApiResponse({ status: 200, description: 'Abandoned cart deleted' })
  remove(@Param('id') id: string) {
    return this.abandonedCartService.remove(id);
  }
}
