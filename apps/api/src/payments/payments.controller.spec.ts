import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const asyncMock = () => jest.fn<(...args: any[]) => Promise<any>>();

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const service = {
    processPayment: asyncMock(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('nên throw lỗi nếu thiếu idempotency-key', async () => {
    await expect(
      controller.checkout('', {
        userId: 'user-1',
        items: [],
        paymentMethod: PaymentMethod.MOMO,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('nên gọi service.processPayment nếu có idempotency-key', async () => {
    const mockOrder = { id: 'ord-1', status: 'PAID' };
    service.processPayment.mockResolvedValue(mockOrder);

    const dto = {
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      paymentMethod: PaymentMethod.MOMO,
    };

    const result = await controller.checkout('idem-key-001', dto);

    expect(result).toEqual(mockOrder);
    expect(service.processPayment).toHaveBeenCalledWith('idem-key-001', dto);
  });
});