import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  exportStatusLabel,
  formatReportCurrency,
  formatReportDate,
  formatStatusLabel,
  healthStatusTone,
  ReportPageHeader,
  SummaryCard,
} from "../components/reportUiHelpers";
import {
  rateHealthReportService,
  type RateHealthDatePreset,
  type RateHealthReportResponse,
} from "../services/rateHealthReportService";
import type { ExportJobStatus } from "../services/reportExportService";
import {
  Building2,
  CalendarDays,
  Download,
  Filter,
  HeartPulse,
  Loader2,
  X,
} from "lucide-react";

const DEFAULT_DATE_PRESET: RateHealthDatePreset = "NEXT_30_DAYS";

const DATE_PRESET_OPTIONS: { value: RateHealthDatePreset; label: string }[] = [
  { value: "NEXT_7_DAYS", label: "Next 7 days" },
  { value: "NEXT_15_DAYS", label: "Next 15 days" },
  { value: "NEXT_30_DAYS", label: "Next 30 days" },
  { value: "NEXT_3_MONTHS", label: "Next 3 months" },
  { value: "NEXT_6_MONTHS", label: "Next 6 months" },
  { value: "CUSTOM", label: "Custom" },
];

type FilterDraft = {
  datePreset: RateHealthDatePreset;
  fromDate: string;
  toDate: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
};

export default function RateHealthReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<RateHealthDatePreset>(DEFAULT_DATE_PRESET);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] = useState<RateHealthReportResponse | null>(null);
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
        const data = await rateHealthReportService.getReport({
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
            : "Failed to load rate health report";
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

  const handleExport = async () => {
    if (!hotelId || customRangeInvalid) return;
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await rateHealthReportService.exportReport({
        params: {
          propertyIds: [hotelId],
          datePreset,
          fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
          toDate: datePreset === "CUSTOM" ? toDate : undefined,
        },
        defaultFileName: `rate-health-${report?.dateRange.fromDate || "report"}`,
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
          Rate Disparity Report
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a hotel from the top bar to view rate health.
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
      <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-rose-50/20">
        <div className="container mx-auto px-4 py-4">
          <ReportPageHeader
            icon={HeartPulse}
            iconClassName="bg-linear-to-br from-rose-600 to-orange-500"
            borderClassName="border-rose-100"
            title="Rate Disparity Report"
            description="Stay-date rate health across room types and rate plans."
            actions={
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || loading || customRangeInvalid}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60 sm:text-sm"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting
                  ? exportStatusLabel(exportStatus) || "Exporting…"
                  : "Download Excel"}
              </button>
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
                Stay-date rate health for selected period
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
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard label="Room types" value={summary.roomTypes} />
              <SummaryCard label="Rate plans" value={summary.ratePlans} />
              <SummaryCard
                label="Healthy"
                value={summary.healthy}
                tone="success"
              />
              <SummaryCard
                label="Missing rates"
                value={summary.missingRates}
                tone="warning"
              />
              <SummaryCard
                label="High disparities"
                value={summary.highDisparities}
                tone="danger"
              />
              <SummaryCard
                label="Not saleable"
                value={summary.notSaleable}
                tone="danger"
              />
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {[
                      "Stay Date",
                      "Room Type",
                      "Rate Plan",
                      "Total Rooms",
                      "Allocated",
                      "Sold",
                      "B2C Rate",
                      "B2B Rate",
                      "Bundle Rate",
                      "Health Status",
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
                      <td colSpan={10} className="px-4 py-16 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-rose-600" />
                      </td>
                    </tr>
                  ) : !report?.rates.length ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-16 text-center text-slate-400"
                      >
                        No rate health rows for this period.
                      </td>
                    </tr>
                  ) : (
                    report.rates.map((row, index) => (
                      <tr
                        key={`${row.stayDate}-${row.roomType}-${row.ratePlan}-${index}`}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">
                          {formatReportDate(row.stayDate)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {row.roomType}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {row.ratePlan}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.totalRooms}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.allocated}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {row.sold}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {formatReportCurrency(row.b2cRate)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {formatReportCurrency(row.b2bRate)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {formatReportCurrency(row.bundleRate)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                              healthStatusTone(row.healthStatus),
                            )}
                          >
                            {formatStatusLabel(row.healthStatus)}
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
                      datePreset: e.target.value as RateHealthDatePreset,
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
