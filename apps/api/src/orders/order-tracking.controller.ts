import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AuthUser, OrderTrackingService } from './order-tracking.service';

/** Lấy user từ JWT – chỉnh lại nếu JwtStrategy của Trâm trả field khác */
function toAuthUser(req: any): AuthUser {
  const u = req.user ?? {};
  return { id: u.id ?? u.userId ?? u.sub, role: u.role };
}

// Khai báo controller này TRƯỚC OrdersController trong orders.module.ts
// để "orders/me" không bị route "orders/:id" bắt mất.
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderTrackingController {
  constructor(private readonly service: OrderTrackingService) {}

  @Get('me')
  findMine(@Req() req: any) {
    return this.service.findMine(toAuthUser(req).id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateStatus(id, dto.status, toAuthUser(req));
  }
}
