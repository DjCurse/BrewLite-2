import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canTransition } from './order-status.machine';

export interface AuthUser {
  id: string;
  role?: string;
}

const STAFF_ROLES = ['ADMIN', 'STAFF', 'MANAGER'];

@Injectable()
export class OrderTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /orders – toàn bộ đơn hàng của quán (dành cho STAFF / ADMIN / MANAGER) */
  async findAll(userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isStaff = STAFF_ROLES.includes((dbUser?.role ?? '').toUpperCase());
    if (!isStaff) {
      throw new ForbiddenException(
        'Chỉ nhân viên quầy hoặc quản lý mới được xem toàn bộ đơn hàng',
      );
    }

    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        payment: true,
      },
    });
  }

  /** GET /orders/me – đơn của người dùng hiện tại, mới nhất trước */
  findMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        payment: true,
      },
    });
  }

  /** PATCH /orders/:id/status */
  async updateStatus(orderId: string, next: OrderStatus, user: AuthUser) {
    const [order, dbUser] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    ]);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    // JWT không chứa role nên tra từ bảng User
    const isStaff = STAFF_ROLES.includes((dbUser?.role ?? '').toUpperCase());
    if (!isStaff) {
      // Khách chỉ được huỷ đơn của chính mình
      if (order.userId !== user.id || next !== 'CANCELLED') {
        throw new ForbiddenException('Bạn không có quyền đổi trạng thái đơn');
      }
    }

    if (!canTransition(order.status, next)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn từ ${order.status} sang ${next}`,
      );
    }

    if (next === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }

        if (order.payment && order.payment.status === 'SUCCESS') {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: 'REFUNDED' },
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: next },
          include: { items: true, payment: true },
        });
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: next },
    });
  }
}