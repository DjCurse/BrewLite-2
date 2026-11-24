import { assertTransition, canTransition } from './order-status.machine';

describe('Order status machine', () => {
  it('cho phép luồng chuẩn PENDING -> PAID -> COMPLETED', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'COMPLETED')).toBe(true);
  });

  it('cho phép luồng pha chế tại quầy PAID -> CONFIRMED -> PREPARING -> READY -> COMPLETED', () => {
    expect(canTransition('PAID', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'READY')).toBe(true);
    expect(canTransition('READY', 'COMPLETED')).toBe(true);
    expect(canTransition('PAID', 'PREPARING')).toBe(true);
  });

  it('chặn nhảy cóc trạng thái chưa thanh toán', () => {
    expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow();
    expect(() => assertTransition('PENDING', 'PREPARING')).toThrow();
    expect(() => assertTransition('PENDING', 'READY')).toThrow();
  });

  it('chặn đi lùi và đổi trạng thái cuối', () => {
    expect(canTransition('READY', 'PREPARING')).toBe(false);
    expect(canTransition('PREPARING', 'PAID')).toBe(false);
    expect(canTransition('COMPLETED', 'READY')).toBe(false);
    expect(canTransition('COMPLETED', 'PAID')).toBe(false);
    expect(canTransition('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
    expect(() => assertTransition('READY', 'PENDING')).toThrow();
  });

  it('cho phép hủy đơn khi chưa hoàn tất và chặn hủy khi đã hoàn tất', () => {
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('READY', 'CANCELLED')).toBe(true);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });
});