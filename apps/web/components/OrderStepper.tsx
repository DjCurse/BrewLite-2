export type OrderStatus = 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';

const STEPS = [
  { label: 'Đã đặt', hint: 'Đơn đã được ghi nhận' },
  { label: 'Đang pha chế', hint: 'Barista đang làm đồ uống' },
  { label: 'Sẵn sàng nhận', hint: 'Mời bạn ra quầy nhận' },
];

/**
 * Ánh xạ trạng thái trong DB sang bước của Stepper:
 * PENDING -> 0 (Đã đặt), PAID -> 1 (Đang pha chế), COMPLETED -> 3 (xong cả 3 bước)
 * CANCELLED -> -1 (hiện banner huỷ)
 */
export function stepIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'PAID':
      return 1;
    case 'COMPLETED':
      return 3;
    default:
      return -1;
  }
}

export default function OrderStepper({ status }: { status: OrderStatus }) {
  const current = stepIndex(status);

  if (current === -1) {
    return (
      <div
        data-testid="order-stepper-cancelled"
        className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        Đơn hàng đã bị huỷ
      </div>
    );
  }

  return (
    <ol data-testid="order-stepper" data-status={status} className="flex items-start">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : done || active ? 'bg-emerald-700' : 'bg-stone-300'}`} />
              <div
                data-testid={`step-${i}`}
                data-state={done ? 'done' : active ? 'active' : 'todo'}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  done
                    ? 'bg-emerald-700 text-white'
                    : active
                      ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                      : 'bg-stone-200 text-stone-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <div className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? 'invisible' : done ? 'bg-emerald-700' : 'bg-stone-300'}`} />
            </div>
            <p className={`mt-2 text-sm ${active ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>{s.label}</p>
            <p className="px-1 text-xs text-stone-500">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
