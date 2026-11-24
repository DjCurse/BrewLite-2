import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedAccounts, seedProducts, seedPromotions } from './seed-data';

type MenuSeedClient = Pick<PrismaClient, 'product'>;
type UserSeedClient = Pick<PrismaClient, 'user'>;
type PromoSeedClient = Pick<PrismaClient, 'promotion'>;

export async function seedMenu(prisma: MenuSeedClient) {
  let created = 0;
  let updated = 0;

  for (const product of seedProducts) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name, category: product.category },
      select: { id: true },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
      updated += 1;
    } else {
      await prisma.product.create({ data: product });
      created += 1;
    }
  }

  return { created, updated };
}

export async function seedUsers(prisma: UserSeedClient) {
  for (const account of seedAccounts) {
    const passwordHash = await bcrypt.hash(account.plainPassword, 10);
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        passwordHash,
      },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        loyaltyPoints: account.loyaltyPoints,
      },
    });
  }
  return seedAccounts.length;
}

export async function seedPromotionsData(prisma: PromoSeedClient) {
  for (const promo of seedPromotions) {
    await prisma.promotion.upsert({
      where: { code: promo.code },
      update: {
        type: promo.type,
        value: promo.value,
        minOrderValue: promo.minOrderValue,
        startDate: promo.startDate,
        endDate: promo.endDate,
        isActive: promo.isActive,
        staffOnly: promo.staffOnly ?? false,
        maxUses: promo.maxUses ?? null,
        perUserLimit: promo.perUserLimit ?? null,
      },
      create: promo,
    });
  }
  return seedPromotions.length;
}

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  try {
    const { created, updated } = await seedMenu(prisma);
    const userCount = await seedUsers(prisma);
    const promoCount = await seedPromotionsData(prisma);
    console.log(
      `Seed hoàn tất: menu (tạo mới ${created}, cập nhật ${updated}), ${userCount} tài khoản, ${promoCount} mã khuyến mãi.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  main().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}