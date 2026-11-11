import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('returns all products ordered by id', async () => {
    const products = [{ id: 1, name: 'Matcha Latte' }];
    prisma.product.findMany.mockResolvedValue(products);

    await expect(service.findAll()).resolves.toEqual(products);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: 'asc' },
    });
  });

  it('filters products by category', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await service.findAll('Matcha');

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { category: 'Matcha' },
      orderBy: { id: 'asc' },
    });
  });

  it('does not filter when category is Tất cả', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await service.findAll('Tất cả');

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: 'asc' },
    });
  });

  it('returns a product by id', async () => {
    const product = { id: 2, name: 'Cà phê sữa đá' };
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(service.findOne(2)).resolves.toEqual(product);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('throws NotFoundException when product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
