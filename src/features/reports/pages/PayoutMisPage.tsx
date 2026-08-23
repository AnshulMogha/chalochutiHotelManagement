import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { canViewPaymentReport } from "@/constants/roles";
import { cn } from "@/lib/utils";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  exportStatusLabel,
  formatReportDate,
  isoToReportDateText,
  ReportPageHeader,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  PaymentsTabNav,
  PayoutDetailDrawer,
  PayoutPaymentsTable,
  PayoutSummaryStrip,
  useHotelIdFromUrl,
} from "../components/payoutMisUi";
import { hotelPayoutMisService } from "../services/payoutMisService";
import type {
  PayoutMisDashboardResponse,
  PayoutMisDatePreset,
  PayoutMisDetailResponse,
  PayoutMisSortField,
} from "../services/payoutMisTypes";
import type { ExportJobStatus } from "../services/reportExportService";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Wallet,
  X,
} from "lucide-react";

const PAGE_SIZE = 20;
const DEFAULT_DATE_PRESET: PayoutMisDatePreset = "THIS_MONTH";
const DEFAULT_SORT: PayoutMisSortField = "PAYMENT_DATE";

const DATE_PRESET_OPTIONS: { value: PayoutMisDatePreset; label: string }[] = [
  { value: "THIS_MONTH", label: "Month Till Date" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "CUSTOM", label: "Custom" },
];

type FilterDraft = {
  datePreset: PayoutMisDatePreset;
  fromDate: string;
  toDate: string;
  search: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  search: "",
};

export default function PayoutMisPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const hotelId = useHotelIdFromUrl();
  const [, setSearchParams] = useSearchParams();

  const showNetEarningsTabs = canViewPaymentReport(user?.roles);

  const [datePreset, setDatePreset] = useState<PayoutMisDatePreset>(DEFAULT_DATE_PRESET);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<PayoutMisSortField>(DEFAULT_SORT);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PayoutMisDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeReference, setActiveReference] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayoutMisDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [rowExportingRef, setRowExportingRef] = useState<string | null>(null);
  const [detailExporting, setDetailExporting] = useState(false);

  const scopeReady = !!hotelId;
  const customRangeInvalid = datePreset === "CUSTOM" && (!fromDate || !toDate);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) + (search.trim() ? 1 : 0);

  const listParams = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: sortField,
      sortDir,
      datePreset,
      fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
      toDate: datePreset === "CUSTOM" ? toDate : undefined,
      search: search.trim() || undefined,
      propertyIds: hotelId ? [hotelId] : undefined,
    }),
    [page, sortField, sortDir, datePreset, fromDate, toDate, search, hotelId],
  );

  const loadReport = useCallback(async () => {
    if (!scopeReady || customRangeInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await hotelPayoutMisService.getDashboard(listParams);
      setReport(parsed);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [scopeReady, customRangeInvalid, listParams, showToast]);

  useEffect(() => {
    if (!scopeReady || customRangeInvalid) return;
    loadReport();
  }, [scopeReady, customRangeInvalid, loadReport]);

  useEffect(() => {
    if (hotelId) return;
    const stored = getStoredSelectedHotelId();
    if (!stored) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!next.has("hotelId")) next.set("hotelId", stored);
        return next;
      },
      { replace: true },
    );
  }, [hotelId, setSearchParams]);

  const openDetail = async (paymentReference: string) => {
    setActiveReference(paymentReference);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const parsed = await hotelPayoutMisService.getDetail({
        paymentReference,
        hotelId: hotelId ?? undefined,
      });
      setDetail(parsed);
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
      setActiveReference(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const runExport = async (params: typeof listParams, fileName: string) => {
    await hotelPayoutMisService.exportDashboard({
      params,
      defaultFileName: fileName,
      onStatus: setExportStatus,
    });
  };

  const downloadFullExport = async () => {
    if (!scopeReady || customRangeInvalid) return;
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await runExport(
        listParams,
        `hotel-payouts-${report?.dateRange.fromDate || "report"}`,
      );
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const downloadRowExport = async (paymentReference: string) => {
    if (!scopeReady || customRangeInvalid) return;
    setRowExportingRef(paymentReference);
    setExportStatus("QUEUED");
    try {
      await runExport(
        { ...listParams, search: paymentReference, page: 0, size: PAGE_SIZE },
        `hotel-payout-${paymentReference}`,
      );
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setRowExportingRef(null);
      setExportStatus(null);
    }
  };

  const downloadDetailExport = async () => {
    if (!activeReference || !scopeReady) return;
    setDetailExporting(true);
    setExportStatus("QUEUED");
    try {
      await runExport(
        { ...listParams, search: activeReference, page: 0, size: PAGE_SIZE },
        `hotel-payout-${activeReference}`,
      );
      showToast("Statement downloaded", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setDetailExporting(false);
      setExportStatus(null);
    }
  };

  const handleSort = (field: PayoutMisSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const applyFilters = () => {
    let nextDraft = draft;
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextDraft = { ...draft, fromDate: parsed.fromDate, toDate: parsed.toDate };
    }
    setDatePreset(nextDraft.datePreset);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setSearch(nextDraft.search.trim());
    setPage(0);
    setFilterOpen(false);
  };

  const openFilters = () => {
    setDraft({ datePreset, fromDate, toDate, search });
    setCustomFromText(isoToReportDateText(fromDate));
    setCustomToText(isoToReportDateText(toDate));
    setFilterOpen(true);
  };

  const clearAllFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
  };

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Select a hotel from top bar.</p>
        <div className="mt-8 flex min-h-70 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <Building2 className="h-10 w-10 text-slate-300" />
        </div>
      </div>
    );
  }

  const summary = report?.summary;
  const totalPages = report?.page.totalPages ?? 0;
  const paymentsCount = summary?.paymentsMade ?? report?.payments.length ?? 0;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <PayoutDetailDrawer
        open={Boolean(activeReference)}
        loading={loadingDetail}
        detail={detail}
        variant="hotel"
        onClose={() => setActiveReference(null)}
        onExport={downloadDetailExport}
        exporting={detailExporting}
      />

      <div className="min-h-full bg-[#f7f8fa]">
        <div className="container mx-auto px-4 py-4">
          <ReportPageHeader
            icon={Wallet}
            iconClassName="bg-linear-to-br from-blue-600 to-indigo-500"
            borderClassName="border-blue-100"
            title="Payments"
            description="Payout settlement details for your property"
            actions={
              <button
                type="button"
                onClick={downloadFullExport}
                disabled={exporting || loading || customRangeInvalid}
                aria-label={
                  exporting
                    ? exportStatusLabel(exportStatus) || "Exporting"
                    : "Download report"
                }
                title={
                  exporting
                    ? exportStatusLabel(exportStatus) || "Exporting…"
                    : "Download detailed statement"
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-800 transition hover:bg-blue-100 disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            }
          />

          {showNetEarningsTabs ? (
            <PaymentsTabNav active="payouts" showNetEarnings hotelId={hotelId} />
          ) : null}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            {summary ? (
              <PayoutSummaryStrip summary={summary} />
            ) : (
              <p className="text-sm text-slate-400">
                {loading ? "Loading summary…" : "Open Filter to load report"}
              </p>
            )}

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
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-800">
                Payment Settlement Details
                <span className="ml-1 font-normal text-slate-500">({paymentsCount})</span>
              </h2>
            </div>
            <PayoutPaymentsTable
              rows={report?.payments ?? []}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onOpenDetail={openDetail}
              onRowExport={downloadRowExport}
              rowExportingRef={rowExportingRef}
              loading={loading}
            />
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={page <= 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page + 1 >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
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
                <h3 className="mb-2 text-sm font-bold text-slate-900">Payment date range</h3>
                <label className="mb-1 block text-xs text-slate-500">Time period</label>
                <select
                  value={draft.datePreset}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: event.target.value as PayoutMisDatePreset,
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
                  <ReportCustomDateFields
                    className="mt-3"
                    fromText={customFromText}
                    toText={customToText}
                    onFromTextChange={setCustomFromText}
                    onToTextChange={setCustomToText}
                  />
                ) : null}
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Search</h3>
                <label className="mb-1 block text-xs text-slate-500">
                  Payment reference / UTR / settlement no.
                </label>
                <input
                  value={draft.search}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Search by payment reference"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </section>
            </div>

            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
