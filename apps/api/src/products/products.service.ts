import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeListProductsQuery,
  type RawListProductsQuery,
} from './dto/list-products-query';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeProduct(product: Product) {
    return {
      ...product,
      price: Number(product.price),
    };
  }

  /**
   * Danh sách món đang bán, có phân trang, lọc danh mục và tìm kiếm theo tên/mô tả.
   */
  async findAll(rawQuery: RawListProductsQuery = {}) {
    const { page, pageSize, category, q } =
      normalizeListProductsQuery(rawQuery);

    const where: Prisma.ProductWhereInput = { isActive: true };
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows, categoryRows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.findMany({
        where: { isActive: true, category: { not: null } },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      data: rows.map((row) => this.serializeProduct(row)),
      categories: categoryRows
        .map((row) => row.category)
        .filter((cat): cat is string => Boolean(cat)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Chi tiết một sản phẩm theo ID; ném 404 nếu không tồn tại. */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID #${id} không tồn tại`);
    }

    return this.serializeProduct(product);
  }
}