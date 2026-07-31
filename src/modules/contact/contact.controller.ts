import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contact')
@Controller('contact')
@UseGuards(RolesGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit contact message' })
  @ApiResponse({ status: 201, description: 'Contact message submitted' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'List all contact messages (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  findAll() {
    return this.contactService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark contact message as read (Admin only)' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  markAsRead(@Param('id') id: string) {
    return this.contactService.markAsRead(id);
  }
}
