import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';

@Injectable()
export class SeoService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async generateSitemapXml(): Promise<string> {
    const domain = 'https://goldenmerakigems.com';
    const currentDate = new Date().toISOString().split('T')[0];

    const [products, categories] = await Promise.all([
      this.productModel.find({ isActive: true }).select('slug updatedAt images').lean().exec(),
      this.categoryModel.find({ isActive: true }).select('slug updatedAt').lean().exec(),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${domain}/</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. All Categories Page
    xml += `  <url>\n`;
    xml += `    <loc>${domain}/category/all</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;

    // 3. Dynamic Categories
    for (const cat of categories as any[]) {
      if (!cat.slug) continue;
      const lastMod = cat.updatedAt ? new Date(cat.updatedAt).toISOString().split('T')[0] : currentDate;
      xml += `  <url>\n`;
      xml += `    <loc>${domain}/category/${cat.slug}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 4. Dynamic Products
    for (const prod of products as any[]) {
      if (!prod.slug) continue;
      const lastMod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : currentDate;
      xml += `  <url>\n`;
      xml += `    <loc>${domain}/product/${prod.slug}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;

      if (prod.images && prod.images.length > 0) {
        for (const imgUrl of prod.images) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${imgUrl}</image:loc>\n`;
          xml += `    </image:image>\n`;
        }
      }
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /
Allow: /product/
Allow: /category/
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /thank-you
Disallow: /loader

Sitemap: https://goldenmerakigems.com/sitemap.xml
`;
  }
}
