import { Controller, Get, Header as HttpHeader } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SeoService } from './seo.service';

@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Public()
  @Get('sitemap.xml')
  @HttpHeader('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Dynamic XML Sitemap' })
  async getSitemap() {
    return await this.seoService.generateSitemapXml();
  }

  @Public()
  @Get('robots.txt')
  @HttpHeader('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Dynamic Robots.txt' })
  getRobots() {
    return this.seoService.generateRobotsTxt();
  }
}
