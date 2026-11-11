<<<<<<< HEAD
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Matcha Latte' }),
    };
    controller = new ProductsController(service as unknown as ProductsService);
  });

  it('GET /products delegates to findAll', async () => {
    await expect(controller.findAll()).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('GET /products?category=Matcha delegates category filter', async () => {
    await controller.findAll('Matcha');
    expect(service.findAll).toHaveBeenCalledWith('Matcha');
  });

  it('GET /products/:id delegates parsed id', async () => {
    await expect(controller.findOne(1)).resolves.toEqual({ id: 1, name: 'Matcha Latte' });
    expect(service.findOne).toHaveBeenCalledWith(1);
=======
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
>>>>>>> origin/Tuan
  });
});
