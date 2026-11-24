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


function toAuthUser(req: any): AuthUser {
  const u = req.user ?? {};
  return { id: u.id ?? u.userId ?? u.sub, role: u.role };
}


@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderTrackingController {
  constructor(private readonly service: OrderTrackingService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(toAuthUser(req).id);
  }

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