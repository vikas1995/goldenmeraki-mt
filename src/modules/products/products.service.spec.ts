import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: any;

  beforeEach(async () => {
    productModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken('Product'),
          useValue: productModel,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('creates a product without sku', async () => {
    productModel.findOne.mockResolvedValue(null);
    const save = jest.fn().mockResolvedValue({ populate: jest.fn().mockResolvedValue({}) });
    productModel.prototype = { save };

    const created = await service.create({
      title: 'Test Product',
      description: 'A sample product',
      price: 100,
      stock: 5,
      category: '64f1c2d7e3a4b5c6d7e8f90',
    } as any);

    expect(created).toBeDefined();
  });
});
