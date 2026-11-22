import { BadRequestException, Injectable } from '@nestjs/common';
import { LoyaltyType, OrderStatus, PaymentStatus, PromotionType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';

const SIZE_SURCHARGE: Record<string, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

const TOPPING_SURCHARGE: Record<string, number> = {
  thach: 8000,
  'thạch': 8000,
  tran_chau: 8000,
  'trân châu': 8000,
  'trân châu đen': 8000,
  'trân châu trắng': 8000,
  pudding: 10000,
  kem_cheese: 10000,
  'kem cheese': 10000,
};

function calculateItemSurcharge(size?: string, toppings?: string[]): number {
  const normalizedSize = size?.trim().toUpperCase();
  const sizeExtra = normalizedSize ? (SIZE_SURCHARGE[normalizedSize] ?? 0) : 0;

  const validToppings = (toppings ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t !== 'none' && t !== 'không');

  const toppingsExtra = validToppings.reduce(
    (sum, key) => sum + (TOPPING_SURCHARGE[key] ?? 8000),
    0,
  );

  return sizeExtra + toppingsExtra;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(idempotencyKey: string, dto: CreatePaymentDto) {
    // 1. KIỂM TRA IDEMPOTENCY-KEY TRÊN BẢNG ORDER (Theo class-diagram.puml)
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true, payment: true },
    });

    if (existingOrder) {
      return existingOrder;
    }

    // 2. XỬ LÝ TRANSACTION (Theo sequence-checkout.puml)
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];

      // a. Kiểm tra tồn kho (stockQuantity) & tính tổng tiền (gồm Size + Topping)
      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive || product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm #${item.productId} không đủ số lượng hoặc đã ngừng bán.`,
          );
        }

        const surcharge = calculateItemSurcharge(item.size, item.toppings);
        const unitPrice = Number(product.price) + surcharge;
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
        });

        // Trừ tồn kho
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: product.stockQuantity - item.quantity },
        });
      }

      // b. Kiểm tra & áp dụng Promotion (PERCENTAGE / FIXED_AMOUNT)
      let discountAmount = 0;
      let appliedPromotionId: string | null = null;

      const normalizedPromoCode = dto.promoCode?.trim().toUpperCase();
      if (normalizedPromoCode) {
        const now = new Date();
        const promotion = await tx.promotion.findUnique({
          where: { code: normalizedPromoCode },
        });

        if (
          !promotion ||
          !promotion.isActive ||
          now < promotion.startDate ||
          now > promotion.endDate
        ) {
          throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
        }

        if (totalAmount < Number(promotion.minOrderValue)) {
          throw new BadRequestException(
            `Đơn hàng tối thiểu ${Number(promotion.minOrderValue).toLocaleString('vi-VN')}đ để áp dụng mã này.`,
          );
        }

        const promoValue = Number(promotion.value);
        discountAmount =
          promotion.type === PromotionType.PERCENTAGE
            ? Math.floor((totalAmount * promoValue) / 100)
            : promoValue;

        discountAmount = Math.min(discountAmount, totalAmount);
        appliedPromotionId = promotion.id;
      }

      const finalAmount = totalAmount - discountAmount;

      // c. Tạo Order (PAID) + OrderItems + Payment (SUCCESS)
      const order = await tx.order.create({
        data: {
          userId: dto.userId,
          promotionId: appliedPromotionId,
          totalAmount,
          discountAmount,
          finalAmount,
          status: OrderStatus.PAID,
          idempotencyKey,
          items: {
            create: orderItemsData,
          },
          payment: {
            create: {
              transactionId: `TXN-${randomUUID()}`,
              method: dto.paymentMethod,
              status: PaymentStatus.SUCCESS,
              amount: finalAmount,
              paidAt: new Date(),
            },
          },
        },
        include: {
          items: true,
          payment: true,
        },
      });

      // d. Tích lũy điểm LoyaltyTransaction & cộng điểm vào User (10.000đ = 1 điểm)
      const pointsEarned = Math.floor(finalAmount / 10000);
      if (pointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: dto.userId,
            orderId: order.id,
            points: pointsEarned,
            type: LoyaltyType.EARN,
          },
        });

        await tx.user.update({
          where: { id: dto.userId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });
      }

      return order;
    });
  }
}