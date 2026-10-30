import type { ReactNode } from "react";
import { DataGrid, type DataGridProps } from "@mui/x-data-grid";
import { Box, type SxProps, type Theme } from "@mui/material";
import { cn } from "@/lib/utils";
import { DataTableToolbar } from "./DataTableToolbar";

/** Brand accent used for focus/hover (matches app navy). */
export const DATA_TABLE_ACCENT = "#2f3d95";
export const DATA_TABLE_ROW_HEIGHT = 48;
export const DATA_TABLE_HEADER_HEIGHT = 44;
export const DATA_TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface DataTableProps extends Omit<DataGridProps, "sx"> {
  className?: string;
  /** Optional card title above the grid. */
  title?: ReactNode;
  /** Subtitle under title — e.g. "141 users · Page 1 of 8". */
  subtitle?: ReactNode;
  /** Right side of card header. */
  headerActions?: ReactNode;
  afterHeader?: ReactNode;
  /** Columns / Density / Export toolbar. Default true. */
  showToolbar?: boolean;
  showExport?: boolean;
  exportFileName?: string;
  /** Fill parent height; body scrolls. */
  fillContainer?: boolean;
  allowHorizontalScroll?: boolean;
  /** Compact rows (default true). */
  dense?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Canonical app data table — slate header, soft borders, dense rows.
 * Features: sort, resize, column menu, density, pagination, fill scroll.
 */
const defaultSx = {
  border: "none",
  borderRadius: 0,
  fontFamily: "inherit",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f8fafc !important",
    borderBottom: "1px solid #f1f5f9",
    minHeight: `${DATA_TABLE_HEADER_HEIGHT}px !important`,
    maxHeight: `${DATA_TABLE_HEADER_HEIGHT}px !important`,
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 600,
      fontSize: "0.6875rem",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "#64748b !important",
    },
  },
  "& .MuiDataGrid-columnHeader": {
    padding: "8px 12px",
    backgroundColor: "#f8fafc !important",
    color: "#64748b !important",
    display: "flex",
    alignItems: "center",
    "&:focus, &:focus-within": { outline: "none" },
    "& .MuiDataGrid-iconButtonContainer": {
      opacity: "1 !important",
      visibility: "visible !important",
      width: "auto",
    },
    "& .MuiDataGrid-sortIcon": {
      color: "#94a3b8 !important",
      opacity: 1,
      fontSize: "0.95rem",
    },
    "&.MuiDataGrid-columnHeader--sorted .MuiDataGrid-sortIcon": {
      color: `${DATA_TABLE_ACCENT} !important`,
    },
    "& .MuiDataGrid-menuIcon": {
      opacity: "1 !important",
      visibility: "visible !important",
      color: "#94a3b8 !important",
    },
    "& .MuiDataGrid-columnSeparator": {
      color: "#e2e8f0",
      "&:hover": { color: DATA_TABLE_ACCENT },
    },
    "& .MuiDataGrid-columnSeparator--resizable": {
      cursor: "col-resize",
    },
  },
  "& .MuiDataGrid-row": {
    "&:hover": {
      backgroundColor: "#f8fafc",
    },
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f8fafc",
    padding: "8px 12px",
    fontSize: "0.8125rem",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    // MUI sets line-height to the row height so plain text centers.
    // That also stretches chip backgrounds to the full row.
    lineHeight: "1.25 !important",
    "&:focus, &:focus-within": { outline: "none" },
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #f1f5f9",
    backgroundColor: "#ffffff",
    minHeight: 48,
  },
  "& .MuiDataGrid-toolbarContainer": {
    padding: "4px 8px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #f1f5f9",
    "& .MuiButton-root": {
      textTransform: "none",
      color: "#475569",
      fontSize: "0.75rem",
      fontWeight: 600,
    },
  },
  "& .MuiTablePagination-root": {
    color: "#64748b",
    fontSize: "0.8125rem",
  },
  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
    fontSize: "0.8125rem",
    fontWeight: 500,
  },
};

/** One-level merge so page overrides don't wipe base cell/header rules. */
function mergeGridSx(
  base: Record<string, unknown>,
  extra?: SxProps<Theme>,
): SxProps<Theme> {
  if (extra == null) return base as SxProps<Theme>;
  if (Array.isArray(extra) || typeof extra === "function") {
    return [base as SxProps<Theme>, extra];
  }
  const override = extra as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    if (
      value &&
      current &&
      typeof value === "object" &&
      typeof current === "object" &&
      !Array.isArray(value) &&
      !Array.isArray(current)
    ) {
      merged[key] = {
        ...(current as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
    } else {
      merged[key] = value;
    }
  }
  return merged as SxProps<Theme>;
}

const fillContainerSx = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  "& .MuiDataGrid-root": {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    border: "none",
  },
  "& .MuiDataGrid-toolbarContainer": {
    flexShrink: 0,
  },
  "& .MuiDataGrid-columnHeaders": {
    flexShrink: 0,
  },
  "& .MuiDataGrid-main": {
    flex: "1 1 auto",
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
  },
  "& .MuiDataGrid-virtualScroller": {
    minHeight: 0,
  },
  "& .MuiDataGrid-footerContainer": {
    flexShrink: 0,
    position: "sticky",
    bottom: 0,
    zIndex: 2,
    backgroundColor: "#ffffff",
  },
};

/**
 * Canonical app data table — slate UI + full DataGrid features.
 */
export function DataTable({
  className = "",
  title,
  subtitle,
  headerActions,
  afterHeader,
  showToolbar = true,
  showExport = true,
  exportFileName,
  fillContainer = false,
  allowHorizontalScroll = false,
  dense = true,
  sx,
  slots,
  slotProps,
  rowHeight,
  columnHeaderHeight,
  pageSizeOptions,
  disableColumnResize,
  disableColumnMenu,
  ...props
}: DataTableProps) {
  const showChrome =
    title != null || subtitle != null || headerActions != null;

  const defaultSlots = showToolbar
    ? { toolbar: DataTableToolbar, ...slots }
    : slots;

  const defaultSlotProps = showToolbar
    ? {
        toolbar: {
          showExport,
          showQuickFilter: false,
          csvOptions: {
            fileName:
              exportFileName ||
              `export-${new Date().toISOString().split("T")[0]}`,
            delimiter: ",",
            utf8WithBom: true,
          },
          printOptions: { disableToolbarButton: false },
          ...slotProps?.toolbar,
        },
        ...slotProps,
      }
    : slotProps;

  const grid = (
    <Box
      sx={{
        width: "100%",
        height: fillContainer ? "100%" : "auto",
        overflow: allowHorizontalScroll ? "auto" : "hidden",
        display: fillContainer ? "flex" : "block",
        flexDirection: fillContainer ? "column" : undefined,
        minHeight: fillContainer ? 0 : undefined,
        flex: fillContainer ? 1 : undefined,
      }}
      className={cn(!showChrome && "bg-white", className)}
    >
      <DataGrid
        {...props}
        autoHeight={!fillContainer}
        rowHeight={rowHeight ?? (dense ? DATA_TABLE_ROW_HEIGHT : undefined)}
        columnHeaderHeight={columnHeaderHeight ?? DATA_TABLE_HEADER_HEIGHT}
        pageSizeOptions={pageSizeOptions ?? [...DATA_TABLE_PAGE_SIZE_OPTIONS]}
        disableColumnResize={disableColumnResize ?? false}
        disableColumnMenu={disableColumnMenu ?? false}
        slots={defaultSlots}
        slotProps={defaultSlotProps}
        sx={mergeGridSx(
          mergeGridSx(
            mergeGridSx(
              defaultSx,
              fillContainer ? fillContainerSx : undefined,
            ),
            allowHorizontalScroll
              ? {
                  "& .MuiDataGrid-main": { overflow: "hidden" },
                  "& .MuiDataGrid-virtualScroller": {
                    overflowX: "auto !important",
                  },
                }
              : undefined,
          ),
          sx,
        )}
      />
    </Box>
  );

  if (!showChrome && afterHeader == null) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm",
          fillContainer && "flex min-h-0 flex-1 flex-col",
        )}
      >
        {grid}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        fillContainer && "flex min-h-0 flex-1 flex-col",
      )}
    >
      {showChrome ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0">
            {title != null ? (
              typeof title === "string" || typeof title === "number" ? (
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              ) : (
                title
              )
            ) : null}
            {subtitle != null ? (
              typeof subtitle === "string" || typeof subtitle === "number" ? (
                <p className="text-xs text-slate-500">{subtitle}</p>
              ) : (
                <div className="text-xs text-slate-500">{subtitle}</div>
              )
            ) : null}
          </div>
          {headerActions != null ? (
            <div className="flex flex-wrap items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      ) : null}
      {afterHeader}
      <div className={cn(fillContainer && "flex min-h-0 flex-1 flex-col")}>
        {grid}
      </div>
    </div>
  );
}
