import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canApproveSupplierSettlement } from "@/constants/roles";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatStatusLabel,
  exportStatusLabel,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterButton,
} from "@/features/reports/components/ReportFilterDrawer";
import type { ExportJobStatus } from "@/features/reports/services/reportExportService";
import { settlementService } from "../services/settlementService";
import {
  SETTLEMENT_COMPONENTS,
  type SettlementMisRow,
} from "../services/settlementTypes";
import {
  SettlementFilterDrawer,
  SettlementFilterField,
  SettlementMoney,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementReportStatCard,
  SettlementStatusBadge,
  SettlementActionConfirmDialog,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  BarChart3,
  Building2,
  Clock,
  Download,
  IndianRupee,
  Loader2,
  RotateCcw,
  Wallet,
} from "lucide-react";

const PAGE_SIZE = 20;

const MIS_PAYOUT_STATUSES = [
  "PAID",
  "PENDING",
  "APPROVED",
  "PAYMENT_QUEUED",
  "PAYMENT_PROCESSING",
  "FAILED",
  "REVERSED",
  "REJECTED",
] as const;

type MisFilterDraft = {
  fromDateText: string;
  toDateText: string;
  component: string;
  supplierName: string;
  settlementNo: string;
  payoutStatus: string;
};

const DEFAULT_MIS_FILTERS: MisFilterDraft = {
  fromDateText: "",
  toDateText: "",
  component: "",
  supplierName: "",
  settlementNo: "",
  payoutStatus: "",
};

export default function SettlementMisPage() {
  const { user } = useAuth();
  const canRetry = canApproveSupplierSettlement(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [applied, setApplied] = useState<MisFilterDraft>(DEFAULT_MIS_FILTERS);
  const [draft, setDraft] = useState<MisFilterDraft>(DEFAULT_MIS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retryingNo, setRetryingNo] = useState<string | null>(null);
  const [retryConfirmNo, setRetryConfirmNo] = useState<string | null>(null);
  const [rows, setRows] = useState<SettlementMisRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [visibleFrom, setVisibleFrom] = useState<string | null>(null);
  const [visibleTo, setVisibleTo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [summary, setSummary] = useState({
    totalPayable: null as { amount: number; currency: string } | null,
    totalSettlements: 0,
    paid: null as { amount: number; currency: string } | null,
    pending: null as { amount: number; currency: string } | null,
  });
  const activeFilterCount = useMemo(
    () =>
      (applied.fromDateText || applied.toDateText ? 1 : 0) +
      (applied.component ? 1 : 0) +
      (applied.supplierName.trim() ? 1 : 0) +
      (applied.settlementNo.trim() ? 1 : 0) +
      (applied.payoutStatus ? 1 : 0),
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
      const response = await settlementService.getMis({
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        component: applied.component || undefined,
        supplierName: applied.supplierName.trim() || undefined,
        settlementNo: applied.settlementNo.trim() || undefined,
        payoutStatus: applied.payoutStatus || undefined,
        page,
        size: PAGE_SIZE,
      });
      setRows(response.data.settlements);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setSummary(response.data.summary);
      setVisibleFrom(response.data.fromDate || range.fromDate || null);
      setVisibleTo(response.data.toDate || range.toDate || null);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied, page, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const retryPayment = async (settlementNo: string) => {
    setRetryingNo(settlementNo);
    try {
      await settlementService.retryPayment(settlementNo);
      showToast("Payment retry queued", "success");
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setRetryingNo(null);
    }
  };

  const columns = useMemo<GridColDef<SettlementMisRow>[]>(() => {
    const base: GridColDef<SettlementMisRow>[] = [
      {
        field: "settlementNo",
        headerName: "Settlement",
        width: 190,
        sortable: false,
        renderCell: (params) => (
          <Link
            to={ROUTES.SETTLEMENT.DETAIL(params.row.settlementNo)}
            className="font-mono text-xs font-semibold text-indigo-700 hover:underline"
          >
            {params.row.settlementNo}
          </Link>
        ),
      },
      {
        field: "supplierName",
        headerName: "Supplier",
        flex: 1,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => (
          <div className="flex items-center gap-2 py-1">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {params.row.supplierName}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {[params.row.supplierType, params.row.component]
                  .filter(Boolean)
                  .map((value) => formatStatusLabel(value))
                  .filter((value, index, list) => list.indexOf(value) === index)
                  .join(" · ")}
              </p>
            </div>
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
        field: "gross",
        headerName: "Gross",
        width: 130,
        sortable: false,
        renderCell: (params) => <SettlementMoney value={params.row.gross} />,
      },
      {
        field: "payable",
        headerName: "Payable",
        width: 130,
        sortable: false,
        renderCell: (params) => <SettlementMoney value={params.row.payable} />,
      },
      {
        field: "payoutStatus",
        headerName: "Payout",
        width: 170,
        sortable: false,
        renderCell: (params) => {
          const payoutStatus = params.row.payoutStatus || params.row.status;
          return (
            <div className="space-y-1 py-1">
              <SettlementStatusBadge status={payoutStatus} />
              {params.row.status &&
              params.row.payoutStatus &&
              params.row.status !== params.row.payoutStatus ? (
                <p className="text-[10px] text-slate-500">
                  Settlement: {formatStatusLabel(params.row.status)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        field: "utr",
        headerName: "UTR",
        width: 160,
        sortable: false,
        renderCell: (params) => (
          <span className="font-mono text-xs text-slate-600">
            {params.row.utr || "—"}
          </span>
        ),
      },
    ];
    if (canRetry) {
      base.push({
        field: "action",
        headerName: "Action",
        width: 110,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const payoutStatus = params.row.payoutStatus || params.row.status;
          const isFailed =
            String(payoutStatus || "").toUpperCase() === "FAILED" ||
            String(params.row.status || "").toUpperCase() === "FAILED";
          if (!isFailed) {
            return <span className="text-xs text-slate-300">—</span>;
          }
          return (
            <button
              type="button"
              disabled={retryingNo === params.row.settlementNo}
              onClick={() => setRetryConfirmNo(params.row.settlementNo)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {retryingNo === params.row.settlementNo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Retry
            </button>
          );
        },
      });
    }
    return base;
  }, [canRetry, retryingNo]);

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
      fromDateText: draft.fromDateText,
      toDateText: draft.toDateText,
      component: draft.component,
      supplierName: draft.supplierName,
      settlementNo: draft.settlementNo,
      payoutStatus: draft.payoutStatus,
    });
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_MIS_FILTERS);
    setApplied(DEFAULT_MIS_FILTERS);
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const downloadMis = async () => {
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
      await settlementService.exportMis({
        params: {
          fromDate: range.fromDate || undefined,
          toDate: range.toDate || undefined,
          component: applied.component || undefined,
          supplierName: applied.supplierName.trim() || undefined,
          settlementNo: applied.settlementNo.trim() || undefined,
          payoutStatus: applied.payoutStatus || undefined,
        },
        format: "EXCEL",
        defaultFileName: "settlement-mis",
        onStatus: setExportStatus,
      });
      showToast("Settlement MIS downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  return (
    <>
      <SettlementPageShell
        title="Settlement MIS"
        subtitle="Finance dashboard — payable, paid, and settlement KPIs"
        icon={BarChart3}
        iconClassName="bg-gradient-to-br from-indigo-500 to-violet-600"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportAppliedRange
              from={visibleFrom}
              to={visibleTo}
              detail={
                [
                  applied.component
                    ? formatStatusLabel(applied.component)
                    : null,
                  applied.payoutStatus
                    ? formatStatusLabel(applied.payoutStatus)
                    : null,
                  applied.supplierName.trim() || null,
                  applied.settlementNo.trim() || null,
                ]
                  .filter(Boolean)
                  .join(" · ") ||
                (!visibleFrom && !visibleTo ? "All dates" : null)
              }
            />
            <ReportFilterButton
              onClick={openFilterDrawer}
              activeCount={activeFilterCount}
            />
            <button
              type="button"
              onClick={() => void downloadMis()}
              disabled={exporting || loading}
              aria-label={
                exportStatus
                  ? exportStatusLabel(exportStatus)
                  : "Download Settlement MIS"
              }
              title={
                exportStatus
                  ? exportStatusLabel(exportStatus)
                  : "Download Excel"
              }
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            <SettlementRefreshButton loading={loading} onClick={() => void load()} />
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SettlementReportStatCard
            label="Total payable"
            value={
              loading ? "…" : formatFinanceMoney(summary.totalPayable)
            }
            icon={IndianRupee}
            tone="navy"
          />
          <SettlementReportStatCard
            label="Settlements"
            value={
              loading ? "…" : summary.totalSettlements.toLocaleString("en-IN")
            }
            icon={BarChart3}
            tone="sky"
          />
          <SettlementReportStatCard
            label="Paid"
            value={loading ? "…" : formatFinanceMoney(summary.paid)}
            icon={Wallet}
            tone="emerald"
          />
          <SettlementReportStatCard
            label="Pending"
            value={loading ? "…" : formatFinanceMoney(summary.pending)}
            icon={Clock}
            tone="amber"
          />
        </div>

        <DataTable
          title="Settlement records"
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
          getRowId={(row) => row.settlementNo}
          loading={loading}
          paginationMode="server"
          rowCount={totalElements}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={(model) => {
            if (model.page !== page) setPage(model.page);
          }}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          disableColumnFilter
          showToolbar
          showExport={false}
          allowHorizontalScroll
          getRowHeight={() => "auto"}
          localeText={{
            noRowsLabel: "No settlement records for selected filters.",
          }}
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
        <SettlementFilterField label="Payout status">
          <select
            value={draft.payoutStatus}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, payoutStatus: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {MIS_PAYOUT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
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
      </SettlementFilterDrawer>

      <SettlementActionConfirmDialog
        open={!!retryConfirmNo}
        action="retry"
        settlementNo={retryConfirmNo}
        busy={!!retryConfirmNo && retryingNo === retryConfirmNo}
        onClose={() => setRetryConfirmNo(null)}
        onConfirm={() => {
          if (!retryConfirmNo) return;
          void retryPayment(retryConfirmNo).finally(() =>
            setRetryConfirmNo(null),
          );
        }}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
