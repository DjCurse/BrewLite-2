import { PrismaClient } from '@prisma/client';
import { seedProducts } from './seed-data';

type SeedClient = Pick<PrismaClient, 'product'>;

/**
 * Nạp menu mẫu. Chạy lặp lại an toàn: sản phẩm đã có (cùng name + category)
 * được cập nhật, sản phẩm chưa có được tạo mới — không bao giờ tạo trùng.
 */
export async function seedMenu(prisma: SeedClient) {
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

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  try {
    const { created, updated } = await seedMenu(prisma);
    console.log(`Seed menu xong: tạo mới ${created}, cập nhật ${updated}.`);
  } finally {
    await prisma.$disconnect();
  }
}

// Chỉ chạy khi gọi trực tiếp (`prisma db seed`), không chạy khi được import trong test.
if (process.argv[1]?.endsWith('seed.ts')) {
  main().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}