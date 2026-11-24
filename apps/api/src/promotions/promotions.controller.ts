import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { PromotionsService } from './promotions.service';

interface AuthenticatedRequest {
  user?: { id?: string; userId?: string; sub?: string };
}

function getUserId(req: AuthenticatedRequest): string {
  const u = req.user ?? {};
  return String(u.id ?? u.userId ?? u.sub ?? '');
}

@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.promotionsService.findAllForUser(getUserId(req));
  }

  @Post('validate')
  validate(
    @Body() dto: ValidatePromotionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promotionsService.validatePromotion(
      dto.code,
      Number(dto.subtotal ?? 0),
      getUserId(req),
    );
  }

  @Post()
  create(@Body() dto: CreatePromotionDto, @Req() req: AuthenticatedRequest) {
    return this.promotionsService.createPromotion(getUserId(req), dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promotionsService.updatePromotion(getUserId(req), id, dto);
  }
}