import { Body, Controller, Headers, Post, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async checkout(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu Idempotency-Key trong Header.');
    }
    
    return this.paymentsService.processPayment(idempotencyKey, createPaymentDto);
  }
}