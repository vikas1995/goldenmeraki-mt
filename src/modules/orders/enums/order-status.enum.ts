export enum OrderStatus {
  AWAITING_WHATSAPP = 'AWAITING_WHATSAPP',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  COD = 'cod',
  CARD = 'card',
  UPI = 'upi',
  NETBANKING = 'netbanking',
}
