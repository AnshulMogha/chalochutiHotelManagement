import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListTableProps {
  /** `thead` / `tbody` nodes when using the built-in `<table>` wrapper. */
  children?: ReactNode;
  className?: string;
  /** Card header title (left). Ignored when `header` is provided. */
  title?: ReactNode;
  /** Secondary line under the title / count summary. */
  subtitle?: ReactNode;
  /** Right side of the default header bar. */
  toolbar?: ReactNode;
  /** Replace the default header entirely. */
  header?: ReactNode;
  /** Optional strip below the header (e.g. inbox tabs), still inside the card. */
  afterHeader?: ReactNode;
  /**
   * Pre-built table content (already includes its own `<table>`).
   * When set, `children` / `tableClassName` are ignored.
   */
  body?: ReactNode;
  /** Footer strip (typically `ListTablePagination`). */
  footer?: ReactNode;
  /** Extra classes on the inner `<table>`. */
  tableClassName?: string;
  /**
   * Fill parent height and scroll rows inside the card (sticky header via
   * `ListTableHead className="sticky top-0 z-10"`). Parent must be a flex
   * column with `min-h-0`.
   */
  scrollBody?: boolean;
}

/**
 * Shared slate list-card shell used by reports, settlement, helpdesk, etc.
 * Compose with `ListTableHead` / `ListTableTh` / body helpers — not a DataGrid.
 */
export function ListTable({
  children,
  className,
  title,
  subtitle,
  toolbar,
  header,
  afterHeader,
  body,
  footer,
  tableClassName,
  scrollBody = false,
}: ListTableProps) {
  const showDefaultHeader =
    header == null && (title != null || subtitle != null || toolbar != null);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        scrollBody && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      {header != null ? (
        <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
          {header}
        </div>
      ) : showDefaultHeader ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0">
            {title != null ? (
              typeof title === "string" || typeof title === "number" ? (
                <h2 className="text-sm font-semibold text-slate-900">
                  {title}
                </h2>
              ) : (
                title
              )
            ) : null}
            {subtitle != null ? (
              <p className="text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {toolbar != null ? <div className="shrink-0">{toolbar}</div> : null}
        </div>
      ) : null}

      {afterHeader != null ? (
        <div className={scrollBody ? "shrink-0" : undefined}>{afterHeader}</div>
      ) : null}

      {body != null ? (
        body
      ) : (
        <div
          className={cn(
            scrollBody ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto",
          )}
        >
          <table className={cn("min-w-full text-left text-sm", tableClassName)}>
            {children}
          </table>
        </div>
      )}

      {footer != null ? (
        <div className={scrollBody ? "shrink-0" : undefined}>{footer}</div>
      ) : null}
    </div>
  );
}

export function ListTableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={cn(
        "bg-slate-50 text-left text-xs font-semibold uppercase tracking-normal text-slate-500",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function ListTableTh({
  children,
  className,
  align = "left",
  sticky,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  sticky?: boolean;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-3 font-semibold",
        align === "right" && "text-right",
        align === "center" && "text-center",
        sticky && "sticky left-0 z-10 bg-slate-50",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function ListTableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tbody className={cn("divide-y divide-slate-100 bg-white", className)}>
      {children}
    </tbody>
  );
}

export function ListTableRow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("align-top hover:bg-slate-50/80", className)} {...props}>
      {children}
    </tr>
  );
}

export function ListTableTd({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-slate-700", className)} {...props}>
      {children}
    </td>
  );
}

export function ListLoadingRow({
  colSpan,
  label = "Loading…",
}: {
  colSpan: number;
  label?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-sm text-slate-500"
      >
        <Loader2
          className={cn(
            "mx-auto h-5 w-5 animate-spin text-indigo-600",
            label ? "mb-2" : null,
          )}
        />
        {label || null}
      </td>
    </tr>
  );
}

export function ListEmptyRow({
  colSpan,
  message = "No results match the current filters.",
}: {
  colSpan: number;
  message?: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-sm text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

/** Compact empty panel when the table itself is not rendered. */
export function ListEmptyState({
  message = "No results match the current filters.",
  className,
}: {
  message?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-400",
        className,
      )}
    >
      {message}
    </div>
  );
}

export interface ListTablePaginationProps {
  page: number;
  totalPages: number;
  totalElements?: number;
  /** Singular noun, e.g. "ticket" → "3 tickets". */
  noun?: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  /** When false, hide the whole footer if there is only one page. Default true. */
  alwaysShow?: boolean;
  className?: string;
  /** Override the left summary line entirely. */
  summary?: ReactNode;
}

export function formatListCount(totalElements: number, noun?: string): string {
  const count = totalElements.toLocaleString("en-IN");
  if (!noun) return count;
  return `${count} ${noun}${totalElements === 1 ? "" : "s"}`;
}

export function ListTablePagination({
  page,
  totalPages,
  totalElements,
  noun,
  loading = false,
  onPageChange,
  alwaysShow = true,
  className,
  summary,
}: ListTablePaginationProps) {
  const pages = Math.max(totalPages, 1);
  if (!alwaysShow && pages <= 1) return null;

  const left =
    summary ??
    (totalElements != null ? (
      <p className="text-xs text-slate-500">
        {formatListCount(totalElements, noun)}
        <span className="text-slate-400">
          {" "}
          · Page {page + 1} of {pages}
        </span>
      </p>
    ) : (
      <p className="text-xs text-slate-500">
        Page {page + 1} of {pages}
      </p>
    ));

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3",
        className,
      )}
    >
      {left}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 0 || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="hidden text-xs tabular-nums text-slate-600 sm:inline">
          Page {page + 1} of {pages}
        </span>
        <button
          type="button"
          disabled={page + 1 >= pages || loading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
