import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  exportStatusLabel,
  formatReportDateTime,
  formatStatusLabel,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterButton,
} from "@/features/reports/components/ReportFilterDrawer";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import { settlementService } from "../services/settlementService";
import {
  SETTLEMENT_COMPONENTS,
  type SettlementSummary,
} from "../services/settlementTypes";
import {
  SettlementFilterDrawer,
  SettlementFilterField,
  SettlementMoney,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementStatusBadge,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  RotateCcw,
} from "lucide-react";

const PAGE_SIZE = 20;

type QueueMode = "pending" | "approved" | "rejected";

type QueueFilterDraft = {
  settlementNo: string;
  supplierName: string;
  component: string;
  fromDateText: string;
  toDateText: string;
};

const DEFAULT_QUEUE_FILTERS: QueueFilterDraft = {
  settlementNo: "",
  supplierName: "",
  component: "",
  fromDateText: "",
  toDateText: "",
};

function QueueAppliedRange({ applied }: { applied: QueueFilterDraft }) {
  const range = validateOptionalDateRange(
    applied.fromDateText,
    applied.toDateText,
  );
  const from = range.ok ? range.fromDate : null;
  const to = range.ok ? range.toDate : null;
  const detail =
    [
      applied.component ? formatStatusLabel(applied.component) : null,
      applied.supplierName.trim() || null,
      applied.settlementNo.trim() || null,
    ]
      .filter(Boolean)
      .join(" · ") || (!from && !to ? "All dates" : null);

  return <ReportAppliedRange from={from} to={to} detail={detail} />;
}

function getMode(pathname: string): QueueMode {
  if (pathname.includes("/approved")) return "approved";
  if (pathname.includes("/rejected")) return "rejected";
  return "pending";
}

export default function SettlementQueuePage() {
  const location = useLocation();
  const mode = getMode(location.pathname);
  const { toast, showToast, hideToast } = useToast();

  const [applied, setApplied] = useState<QueueFilterDraft>(DEFAULT_QUEUE_FILTERS);
  const [draft, setDraft] = useState<QueueFilterDraft>(DEFAULT_QUEUE_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SettlementSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);

  const meta = useMemo(() => {
    if (mode === "approved") {
      return {
        title: "Approved Settlements",
        subtitle: "Ready for payout release",
        icon: CheckCircle2,
      };
    }
    if (mode === "rejected") {
      return {
        title: "Rejected Settlements",
        subtitle: "Historical rejections — regenerate via workbench",
        icon: RotateCcw,
      };
    }
    return {
      title: "Pending Settlements",
      subtitle: "Awaiting checker approval (maker-checker)",
      icon: ClipboardList,
    };
  }, [mode]);

  const columns = useMemo<GridColDef<SettlementSummary>[]>(() => {
    const base: GridColDef<SettlementSummary>[] = [
      {
        field: "settlementNo",
        headerName: "Settlement",
        width: 200,
        sortable: false,
        renderCell: (params) => {
          const id = params.row.settlementId || params.row.settlementNo || "";
          return (
            <Link
              to={ROUTES.SETTLEMENT.DETAIL(id)}
              className="font-mono text-xs font-semibold text-[#2f3d95] hover:underline"
            >
              {id}
            </Link>
          );
        },
      },
      {
        field: "supplierName",
        headerName: "Supplier",
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0 py-1">
            <p className="truncate font-medium text-slate-900">
              {params.row.supplierName || "—"}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {formatStatusLabel(params.row.component)}
            </p>
          </div>
        ),
      },
      {
        field: "period",
        headerName: "Period",
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <span className="text-xs text-slate-600">
            {formatSettlementPeriod(params.row.period)}
          </span>
        ),
      },
      {
        field: "payableAmount",
        headerName: "Payable",
        width: 140,
        sortable: false,
        renderCell: (params) => (
          <SettlementMoney value={params.row.payableAmount} />
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        sortable: false,
        renderCell: (params) => (
          <SettlementStatusBadge
            status={params.row.payoutStatus || params.row.status}
          />
        ),
      },
    ];
    if (mode !== "pending") {
      base.push({
        field: "meta",
        headerName: "Meta",
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <span className="text-xs text-slate-500">
            {mode === "approved" && params.row.approvedBy ? (
              <>
                {params.row.approvedBy}
                <br />
                {formatReportDateTime(params.row.approvedAt)}
              </>
            ) : mode === "rejected" ? (
              <>
                {params.row.rejectedBy || "—"}
                <br />
                {params.row.rejectionReason || "—"}
              </>
            ) : (
              "—"
            )}
          </span>
        ),
      });
    }
    base.push({
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const id = params.row.settlementId || params.row.settlementNo || "";
        return (
          <Link
            to={ROUTES.SETTLEMENT.DETAIL(id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        );
      },
    });
    return base;
  }, [mode]);

  const activeFilterCount = useMemo(
    () =>
      (applied.settlementNo.trim() ? 1 : 0) +
      (applied.supplierName.trim() ? 1 : 0) +
      (applied.component ? 1 : 0) +
      (applied.fromDateText || applied.toDateText ? 1 : 0),
    [applied],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = validateOptionalDateRange(
        applied.fromDateText,
        applied.toDateText,
      );
      if (!range.ok) {
        showToast(range.message, "error");
        setLoading(false);
        return;
      }
      const params = {
        supplierName: applied.supplierName.trim() || undefined,
        component: applied.component || undefined,
        settlementNo: applied.settlementNo.trim() || undefined,
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        page,
        size: PAGE_SIZE,
      };
      const fetcher =
        mode === "approved"
          ? settlementService.getApproved
          : mode === "rejected"
            ? settlementService.getRejected
            : settlementService.getPending;
      const response = await fetcher(params);
      setRows(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    applied,
    mode,
    page,
    showToast,
  ]);

  const openFilterDrawer = () => {
    setDraft(applied);
    setFilterOpen(true);
  };

  const applyFilterDraft = () => {
    const range = validateOptionalDateRange(
      draft.fromDateText,
      draft.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setApplied({
      settlementNo: draft.settlementNo,
      supplierName: draft.supplierName,
      component: draft.component,
      fromDateText: draft.fromDateText,
      toDateText: draft.toDateText,
    });
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_QUEUE_FILTERS);
    setApplied(DEFAULT_QUEUE_FILTERS);
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const exportQueue = async (format: ReportExportFormat) => {
    const range = validateOptionalDateRange(
      applied.fromDateText,
      applied.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }

    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await settlementService.exportQueue({
        mode,
        params: {
          supplierName: applied.supplierName.trim() || undefined,
          component: applied.component || undefined,
          settlementNo: applied.settlementNo.trim() || undefined,
          fromDate: range.fromDate || undefined,
          toDate: range.toDate || undefined,
        },
        format,
        defaultFileName: `settlements-${mode}`,
        onStatus: setExportStatus,
      });
      showToast(`${meta.title} export downloaded`, "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <SettlementPageShell
        title={meta.title}
        subtitle={meta.subtitle}
        icon={meta.icon}
        iconClassName="bg-gradient-to-br from-indigo-500 to-violet-600"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QueueAppliedRange applied={applied} />
            <ReportFilterButton
              onClick={openFilterDrawer}
              activeCount={activeFilterCount}
            />
            <ExportButton
              iconOnly
              exporting={exporting}
              exportingLabel={exportStatusLabel(exportStatus) || "Exporting…"}
              onExportExcel={() => void exportQueue("EXCEL")}
              onExportCSV={() => void exportQueue("CSV")}
              onExportPDF={() => void exportQueue("PDF")}
            />
            <SettlementRefreshButton loading={loading} onClick={() => void load()} />
          </div>
        }
      >
        <DataTable
          subtitle={
            <>
              <span className="font-medium text-slate-600">
                {formatListCount(totalElements, "settlement")}
              </span>
              <span className="text-slate-400">
                {" "}
                · Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
            </>
          }
          rows={rows}
          columns={columns}
          getRowId={(row) => row.settlementId || row.settlementNo || ""}
          loading={loading}
          paginationMode="server"
          rowCount={totalElements}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={(model) => {
            if (model.page !== page) setPage(Math.max(0, model.page));
          }}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          disableColumnFilter
          showToolbar
          showExport={false}
          allowHorizontalScroll
          getRowHeight={() => "auto"}
          localeText={{ noRowsLabel: "No settlements in this queue." }}
          sx={{
            "& .MuiDataGrid-cell": {
              alignItems: "center",
              whiteSpace: "normal",
              py: "8px",
            },
          }}
        />
      </SettlementPageShell>

      <SettlementFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilterDraft}
      >
        <SettlementFilterField label="Settlement no">
          <input
            type="text"
            value={draft.settlementNo}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, settlementNo: e.target.value }))
            }
            placeholder="e.g. STL-202608-000002"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </SettlementFilterField>
        <SettlementFilterField label="Supplier name">
          <input
            type="text"
            value={draft.supplierName}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, supplierName: e.target.value }))
            }
            placeholder="Supplier name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </SettlementFilterField>
        <SettlementFilterField label="Component">
          <select
            value={draft.component}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, component: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All components</option>
            {SETTLEMENT_COMPONENTS.map((item) => (
              <option key={item} value={item}>
                {formatStatusLabel(item)}
              </option>
            ))}
          </select>
        </SettlementFilterField>
        <ReportCustomDateFields
          fromText={draft.fromDateText}
          toText={draft.toDateText}
          onFromTextChange={(value) =>
            setDraft((prev) => ({ ...prev, fromDateText: value }))
          }
          onToTextChange={(value) =>
            setDraft((prev) => ({ ...prev, toDateText: value }))
          }
        />
      </SettlementFilterDrawer>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
