import { jest } from '@jest/globals';
import { seedMenu } from './seed';
import { seedProducts } from './seed-data';

type AnyFn = (...args: any[]) => Promise<any>;

function makePrisma(existing: Array<{ name: string; category: string }>) {
  const findFirst = jest.fn<AnyFn>(async ({ where }) => {
    const hit = existing.findIndex(
      (p) => p.name === where.name && p.category === where.category,
    );
    return hit >= 0 ? { id: hit + 1 } : null;
  });
  return {
    product: {
      findFirst,
      create: jest.fn<AnyFn>().mockResolvedValue({}),
      update: jest.fn<AnyFn>().mockResolvedValue({}),
    },
  };
}

describe('seedMenu', () => {
  it('dữ liệu mẫu không có sản phẩm trùng (name + category)', () => {
    const keys = seedProducts.map((p) => `${p.category}::${p.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('DB trống: tạo mới toàn bộ sản phẩm', async () => {
    const prisma = makePrisma([]);

    const result = await seedMenu(prisma as never);

    expect(result).toEqual({ created: seedProducts.length, updated: 0 });
    expect(prisma.product.create).toHaveBeenCalledTimes(seedProducts.length);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('chạy lặp lại: chỉ cập nhật, không tạo trùng', async () => {
    const prisma = makePrisma(seedProducts as never);

    const result = await seedMenu(prisma as never);

    expect(result).toEqual({ created: 0, updated: seedProducts.length });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});
