import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod } from '@prisma/client';
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
    const existingOrder = { id: 'ord-99', idempotencyKey: 'key-123', status: 'PAID' };
    prisma.order.findUnique.mockResolvedValue(existingOrder);

    const result = await service.processPayment('key-123', {
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: PaymentMethod.VNPAY,
    });

    expect(result).toEqual(existingOrder);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});