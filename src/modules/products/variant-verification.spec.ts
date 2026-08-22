import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { OrdersService } from '../orders/orders.service';
import { Product } from './schemas/product.schema';
import { Order, OrderStatus } from '../orders/schemas/order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FtpService } from '../../common/services/ftp.service';
import { WhatsAppService } from '../notifications/whatsapp.service';

describe('Manual Verification Matrix - Variant & Inventory End-to-End Test Suite', () => {
  let productsService: ProductsService;
  let ordersService: OrdersService;

  // In-memory product DB for empirical verification
  const productDatabase: Map<string, any> = new Map();

  const mockProductModel: any = jest.fn().mockImplementation((dto) => {
    const id = `507f1f77bcf86cd7${Math.floor(10000000 + Math.random() * 90000000)}`;
    const doc = {
      ...dto,
      _id: id,
      id,
      isActive: dto.isActive !== false,
      save: jest.fn().mockImplementation(function () {
        const savedData = { ...this, _id: id, id };
        productDatabase.set(id, savedData);
        return Promise.resolve({
          ...savedData,
          populate: jest.fn().mockResolvedValue(savedData),
        });
      }),
    };
    return doc;
  });

  mockProductModel.find = jest.fn().mockImplementation(() => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockImplementation(async () => Array.from(productDatabase.values())),
  }));

  mockProductModel.findById = jest.fn().mockImplementation((id: string) => {
    const found = productDatabase.get(id?.toString());
    return {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  });

  mockProductModel.findByIdAndUpdate = jest.fn().mockImplementation((id: string, update: any) => {
    const existing = productDatabase.get(id?.toString());
    if (!existing) return { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) };
    const updated = { ...existing, ...(update.$set || {}) };
    if (update.$push?.images) {
      updated.images = [...(updated.images || []), update.$push.images];
    }
    productDatabase.set(id?.toString(), updated);
    return {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(updated),
    };
  });

  mockProductModel.countDocuments = jest.fn().mockResolvedValue(1);

  // In-memory order DB
  const orderDatabase: Map<string, any> = new Map();
  const mockOrderModel: any = jest.fn().mockImplementation((dto) => {
    const id = `507f1f77bcf86cd8${Math.floor(10000000 + Math.random() * 90000000)}`;
    const doc = {
      ...dto,
      _id: id,
      id,
      save: jest.fn().mockImplementation(function () {
        const savedData = { ...this, _id: id, id };
        orderDatabase.set(id, savedData);
        return Promise.resolve({
          ...savedData,
          populate: jest.fn().mockResolvedValue(savedData),
        });
      }),
    };
    return doc;
  });

  mockOrderModel.find = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
    then: (resolve: any) => resolve([]),
  });

  mockOrderModel.findById = jest.fn().mockImplementation((id: string) => {
    const found = orderDatabase.get(id?.toString());
    return {
      exec: jest.fn().mockResolvedValue(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  });

  const mockNotificationsService = {
    triggerAutoNotify: jest.fn().mockResolvedValue(true),
    createNotification: jest.fn().mockResolvedValue(true),
  };

  const mockFtpService = {
    uploadFile: jest.fn().mockResolvedValue(true),
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  const mockWhatsAppService = {
    generateOrderWhatsAppLink: jest.fn().mockReturnValue('https://wa.me/919667290056?text=Order'),
  };

  beforeEach(async () => {
    productDatabase.clear();
    orderDatabase.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        OrdersService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: FtpService, useValue: mockFtpService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('Case A: Existing Pyrite product loads 25 Gram variant (₹899, Stock 19) correctly from DB', async () => {
    // 1. Create existing product in DB
    const pyriteProduct = await productsService.create({
      title: 'Pyrite Stone AAA Grade',
      description: 'High grade natural raw pyrite stone cluster',
      category: '507f1f77bcf86cd799439099',
      price: 899,
      stock: 19,
      isActive: true,
      sizes: [
        { size: '25 Gram', price: 899, originalPrice: 1100, stock: 19, isActive: true },
      ],
    } as any);

    // 2. Fetch product by ID (simulating Admin Edit Product opening)
    const loadedProduct = await productsService.findById(pyriteProduct._id);

    expect(loadedProduct).toBeDefined();
    expect(loadedProduct.title).toBe('Pyrite Stone AAA Grade');
    expect(loadedProduct.sizes).toHaveLength(1);
    expect(loadedProduct.sizes[0].size).toBe('25 Gram');
    expect(loadedProduct.sizes[0].price).toBe(899);
    expect(loadedProduct.sizes[0].originalPrice).toBe(1100);
    expect(loadedProduct.sizes[0].stock).toBe(19);
  });

  it('Case B: Adding new Pyrite gram (50 Gram) allows manual price/stock entry and persists on reload', async () => {
    // 1. Existing product with 25 Gram
    const pyriteProduct = await productsService.create({
      title: 'Pyrite Stone AAA Grade',
      description: 'High grade natural raw pyrite stone cluster',
      category: '507f1f77bcf86cd799439099',
      price: 899,
      stock: 19,
      isActive: true,
      sizes: [
        { size: '25 Gram', price: 899, originalPrice: 1100, stock: 19, isActive: true },
      ],
    } as any);

    // 2. Admin adds 50 Gram variant manually with Selling Price 1200 and Stock 10
    const updatedProduct = await productsService.update(pyriteProduct._id, {
      sizes: [
        { size: '25 Gram', price: 899, originalPrice: 1100, stock: 19, isActive: true },
        { size: '50 Gram', price: 1200, originalPrice: 1500, stock: 10, isActive: true },
      ],
    } as any);

    // 3. Reload product from DB
    const reloadedProduct = await productsService.findById(pyriteProduct._id);

    expect(reloadedProduct.sizes).toHaveLength(2);
    expect(reloadedProduct.sizes[0].size).toBe('25 Gram');
    expect(reloadedProduct.sizes[0].price).toBe(899);
    expect(reloadedProduct.sizes[0].stock).toBe(19);

    expect(reloadedProduct.sizes[1].size).toBe('50 Gram');
    expect(reloadedProduct.sizes[1].price).toBe(1200);
    expect(reloadedProduct.sizes[1].originalPrice).toBe(1500);
    expect(reloadedProduct.sizes[1].stock).toBe(10);
  });

  it('Case C & D: Crystal Tree product loads 100 Beads variant correctly without value inheritance', async () => {
    const treeProduct = await productsService.create({
      title: '7 Chakra Crystal Gemstone Tree',
      description: 'Feng shui tree for positive energy',
      category: '507f1f77bcf86cd799439088',
      price: 1500,
      stock: 15,
      isActive: true,
      sizes: [
        { size: '100 Beads', price: 1500, stock: 15, isActive: true },
      ],
    } as any);

    const reloadedTree = await productsService.findById(treeProduct._id);
    expect(reloadedTree.sizes[0].size).toBe('100 Beads');
    expect(reloadedTree.sizes[0].price).toBe(1500);
    expect(reloadedTree.sizes[0].stock).toBe(15);
  });

  it('Case E: Bracelet 8mm & 10mm variants load saved values independently', async () => {
    const braceletProduct = await productsService.create({
      title: '7 Chakra Healing Bracelet',
      description: 'Natural stone energy bracelet',
      category: '507f1f77bcf86cd799439077',
      price: 450,
      stock: 20,
      isActive: true,
      sizes: [
        { size: '8mm', price: 450, stock: 8, isActive: true },
        { size: '10mm', price: 550, stock: 12, isActive: true },
      ],
    } as any);

    const reloadedBracelet = await productsService.findById(braceletProduct._id);
    expect(reloadedBracelet.sizes).toHaveLength(2);
    expect(reloadedBracelet.sizes[0]).toEqual({ size: '8mm', price: 450, stock: 8, isActive: true });
    expect(reloadedBracelet.sizes[1]).toEqual({ size: '10mm', price: 550, stock: 12, isActive: true });
  });

  it('Case F & G: Order Placement for variant (50 Gram x1) decreases stock ONLY from selected variant', async () => {
    // 1. Create Pyrite product with 25 Gram (Stock 19) and 50 Gram (Stock 10)
    const pyriteProduct = await productsService.create({
      title: 'Pyrite Stone AAA Grade',
      description: 'Natural Pyrite stone',
      category: '507f1f77bcf86cd799439099',
      price: 899,
      stock: 29,
      isActive: true,
      sizes: [
        { size: '25 Gram', price: 899, stock: 19, reservedStock: 0, isActive: true },
        { size: '50 Gram', price: 1200, stock: 10, reservedStock: 0, isActive: true },
      ],
    } as any);

    // 2. Customer places order for 50 Gram x1
    const orderResult = await ordersService.createOrder({
      customerName: 'Rohit Sharma',
      phone: '9876543210',
      whatsapp: '9876543210',
      shippingAddress: { street: 'Main St', city: 'Mumbai', state: 'MH', pincode: '400001' },
      cartItems: [
        {
          productId: pyriteProduct._id,
          title: 'Pyrite Stone AAA Grade',
          selectedWidthSize: '50 Gram',
          quantity: 1,
          price: 1200,
        },
      ],
      totalAmount: 1200,
    } as any);

    // 3. Admin confirms order
    await ordersService.confirmOrder(orderResult.order.id);

    // 4. Verify DB product state:
    // 25 Gram stock must remain 19
    // 50 Gram stock must decrease from 10 to 9
    // Total product stock must become 28 (19 + 9)
    const finalProduct = await productsService.findById(pyriteProduct._id);
    expect(finalProduct.sizes[0].stock).toBe(19);
    expect(finalProduct.sizes[1].stock).toBe(9);
    expect(finalProduct.stock).toBe(28);
  });
});
