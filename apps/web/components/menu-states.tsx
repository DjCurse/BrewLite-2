/** Các trạng thái của màn hình Menu: Loading / Empty / Error. */

export function MenuLoading({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Đang tải thực đơn…</span>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li
            key={index}
            data-testid="menu-skeleton"
            className="animate-pulse rounded-2xl border border-line bg-white p-3"
          >
            <div className="aspect-square w-full rounded-xl bg-line" />
            <div className="mt-3 h-4 w-3/4 rounded bg-line" />
            <div className="mt-2 h-3 w-full rounded bg-line" />
            <div className="mt-3 h-5 w-1/3 rounded bg-line" />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MenuEmptyProps {
  hasFilters: boolean;
  onReset: () => void;
}

export function MenuEmpty({ hasFilters, onReset }: MenuEmptyProps) {
  return (
    <div
      role="status"
      className="rounded-3xl border border-line bg-white px-6 py-14 text-center"
    >
      <p aria-hidden="true" className="text-4xl">
        🍃
      </p>
      <h2 className="mt-3 text-lg font-semibold">
        {hasFilters
          ? "Không tìm thấy món phù hợp"
          : "Thực đơn đang được cập nhật"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {hasFilters
          ? "Bạn thử chọn danh mục khác hoặc tìm với từ khóa khác nhé."
          : "Hiện chưa có món nào đang bán. Bạn quay lại sau nhé."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}

interface MenuErrorProps {
  message?: string;
  onRetry: () => void;
}

export function MenuError({ message, onRetry }: MenuErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <p aria-hidden="true" className="text-4xl">
        ⚠️
      </p>
      <h2 className="mt-3 text-lg font-semibold text-red-900">
        Không tải được thực đơn
      </h2>
      <p className="mt-1 text-sm text-red-800">
        {message ?? "Đã có lỗi xảy ra."} Vui lòng kiểm tra kết nối và thử lại.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-11 rounded-full bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        Thử lại
      </button>
    </div>
  );
}
