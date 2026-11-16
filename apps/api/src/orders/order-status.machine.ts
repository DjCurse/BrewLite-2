import type { OrderStatus } from '@prisma/client';

/**
 * Máy trạng thái theo schema hiện tại:
 * PENDING (Đã đặt) -> PAID (Đang pha chế) -> COMPLETED (Sẵn sàng nhận)
 * Có thể huỷ khi PENDING hoặc PAID.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Không thể chuyển trạng thái đơn từ ${from} sang ${to}`);
  }
}