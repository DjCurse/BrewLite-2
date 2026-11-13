import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

const sampleProduct = {
  id: 'prod-1',
  name: 'Matcha Latte',
  category: 'Matcha',
  description: 'Matcha Nhật Bản, sữa tươi dịu béo',
  price: 45000,
  imageUrl: null,
  stockQuantity: 20,
  isActive: true,
  createdAt: new Date('2026-11-01T00:00:00Z'),
};

const asyncMock = () => jest.fn<(...args: any[]) => Promise<any>>();

describe('ProductsService', () => {
  let service: ProductsService;
  const prisma = {
    product: {
      count: asyncMock(),
      findMany: asyncMock(),
      findUnique: asyncMock(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  /** findMany được gọi 2 lần: lấy trang dữ liệu, rồi lấy danh sách danh mục. */
  function mockList(total: number, rows: unknown[], categories: string[]) {
    prisma.product.count.mockResolvedValue(total);
    prisma.product.findMany
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(categories.map((category) => ({ category })));
  }

  describe('findAll', () => {
    it('dùng phân trang mặc định (trang 1, 9 món) và chỉ lấy món đang bán', async () => {
      mockList(1, [sampleProduct], ['Matcha']);

      const result = await service.findAll();

      expect(prisma.product.findMany).toHaveBeenNthCalledWith(1, {
        where: { isActive: true },
        orderBy: { id: 'asc' },
        skip: 0,
        take: 9,
      });
      expect(result.data).toEqual([sampleProduct]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 9,
        total: 1,
        totalPages: 1,
      });
    });

    it('tính skip/take đúng theo page và pageSize', async () => {
      mockList(25, [], []);

      const result = await service.findAll({ page: '3', pageSize: '10' });

      expect(prisma.product.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta).toEqual({
        page: 3,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('giới hạn pageSize tối đa 50', async () => {
      mockList(0, [], []);

      const result = await service.findAll({ pageSize: '500' });

      expect(prisma.product.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ take: 50 }),
      );
      expect(result.meta.pageSize).toBe(50);
    });

    it.each([
      ['page = 0', { page: '0' }],
      ['page âm', { page: '-4' }],
      ['page không phải số', { page: 'abc' }],
    ])('quay về trang 1 khi %s', async (_label, query) => {
      mockList(0, [], []);

      const result = await service.findAll(query);

      expect(result.meta.page).toBe(1);
    });

    it('lọc theo danh mục', async () => {
      mockList(1, [sampleProduct], ['Matcha']);

      await service.findAll({ category: 'Matcha' });

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isActive: true, category: 'Matcha' },
      });
    });

    it('danh mục "Tất cả" nghĩa là không lọc', async () => {
      mockList(1, [sampleProduct], ['Matcha']);

      await service.findAll({ category: 'Tất cả' });

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('tìm kiếm không phân biệt hoa thường theo tên và mô tả', async () => {
      mockList(1, [sampleProduct], ['Matcha']);

      await service.findAll({ q: '   latte ' });

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'latte', mode: 'insensitive' } },
            { description: { contains: 'latte', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('trả về danh sách danh mục không lặp lấy từ toàn bộ menu', async () => {
      mockList(0, [], ['Cà phê', 'Matcha']);

      const result = await service.findAll({ q: 'không có' });

      expect(result.categories).toEqual(['Cà phê', 'Matcha']);
      expect(prisma.product.findMany).toHaveBeenNthCalledWith(2, {
        where: { isActive: true, category: { not: null } },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      });
    });

    it('totalPages tối thiểu là 1 khi không có kết quả', async () => {
      mockList(0, [], []);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('trả về sản phẩm khi tìm thấy', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);

      await expect(service.findOne('prod-1')).resolves.toEqual(sampleProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
    });

    it('ném NotFoundException khi không tồn tại', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});