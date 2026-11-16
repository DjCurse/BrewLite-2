import { assertTransition, canTransition } from './order-status.machine';

describe('Order status machine', () => {
  it('cho phép luồng chuẩn PENDING -> PAID -> COMPLETED', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'COMPLETED')).toBe(true);
  });

  it('chặn nhảy cóc trạng thái', () => {
    expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow();
  });

  it('chặn đi lùi và đổi trạng thái cuối', () => {
    expect(canTransition('COMPLETED', 'PAID')).toBe(false);
    expect(canTransition('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
  });
});