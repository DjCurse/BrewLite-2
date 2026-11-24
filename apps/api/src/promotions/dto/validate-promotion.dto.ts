import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ValidatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber()
  @Min(0)
  subtotal!: number;
}