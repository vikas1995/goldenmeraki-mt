import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Newsletter')
@Controller('newsletter')
@UseGuards(RolesGuard)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  @ApiResponse({ status: 200, description: 'Subscribed successfully' })
  subscribe(@Body() subscribeDto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(subscribeDto);
  }

  @Public()
  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from newsletter' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  unsubscribe(@Body() subscribeDto: SubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(subscribeDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'Get all active subscribers (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of subscribers' })
  findAllSubscribers() {
    return this.newsletterService.findAllSubscribers();
  }
}
