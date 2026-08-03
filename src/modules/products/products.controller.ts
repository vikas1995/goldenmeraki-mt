import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { BulkCategoryDto } from './dto/bulk-category.dto';
import { BulkInventoryDto } from './dto/bulk-inventory.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { NotifyProductDto } from './dto/notify-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiResponse({ status: 200, description: 'Paginated products result' })
  findAll(@Query() queryProductsDto: QueryProductsDto) {
    return this.productsService.findAll(queryProductsDto);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  @ApiResponse({ status: 200, description: 'List of featured products' })
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Public()
  @Post(':id/notify')
  @ApiOperation({ summary: 'Submit Notify Me request when product is out of stock' })
  @ApiResponse({ status: 201, description: 'Notification request submitted successfully' })
  notifyMe(@Param('id') id: string, @Body() dto: NotifyProductDto) {
    return this.productsService.notifyMe(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch('bulk/category')
  @ApiOperation({ summary: 'Bulk update product category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated for selected products' })
  bulkUpdateCategory(@Body() dto: BulkCategoryDto) {
    return this.productsService.bulkUpdateCategory(dto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update product status / feature (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated for selected products' })
  bulkUpdateStatus(@Body() dto: BulkStatusDto) {
    return this.productsService.bulkUpdateStatus(dto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch('bulk/inventory')
  @ApiOperation({ summary: 'Bulk update inventory status / stock quantity (Admin only)' })
  @ApiResponse({ status: 200, description: 'Inventory updated for selected products' })
  bulkUpdateInventory(@Body() dto: BulkInventoryDto) {
    return this.productsService.bulkUpdateInventory(dto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update product by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
