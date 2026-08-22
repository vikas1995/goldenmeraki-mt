import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { WhatsAppService } from '../notifications/whatsapp.service';

describe('OrdersService - Stock Reservation & Order Lifecycle', () => {
  let service: OrdersService;
  let mockOrderModel: any;
  let mockProductModel: any;
  let mockWhatsAppService: any;

  const mockProduct = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Natural Pyrite Bracelet',
    stock: 20,
    reservedStock: 0,
    isActive: true,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockProduct.stock = 20;
    mockProduct.reservedStock = 0;
    mockProduct.save.mockClear();

    mockProductModel = {
      findById: jest.fn().mockImplementation((id) => {
        if (id === mockProduct._id || id?.toString() === mockProduct._id) {
          return {
            exec: jest.fn().mockResolvedValue(mockProduct),
            then: (resolve: any) => resolve(mockProduct),
          };
        }
        return {
          exec: jest.fn().mockResolvedValue(null),
          then: (resolve: any) => resolve(null),
        };
      }),
    };

    mockOrderModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'order_123',
      id: 'order_123',
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    }));
    mockOrderModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      then: (resolve: any) => resolve([]),
    });
    mockOrderModel.findById = jest.fn();

    mockWhatsAppService = {
      generateOrderWhatsAppLink: jest.fn().mockReturnValue('https://wa.me/919667290056?text=Order'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('1. Normal checkout: reserves stock and sets status to AWAITING_WHATSAPP', async () => {
    const dto = {
      customerName: 'Aarav Sharma',
      phone: '9876543210',
      whatsapp: '9876543210',
      shippingAddress: { street: 'MG Road', city: 'Mumbai', state: 'MH', pincode: '400001' },
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Bracelet',
          quantity: 1,
          price: 999,
        },
      ],
      totalAmount: 999,
    };

    const result = await service.createOrder(dto as any);

    expect(result.order.orderStatus).toBe(OrderStatus.AWAITING_WHATSAPP);
    expect(mockProduct.stock).toBe(20); // Actual stock unchanged
    expect(mockProduct.reservedStock).toBe(1); // Reserved stock increased
    expect(result.whatsappUrl).toContain('https://wa.me');
  });

  it('2. WhatsApp click records handoff without confirming order or deducting stock', async () => {
    const mockOrder = {
      _id: 'order_123',
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      whatsappHandoffAt: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    mockOrderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOrder),
      then: (resolve: any) => resolve(mockOrder),
    });

    const updated = await service.recordWhatsappHandoff('order_123');

    expect(updated.orderStatus).toBe(OrderStatus.AWAITING_WHATSAPP);
    expect(updated.whatsappHandoffAt).toBeInstanceOf(Date);
    expect(mockProduct.stock).toBe(20);
  });

  it('3. Admin confirms order: finalizes stock deduction and releases reservation', async () => {
    mockProduct.stock = 20;
    mockProduct.reservedStock = 1;

    const mockOrder = {
      _id: 'order_123',
      orderNumber: 'GM-ORD-123',
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Bracelet',
          quantity: 1,
          price: 999,
        },
      ],
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    mockOrderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOrder),
      then: (resolve: any) => resolve(mockOrder),
    });

    const confirmed = await service.confirmOrder('order_123');

    expect(confirmed.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(mockProduct.stock).toBe(19); // Actual stock deducted
    expect(mockProduct.reservedStock).toBe(0); // Reservation released
  });

  it('4. Admin tries to confirm an already confirmed order: throws exception', async () => {
    const mockOrder = {
      _id: 'order_123',
      orderNumber: 'GM-ORD-123',
      orderStatus: OrderStatus.CONFIRMED,
      cartItems: [],
    };

    mockOrderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOrder),
      then: (resolve: any) => resolve(mockOrder),
    });

    await expect(service.confirmOrder('order_123')).rejects.toThrow(BadRequestException);
  });

  it('5. Admin cancels awaiting order: releases reserved stock', async () => {
    mockProduct.stock = 20;
    mockProduct.reservedStock = 1;

    const mockOrder = {
      _id: 'order_123',
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Bracelet',
          quantity: 1,
          price: 999,
        },
      ],
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    mockOrderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOrder),
      then: (resolve: any) => resolve(mockOrder),
    });

    const cancelled = await service.cancelOrder('order_123');

    expect(cancelled.orderStatus).toBe(OrderStatus.CANCELLED);
    expect(mockProduct.stock).toBe(20);
    expect(mockProduct.reservedStock).toBe(0);
  });

  it('6. Prevent overselling when reserved stock equals physical stock', async () => {
    mockProduct.stock = 1;
    mockProduct.reservedStock = 1; // Available = 0

    const dto = {
      customerName: 'Karan Patel',
      phone: '9876543210',
      whatsapp: '9876543210',
      shippingAddress: { street: 'MG Road', city: 'Mumbai', state: 'MH', pincode: '400001' },
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Bracelet',
          quantity: 1,
          price: 999,
        },
      ],
      totalAmount: 999,
    };

    await expect(service.createOrder(dto as any)).rejects.toThrow(BadRequestException);
  });
});
