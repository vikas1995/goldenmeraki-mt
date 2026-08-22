import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductsService } from './products.service';
import { FtpService } from '../../common/services/ftp.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: any;
  let mockNotificationsService: any;
  let mockFtpService: any;

  beforeEach(async () => {
    const mockSave = jest.fn().mockResolvedValue({
      populate: jest.fn().mockResolvedValue({}),
    });

    productModel = jest.fn().mockImplementation(function(dto) {
      this.save = mockSave;
      return this;
    });

    productModel.findOne = jest.fn();
    productModel.findByIdAndUpdate = jest.fn();
    productModel.findByIdAndDelete = jest.fn();
    productModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    productModel.countDocuments = jest.fn();
    productModel.create = jest.fn();

    mockNotificationsService = {
      triggerAutoNotify: jest.fn(),
    };

    mockFtpService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken('Product'),
          useValue: productModel,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: FtpService,
          useValue: mockFtpService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('creates a product without sku', async () => {
    productModel.findOne.mockResolvedValue(null);

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
