interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buttonClass =
    "min-h-11 min-w-24 rounded-full border border-line bg-white px-4 text-sm font-medium transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

  return (
    <nav
      aria-label="Phân trang thực đơn"
      className="mt-8 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Trước
      </button>
      <span className="text-sm text-muted" aria-current="page">
        Trang {page} / {totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Sau →
      </button>
    </nav>
  );
}
