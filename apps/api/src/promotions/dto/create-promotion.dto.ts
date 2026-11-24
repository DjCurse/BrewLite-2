import { PromotionType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsBoolean()
  staffOnly?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUses?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  perUserLimit?: number | null;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}