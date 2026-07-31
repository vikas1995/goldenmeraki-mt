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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('Blogs')
@Controller('blogs')
@UseGuards(RolesGuard)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create blog post (Admin only)' })
  @ApiResponse({ status: 201, description: 'Blog post created' })
  create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.create(createBlogDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all published blog posts' })
  @ApiQuery({ name: 'includeUnpublished', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of blog posts' })
  findAll(@Query('includeUnpublished') includeUnpublished?: boolean) {
    return this.blogsService.findAll(includeUnpublished);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.blogsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get blog post by ID' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  findById(@Param('id') id: string) {
    return this.blogsService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update blog post (Admin only)' })
  @ApiResponse({ status: 200, description: 'Blog post updated' })
  update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogsService.update(id, updateBlogDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete blog post (Admin only)' })
  @ApiResponse({ status: 200, description: 'Blog post deleted' })
  remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
