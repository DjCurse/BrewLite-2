import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const service = {
    findAll: jest.fn<(...args: any[]) => Promise<any>>(),
    findOne: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    }).compile();

    controller = module.get(ProductsController);
  });

  it('GET /products chuyển query string xuống service', async () => {
    const payload = { data: [], categories: [], meta: {} };
    service.findAll.mockResolvedValue(payload);

    const query = { page: '2', pageSize: '6', category: 'Matcha', q: 'latte' };
    await expect(controller.findAll(query)).resolves.toBe(payload);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('GET /products/:id chuyển id đã parse xuống service', async () => {
    const product = { id: 7, name: 'Cà phê sữa đá' };
    service.findOne.mockResolvedValue(product);

    await expect(controller.findOne(7)).resolves.toBe(product);
    expect(service.findOne).toHaveBeenCalledWith(7);
  });
});
