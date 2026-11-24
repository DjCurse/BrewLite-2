import { jest } from '@jest/globals';
import { seedMenu, seedPromotionsData, seedUsers } from './seed';
import { seedAccounts, seedProducts, seedPromotions } from './seed-data';

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
    user: {
      upsert: jest.fn<AnyFn>().mockResolvedValue({}),
    },
    promotion: {
      upsert: jest.fn<AnyFn>().mockResolvedValue({}),
    },
  };
}

describe('seedMenu, seedUsers & seedPromotionsData', () => {
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

  it('nạp đầy đủ tài khoản STAFF, ADMIN và CUSTOMER', async () => {
    const prisma = makePrisma([]);

    const count = await seedUsers(prisma as never);

    expect(count).toBe(seedAccounts.length);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(seedAccounts.length);
  });

  it('nạp đầy đủ mã khuyến mãi công khai và mã nội bộ nhân viên', async () => {
    const prisma = makePrisma([]);

    const count = await seedPromotionsData(prisma as never);

    expect(count).toBe(seedPromotions.length);
    expect(prisma.promotion.upsert).toHaveBeenCalledTimes(seedPromotions.length);
  });
});