import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreatePaymentDto {
  @IsArray()
  @IsNotEmpty()
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  promoCode?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: 'CASH' | 'CARD' | 'E_WALLET';

  @IsString()
  @IsOptional()
  userId?: string; // Dành cho luồng khách đã đăng nhập để tích điểm
}