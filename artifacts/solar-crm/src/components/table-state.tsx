import { ChevronLeft, ChevronRight, FileSearch } from "lucide-react";
import type { ReactNode } from "react";

export function TableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-label="Loading row">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-6 py-4">
              <div
                className={`h-3 animate-pulse rounded bg-slate-200 ${
                  columnIndex === 0 ? "w-4/5" : columnIndex === columns - 1 ? "ml-auto w-14" : "w-3/5"
                }`}
              />
              {columnIndex === 0 && (
                <div className="mt-2 h-2.5 w-2/5 animate-pulse rounded bg-slate-100" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyTableState({
  colSpan,
  title,
  description,
  action,
}: {
  colSpan: number;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileSearch className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
          </div>
        </td>
      </tr>
    </>
  );
}

export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing <span className="font-semibold text-slate-700">{start}-{end}</span> of{" "}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="min-w-16 text-center font-medium text-slate-600">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}