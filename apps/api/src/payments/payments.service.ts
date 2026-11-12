import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(idempotencyKey: string, dto: CreatePaymentDto) {
    // 1. KIỂM TRA IDEMPOTENCY-KEY: Trống thanh toán đúp
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      // Nếu đã từng có request với key này, trả về kết quả cũ ngay lập tức (Idempotent)
      return existingPayment.order;
    }

    // 2. BẮT ĐẦU TRANSACTION CƠ SỞ DỮ LIỆU
    return this.prisma.$transaction(async (tx) => {
      let subTotal = 0;

      // a. Kiểm tra tồn kho và tính tổng tiền
      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isAvailable || product.stock < item.quantity) {
          throw new BadRequestException(`Sản phẩm #${item.productId} không đủ số lượng hoặc đã hết hàng.`);
        }
        
        // Trừ tồn kho
        await tx.product.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantity },
        });

        subTotal += product.price * item.quantity;
      }

      let discountAmount = 0;
      let appliedPromotionId = null;

      // b. Xử lý Mã Khuyến Mãi (Promotion)
      if (dto.promoCode) {
        const promotion = await tx.promotion.findUnique({ where: { code: dto.promoCode } });
        if (!promotion || promotion.validUntil < new Date() || promotion.usageLimit <= 0) {
          throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        }

        discountAmount = Math.min((subTotal * promotion.discountPercent) / 100, promotion.maxDiscount);
        appliedPromotionId = promotion.id;

        // Giảm số lượt dùng của mã
        await tx.promotion.update({
          where: { id: promotion.id },
          data: { usageLimit: promotion.usageLimit - 1 },
        });
      }

      const finalTotal = subTotal - discountAmount;

      // c. Tạo Đơn hàng (Order) & OrderItem
      const order = await tx.order.create({
        data: {
          userId: dto.userId || null,
          totalAmount: finalTotal,
          status: 'PENDING',
          promotionId: appliedPromotionId,
          orderItems: {
            create: dto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: 0, // Bạn có thể lưu giá snapshot tại thời điểm mua ở đây
            })),
          },
        },
      });

      // d. Lưu trạng thái Thanh Toán (Payment) gắn với Idempotency-Key
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: finalTotal,
          method: dto.paymentMethod,
          status: 'COMPLETED', // Giả định thanh toán thành công ngay
          idempotencyKey, // Lưu lại key để block các request trùng lặp sau này
        },
      });

      // e. Tích điểm LoyaltyTransaction (nếu là user đã đăng nhập)
      if (dto.userId) {
        const pointsEarned = Math.floor(finalTotal / 10000); // 10k = 1 điểm
        if (pointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: dto.userId,
              points: pointsEarned,
              type: 'EARN',
              description: `Tích điểm đơn hàng #${order.id}`,
            },
          });
        }
      }

      return order;
    });
  }
}