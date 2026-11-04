import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProductsService {
  // 1. Lấy danh sách sản phẩm (có hỗ trợ lọc theo danh mục)
  async findAll(category?: string) {
    return prisma.product.findMany({
      where: category && category !== 'Tất cả' ? { category } : {},
      orderBy: { id: 'asc' },
    });
  }

  // 2. Lấy chi tiết một sản phẩm theo ID
  async findOne(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID #${id} không tồn tại`);
    }

    return product;
  }
}