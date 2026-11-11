import { PrismaClient } from '@prisma/client';

<<<<<<< HEAD
const prisma = new PrismaClient();

const products = [
  { id: 1, name: 'Trà sữa trân châu', category: 'Trà sữa', price: 39000, stock: 25, imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=800&q=85', description: 'Trà thơm, sữa béo, trân châu dẻo' },
  { id: 2, name: 'Matcha Latte', category: 'Matcha', price: 45000, stock: 20, imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=85', description: 'Matcha Nhật Bản, sữa tươi dịu béo' },
  { id: 3, name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000, stock: 20, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85', description: 'Đậm vị cà phê, ngọt dịu sữa đặc' },
  { id: 4, name: 'Trà đào cam sả', category: 'Trà trái cây', price: 35000, stock: 12, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=85', description: 'Trà thanh mát, đào và cam tươi' },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }
  // Explicit IDs in the sample data require syncing PostgreSQL's SERIAL sequence.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Product"', 'id'), COALESCE((SELECT MAX(id) FROM "Product"), 1))`,
  );
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
=======
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  await prisma.product.createMany({
    data: [
      { name: 'Trà sữa trân châu', category: 'Trà sữa', price: 39000, stock: 25, imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=800&q=85', description: 'Trà thơm, sữa béo, trân châu dẻo' },
      { name: 'Matcha Latte', category: 'Matcha', price: 45000, stock: 20, imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=85', description: 'Matcha Nhật Bản, sữa tươi dịu béo' },
      { name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000, stock: 20, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85', description: 'Đậm vị cà phê, ngọt dịu sữa đặc' },
      { name: 'Trà đào cam sả', category: 'Trà trái cây', price: 35000, stock: 12, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=85', description: 'Trà thanh mát, đào và cam tươi' }
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
>>>>>>> origin/Tuan
