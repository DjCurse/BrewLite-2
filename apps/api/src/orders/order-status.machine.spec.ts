import { assertTransition, canTransition } from './order-status.machine';

describe('Order status machine', () => {
  it('cho phép luồng tuần tự chuẩn PENDING -> PAID -> CONFIRMED -> PREPARING -> READY -> COMPLETED', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'READY')).toBe(true);
    expect(canTransition('READY', 'COMPLETED')).toBe(true);
  });

  it('chặn nhảy cóc trạng thái', () => {
    expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow();
    expect(() => assertTransition('PENDING', 'CONFIRMED')).toThrow();
    expect(() => assertTransition('PENDING', 'PREPARING')).toThrow();
    expect(() => assertTransition('PENDING', 'READY')).toThrow();
    expect(() => assertTransition('PAID', 'PREPARING')).toThrow();
    expect(() => assertTransition('PAID', 'READY')).toThrow();
    expect(() => assertTransition('PAID', 'COMPLETED')).toThrow();
    expect(() => assertTransition('CONFIRMED', 'READY')).toThrow();
    expect(() => assertTransition('CONFIRMED', 'COMPLETED')).toThrow();
  });

  it('chặn spam trùng trạng thái hiện tại', () => {
    expect(canTransition('PENDING', 'PENDING')).toBe(false);
    expect(canTransition('PAID', 'PAID')).toBe(false);
    expect(canTransition('CONFIRMED', 'CONFIRMED')).toBe(false);
    expect(canTransition('PREPARING', 'PREPARING')).toBe(false);
    expect(canTransition('READY', 'READY')).toBe(false);
    expect(() => assertTransition('PAID', 'PAID')).toThrow();
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

  it('cho phép hủy đơn trước khi pha chế và chặn hủy khi đã pha chế/hoàn tất', () => {
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(false);
    expect(canTransition('READY', 'CANCELLED')).toBe(false);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });
});