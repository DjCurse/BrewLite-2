import type { Prisma } from '@prisma/client';

const IMG = {
  milkTea:
    'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=800&q=85',
  matcha:
    'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=85',
  coffee:
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85',
  fruitTea:
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=85',
};

export const seedProducts: Prisma.ProductCreateManyInput[] = [
  { name: 'Trà sữa trân châu', category: 'Trà sữa', price: 39000, stockQuantity: 25, imageUrl: IMG.milkTea, description: 'Trà thơm, sữa béo, trân châu dẻo' },
  { name: 'Trà sữa matcha đậu đỏ', category: 'Trà sữa', price: 45000, stockQuantity: 18, imageUrl: IMG.milkTea, description: 'Trà sữa matcha kết hợp đậu đỏ ngọt bùi' },
  { name: 'Trà sữa khoai môn', category: 'Trà sữa', price: 42000, stockQuantity: 15, imageUrl: IMG.milkTea, description: 'Khoai môn nghiền béo thơm, vị trà nhẹ' },
  { name: 'Matcha Latte', category: 'Matcha', price: 45000, stockQuantity: 20, imageUrl: IMG.matcha, description: 'Matcha Nhật Bản, sữa tươi dịu béo' },
  { name: 'Matcha đá xay', category: 'Matcha', price: 49000, stockQuantity: 14, imageUrl: IMG.matcha, description: 'Matcha xay lạnh mịn, phủ kem tươi' },
  { name: 'Matcha cốt dừa', category: 'Matcha', price: 47000, stockQuantity: 10, imageUrl: IMG.matcha, description: 'Matcha thanh nhẹ hòa cùng cốt dừa béo' },
  { name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000, stockQuantity: 20, imageUrl: IMG.coffee, description: 'Đậm vị cà phê, ngọt dịu sữa đặc' },
  { name: 'Bạc xỉu', category: 'Cà phê', price: 32000, stockQuantity: 15, imageUrl: IMG.coffee, description: 'Sữa tươi ngọt béo hòa quyện chút cà phê thơm' },
  { name: 'Cà phê muối', category: 'Cà phê', price: 35000, stockQuantity: 12, imageUrl: IMG.coffee, description: 'Cà phê phủ lớp kem muối mặn nhẹ' },
  { name: 'Trà đào cam sả', category: 'Trà trái cây', price: 35000, stockQuantity: 12, imageUrl: IMG.fruitTea, description: 'Trà thanh mát, đào và cam tươi' },
  { name: 'Trà vải hoa hồng', category: 'Trà trái cây', price: 38000, stockQuantity: 16, imageUrl: IMG.fruitTea, description: 'Vải thiều ngọt thanh, hương hoa hồng dịu' },
  { name: 'Trà dâu tằm', category: 'Trà trái cây', price: 36000, stockQuantity: 0, imageUrl: IMG.fruitTea, description: 'Dâu tằm chua ngọt, món theo mùa (tạm hết hàng)' },
];