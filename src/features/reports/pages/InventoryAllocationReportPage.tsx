import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  allocationStatusTone,
  exportStatusLabel,
  formatReportDate,
  formatStatusLabel,
  ReportPageHeader,
  SummaryCard,
} from "../components/reportUiHelpers";
import {
  inventoryAllocationReportService,
  type InventoryAllocationDatePreset,
  type InventoryAllocationReportResponse,
} from "../services/inventoryAllocationReportService";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "../services/reportExportService";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  Package,
  X,
} from "lucide-react";

const DEFAULT_DATE_PRESET: InventoryAllocationDatePreset = "LAST_30_DAYS";

const DATE_PRESET_OPTIONS: {
  value: InventoryAllocationDatePreset;
  label: string;
}[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_15_DAYS", label: "Last 15 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "CUSTOM", label: "Custom" },
];

const EXPORT_FORMATS: { value: ReportExportFormat; label: string }[] = [
  { value: "EXCEL", label: "Excel (.xlsx)" },
  { value: "CSV", label: "CSV (.csv)" },
  { value: "PDF", label: "PDF (.pdf)" },
];

type FilterDraft = {
  datePreset: InventoryAllocationDatePreset;
  fromDate: string;
  toDate: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
};

export default function InventoryAllocationReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<InventoryAllocationDatePreset>(DEFAULT_DATE_PRESET);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] =
    useState<InventoryAllocationReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const customRangeInvalid =
    datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0);

  const loadReport = useCallback(
    async (overrides?: Partial<FilterDraft>) => {
      if (!hotelId) return;
      const nextPreset = overrides?.datePreset ?? datePreset;
      const nextFrom = overrides?.fromDate ?? fromDate;
      const nextTo = overrides?.toDate ?? toDate;
      if (nextPreset === "CUSTOM" && (!nextFrom || !nextTo)) return;

      setLoading(true);
      setError(null);
      try {
        const data = await inventoryAllocationReportService.getReport({
          propertyIds: [hotelId],
          datePreset: nextPreset,
          fromDate: nextPreset === "CUSTOM" ? nextFrom : undefined,
          toDate: nextPreset === "CUSTOM" ? nextTo : undefined,
          page,
          size: pageSize,
        });
        setReport(data);
      } catch (err) {
        console.error(err);
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Failed to load inventory allocation report";
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [hotelId, datePreset, fromDate, toDate, page, pageSize, showToast],
  );

  useEffect(() => {
    if (!hotelId || customRangeInvalid) return;
    loadReport();
  }, [hotelId, page, loadReport, customRangeInvalid]);

  const openFilters = () => {
    setDraft({ datePreset, fromDate, toDate });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    if (draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate)) {
      showToast("Select both from and to dates", "error");
      return;
    }
    setDatePreset(draft.datePreset);
    setFromDate(draft.fromDate);
    setToDate(draft.toDate);
    setPage(0);
    setFilterOpen(false);
    loadReport(draft);
  };

  const clearAll = () => {
    setDraft(DEFAULT_DRAFT);
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!hotelId || customRangeInvalid) return;
    setExportMenuOpen(false);
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await inventoryAllocationReportService.exportReport({
        params: {
          propertyIds: [hotelId],
          datePreset,
          fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
          toDate: datePreset === "CUSTOM" ? toDate : undefined,
        },
        format,
        defaultFileName: `inventory-allocation-${report?.dateRange.fromDate || "report"}`,
        onStatus: setExportStatus,
      });
      showToast("Report downloaded", "success");
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Export failed";
      showToast(message, "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Inventory Allocation Report
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a hotel from the top bar to view inventory allocation.
        </p>
        <div className="mt-8 flex min-h-70 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <Building2 className="h-10 w-10 text-slate-300" />
        </div>
      </div>
    );
  }

  const summary = report?.summary;
  const totalPages = report?.page.totalPages ?? 0;
  const presetLabel =
    DATE_PRESET_OPTIONS.find((o) => o.value === datePreset)?.label ?? datePreset;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-violet-50/20">
        <div className="container mx-auto px-4 py-4">
          <ReportPageHeader
            icon={Package}
            iconClassName="bg-linear-to-br from-violet-600 to-indigo-500"
            borderClassName="border-violet-100"
            title="Inventory Allocation Report"
            description="Daily allocation, sold inventory, remaining rooms, and demand status."
            actions={
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  disabled={exporting || loading || customRangeInvalid}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-60 sm:text-sm"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {exporting
                    ? exportStatusLabel(exportStatus) || "Exporting…"
                    : "Download Report"}
                  <ChevronDown className="h-3.5 w-3.5 text-violet-500" />
                </button>
                {exportMenuOpen && !exporting ? (
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {EXPORT_FORMATS.map((format) => (
                      <button
                        key={format.value}
                        type="button"
                        onClick={() => handleExport(format.value)}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            }
          />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {presetLabel}
                {report?.dateRange.fromDate ? (
                  <span className="font-normal text-slate-500">
                    {" "}
                    ({formatReportDate(report.dateRange.fromDate)} –{" "}
                    {formatReportDate(report.dateRange.toDate)})
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Daily allocation for selected period
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={openFilters}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  activeFilterCount
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount ? (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              {report?.dateRange.fromDate ? (
                <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatReportDate(report.dateRange.fromDate)} –{" "}
                  {formatReportDate(report.dateRange.toDate)}
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              <SummaryCard label="Total rooms" value={summary.totalRooms} />
              <SummaryCard label="Allocated" value={summary.allocatedRooms} />
              <SummaryCard label="Sold" value={summary.soldRooms} />
              <SummaryCard label="Available" value={summary.availableRooms} />
              <SummaryCard label="Remaining" value={summary.remainingRooms} />
              <SummaryCard label="Blocked" value={summary.blockedRooms} />
              <SummaryCard
                label="Allocation %"
                value={`${summary.allocationPercentage}%`}
              />
              <SummaryCard
                label="Utilization %"
                value={`${summary.utilizationPercentage}%`}
              />
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {[
                      "Date",
                      "Room Type",
                      "Rate Plan",
                      "Total",
                      "Allocated",
                      "Sold",
                      "Available",
                      "Remaining",
                      "Blocked",
                      "Alloc %",
                      "Util %",
                      "Occ %",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-16 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
                      </td>
                    </tr>
                  ) : !report?.inventory.length ? (
                    <tr>
                      <td
                        colSpan={13}
                        className="px-4 py-16 text-center text-slate-400"
                      >
                        No inventory allocation rows for this period.
                      </td>
                    </tr>
                  ) : (
                    report.inventory.map((row, index) => (
                      <tr
                        key={`${row.date}-${row.roomTypeId ?? row.roomType}-${row.ratePlanId ?? row.ratePlan}-${index}`}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">
                          {formatReportDate(row.date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {row.roomType}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {row.ratePlan}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.total}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.allocated}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.sold}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.available}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.remaining}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.blocked}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.allocationPercentage}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.utilizationPercentage}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.occupancyPercentage}%
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                              allocationStatusTone(row.status),
                            )}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <span>
                  Page {page + 1} of {totalPages} ·{" "}
                  {report?.page.totalElements ?? 0} rows
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1 || loading}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Filter</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Date range
                </h3>
                <label className="mb-1 block text-xs text-slate-500">
                  Time period
                </label>
                <select
                  value={draft.datePreset}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: e.target.value as InventoryAllocationDatePreset,
                    }))
                  }
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {DATE_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {draft.datePreset === "CUSTOM" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        From
                      </label>
                      <input
                        type="date"
                        value={draft.fromDate}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            fromDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        To
                      </label>
                      <input
                        type="date"
                        value={draft.toDate}
                        min={draft.fromDate || undefined}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            toDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer text-sm font-semibold text-[#2f3d95] hover:underline"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                disabled={draftCustomInvalid || loading}
                className="cursor-pointer rounded-lg bg-[#2f3d95] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#26317a] disabled:opacity-50"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
