import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BadRequestException } from '@nestjs/common';

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
    await expect(controller.checkout('', { items: [], paymentMethod: 'CASH' }))
      .rejects.toThrow(BadRequestException);
  });

  it('nên gọi service.processPayment nếu có idempotency-key', async () => {
    const payload = { id: 1 };
    service.processPayment.mockResolvedValue(payload);
    const dto = { items: [{ productId: 1, quantity: 1 }], paymentMethod: 'CASH' as const };
    
    const result = await controller.checkout('test-key', dto);
    
    expect(result).toEqual(payload);
    expect(service.processPayment).toHaveBeenCalledWith('test-key', dto);
  });
});