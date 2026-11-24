import type { OrderStatus } from '@prisma/client';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CONFIRMED', 'CANCELLED'],
  PAID: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
  PREPARING: ['READY', 'COMPLETED', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
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