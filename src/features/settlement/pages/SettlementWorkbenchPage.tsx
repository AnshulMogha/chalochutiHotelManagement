import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { appendReturnToQuery } from "@/lib/navigationReturn";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
  exportStatusLabel,
  getTodayIsoDate,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { ReportAppliedRange } from "@/features/reports/components/ReportFilterDrawer";
import type { ExportJobStatus } from "@/features/reports/services/reportExportService";
import { settlementService } from "../services/settlementService";
import {
  SETTLEMENT_COMPONENTS,
  SETTLEMENT_CYCLES,
  type SettlementComponent,
  type SettlementCycle,
  type WorkbenchRow,
} from "../services/settlementTypes";
import {
  SettlementBankBadge,
  SettlementMoney,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementReportStatCard,
  WorkbenchItemsBreakdown,
  WorkbenchReadinessBadge,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Download,
  Eye,
  IndianRupee,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const PAGE_SIZE = 20;
const WORKBENCH_DATE_OPTIONS = { disallowFuture: true } as const;

type WorkbenchQuery = {
  component: SettlementComponent;
  cycle: SettlementCycle | "";
  search: string;
  fromDateText: string;
  toDateText: string;
  eligibleOnly: boolean;
};

const DEFAULT_QUERY: WorkbenchQuery = {
  component: "HOTEL",
  cycle: "MONTHLY",
  search: "",
  fromDateText: "",
  toDateText: "",
  eligibleOnly: true,
};

function workbenchQueryFromParams(
  params: URLSearchParams,
): WorkbenchQuery | null {
  const component = params.get("component")?.trim();
  if (
    !component ||
    !(SETTLEMENT_COMPONENTS as readonly string[]).includes(component)
  ) {
    return null;
  }
  const cycle = params.get("cycle")?.trim() || "";
  return {
    component: component as SettlementComponent,
    cycle: cycle as SettlementCycle | "",
    search: params.get("search")?.trim() || "",
    fromDateText: params.get("fromDate")?.trim() || "",
    toDateText: params.get("toDate")?.trim() || "",
    eligibleOnly: params.get("eligibleOnly") !== "0",
  };
}

function buildWorkbenchSearchHref(query: WorkbenchQuery, page = 0): string {
  const params = new URLSearchParams();
  params.set("component", query.component);
  if (query.cycle) params.set("cycle", query.cycle);
  if (query.search) params.set("search", query.search);
  if (query.fromDateText) params.set("fromDate", query.fromDateText);
  if (query.toDateText) params.set("toDate", query.toDateText);
  if (!query.eligibleOnly) params.set("eligibleOnly", "0");
  if (page > 0) params.set("page", String(page));
  return `${ROUTES.SETTLEMENT.WORKBENCH}?${params.toString()}`;
}

function buildPreviewHref(
  row: WorkbenchRow,
  fallbackCycle?: string,
  returnTo?: string,
  fallbackFromDate?: string | null,
  fallbackToDate?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("supplierId", row.supplierId);
  params.set("component", String(row.component));
  const cycle = row.cycle || fallbackCycle || "";
  if (cycle) params.set("cycle", cycle);
  const fromDate = row.settlementPeriod?.from || fallbackFromDate;
  const toDate = row.settlementPeriod?.to || fallbackToDate;
  if (fromDate) {
    params.set("fromDate", fromDate);
  }
  if (toDate) {
    params.set("toDate", toDate);
  }
  if (row.existingDraft) params.set("existingDraft", "1");
  if (!row.settlementReady) params.set("settlementReady", "0");
  if (row.blockedReason) params.set("blockedReason", row.blockedReason);
  appendReturnToQuery(params, returnTo);
  return `${ROUTES.SETTLEMENT.PREVIEW}?${params.toString()}`;
}

export default function SettlementWorkbenchPage() {
  const { toast, showToast, hideToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [form, setForm] = useState<WorkbenchQuery>(() => {
    return workbenchQueryFromParams(searchParams) ?? DEFAULT_QUERY;
  });
  const [applied, setApplied] = useState<WorkbenchQuery | null>(() => {
    return workbenchQueryFromParams(searchParams);
  });

  const [page, setPage] = useState(() => {
    const pageParam = Number(searchParams.get("page") || "0");
    return Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WorkbenchRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );

  const resultsOpen = applied != null;

  const loadWorkbench = useCallback(async () => {
    if (!applied) return;
    const range = validateOptionalDateRange(
      applied.fromDateText,
      applied.toDateText,
      WORKBENCH_DATE_OPTIONS,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setLoading(true);
    try {
      const response = await settlementService.getWorkbench({
        component: applied.component,
        cycle: applied.cycle || undefined,
        search: applied.search.trim() || undefined,
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        eligibleOnly: applied.eligibleOnly,
        page,
        size: PAGE_SIZE,
        sort: "supplierName,asc",
      });
      setRows(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [applied, page, showToast]);

  useEffect(() => {
    if (!applied) return;
    void loadWorkbench();
  }, [applied, loadWorkbench]);

  const pageSummary = useMemo(() => {
    let ready = 0;
    let bankIssues = 0;
    let pendingExists = 0;
    let payableTotal = 0;
    for (const row of rows) {
      if (row.settlementReady) ready += 1;
      if (!row.bankVerified) bankIssues += 1;
      if (row.existingDraft) pendingExists += 1;
      payableTotal += row.payableAmount?.amount ?? 0;
    }
    return { ready, bankIssues, pendingExists, payableTotal };
  }, [rows]);

  const runSearch = (event?: FormEvent) => {
    event?.preventDefault();
    if (!form.component) {
      showToast("Component is required", "error");
      return;
    }
    const range = validateOptionalDateRange(
      form.fromDateText,
      form.toDateText,
      WORKBENCH_DATE_OPTIONS,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    const query: WorkbenchQuery = {
      component: form.component,
      cycle: form.cycle,
      search: form.search.trim(),
      fromDateText: form.fromDateText.trim(),
      toDateText: form.toDateText.trim(),
      eligibleOnly: form.eligibleOnly,
    };
    setPage(0);
    setApplied(query);
    setSearchParams(new URL(buildWorkbenchSearchHref(query)).searchParams, {
      replace: true,
    });
  };

  const backToSearch = () => {
    setApplied(null);
    setRows([]);
    setTotalPages(0);
    setTotalElements(0);
    setPage(0);
    setSearchParams({}, { replace: true });
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    if (applied) {
      setSearchParams(
        new URL(buildWorkbenchSearchHref(applied, nextPage)).searchParams,
        { replace: true },
      );
    }
  };

  const appliedDateRange = useMemo(() => {
    if (!applied) return null;
    return validateOptionalDateRange(
      applied.fromDateText,
      applied.toDateText,
      WORKBENCH_DATE_OPTIONS,
    );
  }, [applied]);

  const todayIso = getTodayIsoDate();

  const columns = useMemo<GridColDef<WorkbenchRow>[]>(() => {
    return [
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
                {params.row.supplierName.trim() || "—"}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {formatStatusLabel(params.row.supplierType || params.row.component)}
                {params.row.cycle
                  ? ` · ${formatStatusLabel(params.row.cycle)}`
                  : ""}
              </p>
            </div>
          </div>
        ),
      },
      {
        field: "settlementPeriod",
        headerName: "Period",
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <span className="text-xs text-slate-600">
            {formatSettlementPeriod(params.row.settlementPeriod)}
          </span>
        ),
      },
      {
        field: "totalEligibleItems",
        headerName: "Items",
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <WorkbenchItemsBreakdown
            totalEligibleItems={params.row.totalEligibleItems}
            completedItems={params.row.completedItems}
            cancellationItems={params.row.cancellationItems}
            partialCancellationItems={params.row.partialCancellationItems}
          />
        ),
      },
      {
        field: "grossAmount",
        headerName: "Gross",
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <SettlementMoney value={params.row.grossAmount} />
        ),
      },
      {
        field: "payableAmount",
        headerName: "Payable",
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <SettlementMoney
            value={params.row.payableAmount}
            className={
              params.row.settlementReady ? "text-emerald-700" : undefined
            }
          />
        ),
      },
      {
        field: "bankVerified",
        headerName: "Bank",
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <SettlementBankBadge verified={params.row.bankVerified} />
        ),
      },
      {
        field: "settlementReady",
        headerName: "Readiness",
        width: 160,
        sortable: false,
        renderCell: (params) => (
          <WorkbenchReadinessBadge
            settlementReady={params.row.settlementReady}
            existingDraft={params.row.existingDraft}
            blockedReason={params.row.blockedReason}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <div className="flex flex-wrap gap-1.5 py-1">
            <Link
              to={buildPreviewHref(
                params.row,
                applied?.cycle || undefined,
                applied
                  ? buildWorkbenchSearchHref(applied, page)
                  : undefined,
                appliedDateRange?.ok ? appliedDateRange.fromDate : null,
                appliedDateRange?.ok ? appliedDateRange.toDate : null,
              )}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#2f3d95] hover:bg-slate-50",
                params.row.totalEligibleItems <= 0 &&
                  "pointer-events-none opacity-40",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Link>
            {params.row.existingDraft ? (
              <Link
                to={ROUTES.SETTLEMENT.PENDING}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800"
              >
                View pending
              </Link>
            ) : null}
          </div>
        ),
      },
    ];
  }, [applied, appliedDateRange, page]);

  const downloadWorkbench = async () => {
    if (!applied) return;
    const range = validateOptionalDateRange(
      applied.fromDateText,
      applied.toDateText,
      WORKBENCH_DATE_OPTIONS,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await settlementService.exportWorkbench({
        params: {
          component: applied.component,
          cycle: applied.cycle || undefined,
          search: applied.search.trim() || undefined,
          fromDate: range.fromDate || undefined,
          toDate: range.toDate || undefined,
          eligibleOnly: applied.eligibleOnly,
          sort: "supplierName,asc",
        },
        format: "EXCEL",
        defaultFileName: "settlement-workbench",
        onStatus: setExportStatus,
      });
      showToast("Workbench export downloaded", "success");
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
        title="Settlement Workbench"
        subtitle={
          resultsOpen
            ? "Open preview to review bookings, then generate PENDING"
            : "Search suppliers, then preview and generate settlements"
        }
        icon={Landmark}
        iconClassName="bg-[#2f3d95]"
        actions={
          resultsOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                from={
                  appliedDateRange?.ok ? appliedDateRange.fromDate : null
                }
                to={appliedDateRange?.ok ? appliedDateRange.toDate : null}
                detail={
                  [
                    applied ? formatStatusLabel(applied.component) : null,
                    applied?.cycle ? formatStatusLabel(applied.cycle) : null,
                    applied?.search.trim() || null,
                    applied
                      ? applied.eligibleOnly
                        ? "Eligible only"
                        : "All suppliers"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              <button
                type="button"
                onClick={backToSearch}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Change search
              </button>
              <button
                type="button"
                onClick={() => void downloadWorkbench()}
                disabled={exporting || loading}
                aria-label={
                  exportStatus
                    ? exportStatusLabel(exportStatus)
                    : "Download workbench"
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
              <SettlementRefreshButton
                loading={loading}
                onClick={() => void loadWorkbench()}
              />
            </div>
          ) : undefined
        }
      >
        {!resultsOpen ? (
          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Search suppliers
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Required: component. Optional: cycle, date range, and supplier
                  name.
                </p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                Maker desk
              </span>
            </div>

            <form onSubmit={runSearch} className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Component <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.component}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        component: e.target.value as SettlementComponent,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2f3d95] focus:ring-2 focus:ring-[#2f3d95]/15"
                    required
                  >
                    {SETTLEMENT_COMPONENTS.map((item) => (
                      <option key={item} value={item}>
                        {formatStatusLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Settlement cycle
                  </label>
                  <select
                    value={form.cycle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        cycle: e.target.value as SettlementCycle | "",
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2f3d95] focus:ring-2 focus:ring-[#2f3d95]/15"
                  >
                    <option value="">All cycles</option>
                    {SETTLEMENT_CYCLES.map((item) => (
                      <option key={item} value={item}>
                        {formatStatusLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <ReportCustomDateFields
                  singleDate
                  singleLabel="From date"
                  fromText={form.fromDateText}
                  onFromTextChange={(value) =>
                    setForm((prev) => ({ ...prev, fromDateText: value }))
                  }
                  className="lg:col-span-3"
                  labelClassName="font-medium text-slate-600"
                  maxDate={todayIso}
                  inputClassName="h-10 bg-white px-3 text-slate-900 outline-none transition focus:border-[#2f3d95] focus:ring-2 focus:ring-[#2f3d95]/15"
                />

                <ReportCustomDateFields
                  singleDate
                  singleLabel="To date"
                  fromText={form.toDateText}
                  onFromTextChange={(value) =>
                    setForm((prev) => ({ ...prev, toDateText: value }))
                  }
                  className="lg:col-span-3"
                  labelClassName="font-medium text-slate-600"
                  maxDate={todayIso}
                  inputClassName="h-10 bg-white px-3 text-slate-900 outline-none transition focus:border-[#2f3d95] focus:ring-2 focus:ring-[#2f3d95]/15"
                />

                <div className="sm:col-span-2 lg:col-span-12">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Supplier name
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.search}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      placeholder="Type supplier name to narrow results"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f3d95] focus:ring-2 focus:ring-[#2f3d95]/15"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.eligibleOnly}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        eligibleOnly: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-[#2f3d95]"
                  />
                  <span>
                    <span className="font-medium text-slate-900">
                      Settlement-ready only
                    </span>
                    <span className="ml-1 text-slate-500">
                      — hide blocked / incomplete suppliers
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2f3d95] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#263578]"
                >
                  <Search className="h-4 w-4" />
                  Search suppliers
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Active search
              </span>
              <span className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-xs font-semibold text-[#2f3d95]">
                {formatStatusLabel(applied.component)}
              </span>
              {applied.cycle ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {formatStatusLabel(applied.cycle)}
                </span>
              ) : null}
              {applied.search ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  “{applied.search}”
                </span>
              ) : null}
              {appliedDateRange?.ok &&
              (appliedDateRange.fromDate || appliedDateRange.toDate) ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {appliedDateRange.fromDate
                    ? formatReportDate(appliedDateRange.fromDate)
                    : "…"}{" "}
                  –{" "}
                  {appliedDateRange.toDate
                    ? formatReportDate(appliedDateRange.toDate)
                    : "…"}
                </span>
              ) : null}
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {applied.eligibleOnly ? "Ready only" : "All suppliers"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <SettlementReportStatCard
                label="Suppliers"
                value={loading ? "…" : totalElements.toLocaleString("en-IN")}
                icon={Users}
                tone="navy"
              />
              <SettlementReportStatCard
                label="Ready on page"
                value={loading ? "…" : pageSummary.ready}
                icon={ShieldCheck}
                tone="emerald"
              />
              <SettlementReportStatCard
                label="Bank issues"
                value={loading ? "…" : pageSummary.bankIssues}
                icon={AlertTriangle}
                tone="amber"
              />
              <SettlementReportStatCard
                label="Payable on page"
                value={
                  loading
                    ? "…"
                    : formatFinanceMoney({
                        amount: pageSummary.payableTotal,
                        currency: "INR",
                      })
                }
                icon={IndianRupee}
                tone="violet"
                sub={
                  pageSummary.pendingExists
                    ? `${pageSummary.pendingExists} with pending settlement`
                    : undefined
                }
              />
            </div>

            <DataTable
              title="Workbench results"
              subtitle={
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(totalElements, "supplier")}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · Page {page + 1} of {Math.max(totalPages, 1)}
                  </span>
                </>
              }
              rows={rows}
              columns={columns}
              getRowId={(row) =>
                `${row.supplierId}-${row.component}-${row.cycle || ""}`
              }
              loading={loading}
              paginationMode="server"
              rowCount={totalElements}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => {
                if (model.page !== page) goToPage(model.page);
              }}
              pageSizeOptions={[PAGE_SIZE]}
              disableRowSelectionOnClick
              disableColumnFilter
              showToolbar
              showExport={false}
              allowHorizontalScroll
              getRowHeight={() => "auto"}
              getRowClassName={(params) =>
                params.row.settlementReady && !params.row.existingDraft
                  ? "settlement-ready-row"
                  : ""
              }
              slots={{
                noRowsOverlay: () => (
                  <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500">
                    No suppliers found.{" "}
                    <button
                      type="button"
                      onClick={backToSearch}
                      className="ml-1 font-semibold text-[#2f3d95] underline"
                    >
                      Change search
                    </button>
                  </div>
                ),
              }}
              sx={{
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                  whiteSpace: "normal",
                  py: "8px",
                },
                "& .settlement-ready-row": {
                  backgroundColor: "rgba(236, 253, 245, 0.55)",
                },
              }}
            />
          </div>
        )}
      </SettlementPageShell>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
