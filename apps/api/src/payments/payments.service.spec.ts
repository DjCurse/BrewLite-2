import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

const asyncMock = () => jest.fn<(...args: any[]) => Promise<any>>();

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: { findUnique: asyncMock() },
      $transaction: asyncMock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('trả về order cũ nếu idempotencyKey đã tồn tại', async () => {
    const existingOrder = { id: 99 };
    prisma.payment.findUnique.mockResolvedValue({ order: existingOrder });

    const result = await service.processPayment('key-123', { items: [], paymentMethod: 'CASH' });
    
    expect(result).toEqual(existingOrder);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});