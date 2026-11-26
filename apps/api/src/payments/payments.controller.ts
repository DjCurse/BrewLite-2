import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async checkout(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req?: any,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Thiếu Idempotency-Key trong Header.');
    }

    const authUserId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    if (authUserId && createPaymentDto.userId && authUserId !== createPaymentDto.userId) {
      throw new ForbiddenException('Không được phép thanh toán hộ tài khoản khác.');
    }

    return this.paymentsService.processPayment(idempotencyKey, createPaymentDto);
  }
}