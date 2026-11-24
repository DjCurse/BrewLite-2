import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PromotionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const asyncMock = () => jest.fn<(...args: any[]) => Promise<any>>();

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    order: { findUnique: ReturnType<typeof asyncMock> };
    $transaction: ReturnType<typeof asyncMock>;
  };

  beforeEach(async () => {
    prisma = {
      order: { findUnique: asyncMock() },
      $transaction: asyncMock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('trả về order cũ nếu idempotencyKey đã tồn tại (chống thanh toán đúp)', async () => {
    const existingOrder = {
      id: 'ord-99',
      idempotencyKey: 'key-123',
      status: 'PAID',
    };
    prisma.order.findUnique.mockResolvedValue(existingOrder);

    const result = await service.processPayment('key-123', {
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.VNPAY,
    });

    expect(result).toEqual(existingOrder);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('chặn tài khoản CUSTOMER sử dụng mã khuyến mãi riêng của nhân viên (staffOnly)', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = {
      product: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'prod-1',
          price: 40000,
          stockQuantity: 10,
          isActive: true,
        }),
        update: asyncMock(),
      },
      promotion: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'promo-staff',
          code: 'STAFF20',
          type: PromotionType.PERCENTAGE,
          value: 20,
          minOrderValue: 0,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          isActive: true,
          staffOnly: true,
          maxUses: 5,
          usedCount: 0,
          perUserLimit: null,
        }),
        update: asyncMock(),
      },
      user: {
        findUnique: asyncMock().mockResolvedValue({ role: 'CUSTOMER' }),
        update: asyncMock(),
      },
      order: { count: asyncMock(), create: asyncMock() },
      loyaltyTransaction: { create: asyncMock() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      service.processPayment('key-staff-block', {
        userId: 'cust-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        promoCode: 'STAFF20',
        paymentMethod: PaymentMethod.MOMO,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('trừ lượt dùng khuyến mãi và tự động khóa mã khi dùng hết lượt cuối', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = {
      product: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'prod-1',
          price: 50000,
          stockQuantity: 10,
          isActive: true,
        }),
        update: asyncMock(),
      },
      promotion: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'promo-staff',
          code: 'STAFF20',
          type: PromotionType.PERCENTAGE,
          value: 20,
          minOrderValue: 0,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          isActive: true,
          staffOnly: true,
          maxUses: 3,
          usedCount: 2,
          perUserLimit: null,
        }),
        update: asyncMock().mockResolvedValue({}),
      },
      user: {
        findUnique: asyncMock().mockResolvedValue({ role: 'STAFF' }),
        update: asyncMock(),
      },
      order: {
        count: asyncMock().mockResolvedValue(0),
        create: asyncMock().mockResolvedValue({
          id: 'ord-pos-1',
          finalAmount: 40000,
          status: 'PAID',
        }),
      },
      loyaltyTransaction: { create: asyncMock() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const order = await service.processPayment('key-staff-ok', {
      userId: 'staff-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      promoCode: 'STAFF20',
      paymentMethod: PaymentMethod.CASH,
    });

    expect(order.id).toBe('ord-pos-1');
    expect(tx.promotion.update).toHaveBeenCalledWith({
      where: { id: 'promo-staff' },
      data: {
        usedCount: { increment: 1 },
        isActive: false,
      },
    });
  });

  it('báo lỗi khi mã khuyến mãi đã hết lượt sử dụng', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = {
      product: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'prod-1',
          price: 50000,
          stockQuantity: 10,
          isActive: true,
        }),
        update: asyncMock(),
      },
      promotion: {
        findUnique: asyncMock().mockResolvedValue({
          id: 'promo-used',
          code: 'STAFF20',
          type: PromotionType.PERCENTAGE,
          value: 20,
          minOrderValue: 0,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          isActive: true,
          staffOnly: true,
          maxUses: 3,
          usedCount: 3,
          perUserLimit: null,
        }),
        update: asyncMock(),
      },
      user: {
        findUnique: asyncMock().mockResolvedValue({ role: 'STAFF' }),
        update: asyncMock(),
      },
      order: { count: asyncMock(), create: asyncMock() },
      loyaltyTransaction: { create: asyncMock() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      service.processPayment('key-exhausted', {
        userId: 'staff-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        promoCode: 'STAFF20',
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});