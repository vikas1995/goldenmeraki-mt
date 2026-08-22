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
    title: 'Natural Pyrite Stone',
    stock: 29,
    reservedStock: 0,
    isActive: true,
    sizes: [
      { size: '25 Gram', price: 899, stock: 19, reservedStock: 0, isActive: true },
      { size: '50 Gram', price: 1200, stock: 10, reservedStock: 0, isActive: true },
    ],
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockProduct.stock = 29;
    mockProduct.reservedStock = 0;
    mockProduct.sizes[0].stock = 19;
    mockProduct.sizes[0].reservedStock = 0;
    mockProduct.sizes[1].stock = 10;
    mockProduct.sizes[1].reservedStock = 0;
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

  it('1. Normal checkout: reserves variant stock and sets status to AWAITING_WHATSAPP', async () => {
    const dto = {
      customerName: 'Aarav Sharma',
      phone: '9876543210',
      whatsapp: '9876543210',
      shippingAddress: { street: 'MG Road', city: 'Mumbai', state: 'MH', pincode: '400001' },
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Stone',
          selectedWidthSize: '50 Gram',
          quantity: 1,
          price: 1200,
        },
      ],
      totalAmount: 1200,
    };

    const result = await service.createOrder(dto as any);

    expect(result.order.orderStatus).toBe(OrderStatus.AWAITING_WHATSAPP);
    expect(mockProduct.sizes[1].stock).toBe(10); // Actual variant stock unchanged
    expect(mockProduct.sizes[1].reservedStock).toBe(1); // Variant reserved stock increased
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
  });

  it('3. Admin confirms order: finalizes stock deduction for specific variant only', async () => {
    mockProduct.sizes[1].stock = 10;
    mockProduct.sizes[1].reservedStock = 1;

    const mockOrder = {
      _id: 'order_123',
      orderNumber: 'GM-ORD-123',
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Stone',
          selectedWidthSize: '50 Gram',
          quantity: 1,
          price: 1200,
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
    expect(mockProduct.sizes[0].stock).toBe(19); // 25 Gram stock UNCHANGED
    expect(mockProduct.sizes[1].stock).toBe(9); // 50 Gram stock deducted from 10 to 9
    expect(mockProduct.stock).toBe(28); // Total aggregated stock updated
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

  it('5. Admin cancels awaiting order: releases reserved stock of variant', async () => {
    mockProduct.sizes[1].stock = 10;
    mockProduct.sizes[1].reservedStock = 1;

    const mockOrder = {
      _id: 'order_123',
      orderStatus: OrderStatus.AWAITING_WHATSAPP,
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Stone',
          selectedWidthSize: '50 Gram',
          quantity: 1,
          price: 1200,
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
    expect(mockProduct.sizes[1].stock).toBe(10);
    expect(mockProduct.sizes[1].reservedStock).toBe(0);
  });

  it('6. Prevent overselling when reserved variant stock equals physical variant stock', async () => {
    mockProduct.sizes[1].stock = 1;
    mockProduct.sizes[1].reservedStock = 1; // Available 50 Gram = 0

    const dto = {
      customerName: 'Karan Patel',
      phone: '9876543210',
      whatsapp: '9876543210',
      shippingAddress: { street: 'MG Road', city: 'Mumbai', state: 'MH', pincode: '400001' },
      cartItems: [
        {
          productId: mockProduct._id,
          title: 'Natural Pyrite Stone',
          selectedWidthSize: '50 Gram',
          quantity: 1,
          price: 1200,
        },
      ],
      totalAmount: 1200,
    };

    await expect(service.createOrder(dto as any)).rejects.toThrow(BadRequestException);
  });
});
