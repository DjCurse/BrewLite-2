import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeListProductsQuery,
  type RawListProductsQuery,
} from './dto/list-products-query';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách món đang bán, có phân trang, lọc danh mục và tìm kiếm theo tên/mô tả.
   * Trả về `{ data, categories, meta }` để giao diện dựng thanh lọc và phân trang.
   */
  async findAll(rawQuery: RawListProductsQuery = {}) {
    const { page, pageSize, category, q } =
      normalizeListProductsQuery(rawQuery);

    const where: Prisma.ProductWhereInput = { isAvailable: true };
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data, categoryRows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.findMany({
        where: { isAvailable: true },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      data,
      categories: categoryRows.map((row) => row.category),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Chi tiết một sản phẩm theo ID; ném 404 nếu không tồn tại. */
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID #${id} không tồn tại`);
    }

    return product;
  }
}
