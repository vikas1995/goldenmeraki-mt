import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly businessPhone: string;

  constructor(private readonly configService: ConfigService) {
    this.businessPhone = this.configService.get<string>('WHATSAPP_BUSINESS_NUMBER', '+919667290056');
  }

  /**
   * Generates a web WhatsApp link for customer orders.
   */
  generateOrderWhatsAppLink(orderData: {
    orderNumber: string;
    customerName: string;
    items: Array<{ title: string; quantity: number; price: number; selectedWidthSize?: string }>;
    totalAmount: number;
    shippingAddress: { street: string; city: string; state: string; pincode: string };
  }): string {
    const itemLines = orderData.items
      .map(
        (item) =>
          `• ${item.title}${item.selectedWidthSize ? ` (Width Size: ${item.selectedWidthSize})` : ''} (x${item.quantity}) - ₹${item.price * item.quantity}`,
      )
      .join('\n');

    const message = `🛍️ *NEW ORDER #${orderData.orderNumber}*\n\n` +
      `*Customer:* ${orderData.customerName}\n` +
      `*Address:* ${orderData.shippingAddress.street}, ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} - ${orderData.shippingAddress.pincode}\n\n` +
      `*Items:* \n${itemLines}\n\n` +
      `*Total Amount:* ₹${orderData.totalAmount}\n\n` +
      `Please confirm my order. Thank you!`;

    const encoded = encodeURIComponent(message);
    const cleanNumber = this.businessPhone.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanNumber}?text=${encoded}`;
  }

  /**
   * Send alert to business admin WhatsApp when a customer submits "Notify Me".
   */
  async sendNotifyMeAlertToBusiness(data: {
    productTitle: string;
    customerName: string;
    phone?: string;
    whatsapp: string;
    email?: string;
    requestedSize?: string;
  }): Promise<boolean> {
    const message = `🔔 *RESTOCK NOTIFICATION REQUEST*\n\n` +
      `*Product:* ${data.productTitle}\n` +
      (data.requestedSize ? `*Requested Width Size:* ${data.requestedSize}\n` : '') +
      `*Customer:* ${data.customerName}\n` +
      `*WhatsApp:* ${data.whatsapp}\n` +
      (data.phone ? `*Phone:* ${data.phone}\n` : '') +
      (data.email ? `*Email:* ${data.email}\n` : '') +
      `*Time:* ${new Date().toLocaleString()}\n`;

    this.logger.log(`[WhatsApp Alert to Business ${this.businessPhone}]:\n${message}`);
    // Future integration placeholder: Twilio / Meta WhatsApp Cloud API endpoint call
    return true;
  }

  /**
   * Auto-notify customer when product is back in stock.
   */
  async notifyCustomerRestock(data: {
    productTitle: string;
    customerWhatsApp: string;
    customerName: string;
    requestedSize?: string;
  }): Promise<boolean> {
    const sizeStr = data.requestedSize ? ` (Width Size: ${data.requestedSize})` : '';
    const message = `🎉 *GOOD NEWS!* Hi ${data.customerName}, "${data.productTitle}"${sizeStr} is back in stock! Order now on GoldenMeraki.`;
    this.logger.log(`[WhatsApp Restock Notification to ${data.customerWhatsApp}]: ${message}`);
    return true;
  }
}
