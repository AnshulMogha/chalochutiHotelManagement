import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { useAuth } from "@/hooks/useAuth";
import {
  canUseCrossHotelReportFilter,
  canViewPaymentReport,
} from "@/constants/roles";
import { canViewModule } from "@/lib/permissions";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
  ReportRefreshButton,
} from "../components/ReportFilterDrawer";
import {
  exportStatusLabel,
  formatStatusLabel,
  isoToReportDateText,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import { HotelLookupMultiSelectField } from "../components/HotelLookupFilterField";
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
  PayoutMisDateAxis,
  PayoutMisDatePreset,
  PayoutMisDetailResponse,
  PayoutMisSortField,
} from "../services/payoutMisTypes";
import type { ExportJobStatus } from "../services/reportExportService";
import { Building2 } from "lucide-react";

const PAGE_SIZE = 20;
const DEFAULT_DATE_PRESET: PayoutMisDatePreset = "THIS_MONTH";
const DEFAULT_SORT: PayoutMisSortField = "PAYMENT_DATE";

const DATE_PRESET_OPTIONS: { value: PayoutMisDatePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_MONTH", label: "Month Till Date" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "LAST_WEEK", label: "Last Week" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "CUSTOM", label: "Custom" },
];

const DATE_AXIS_OPTIONS: { value: "" | PayoutMisDateAxis; label: string }[] = [
  { value: "", label: "Default" },
  { value: "CHECK_IN", label: "Check-in" },
  { value: "SETTLED_AT", label: "Settled at" },
];

type FilterDraft = {
  propertyIds: string[];
  datePreset: PayoutMisDatePreset;
  dateAxis: "" | PayoutMisDateAxis;
  fromDate: string;
  toDate: string;
  search: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  propertyIds: [],
  datePreset: DEFAULT_DATE_PRESET,
  dateAxis: "",
  fromDate: "",
  toDate: "",
  search: "",
};

export default function PayoutMisPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const hotelId = useHotelIdFromUrl();
  const canFilterHotels = canUseCrossHotelReportFilter(user?.roles);
  const [, setSearchParams] = useSearchParams();

  // Same Net Earnings tab as Super Admin / Owner for Manager & Accountant too.
  const showNetEarningsTabs =
    canViewPaymentReport(user?.roles) || canViewModule(user, "PAYMENTS");

  const [datePreset, setDatePreset] = useState<PayoutMisDatePreset>(DEFAULT_DATE_PRESET);
  const [dateAxis, setDateAxis] = useState<"" | PayoutMisDateAxis>(
    DEFAULT_DRAFT.dateAxis,
  );
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
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

  const scopeReady = canFilterHotels || !!hotelId;
  const customRangeInvalid = datePreset === "CUSTOM" && (!fromDate || !toDate);

  const activeFilterCount =
    (propertyIds.length ? 1 : 0) +
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (dateAxis ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const listParams = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: sortField,
      sortDir,
      datePreset,
      dateAxis: dateAxis || undefined,
      fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
      toDate: datePreset === "CUSTOM" ? toDate : undefined,
      search: search.trim() || undefined,
      propertyIds: canFilterHotels
        ? propertyIds
        : hotelId
          ? [hotelId]
          : undefined,
    }),
    [
      page,
      sortField,
      sortDir,
      datePreset,
      dateAxis,
      fromDate,
      toDate,
      search,
      hotelId,
      canFilterHotels,
      propertyIds,
    ],
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
    if (canFilterHotels || hotelId) return;
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
  }, [hotelId, canFilterHotels, setSearchParams]);

  const openDetail = async (paymentReference: string) => {
    setActiveReference(paymentReference);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const parsed = await hotelPayoutMisService.getDetail({
        paymentReference,
        hotelId:
          hotelId ??
          (canFilterHotels && propertyIds.length === 1
            ? propertyIds[0]
            : undefined),
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
    setPropertyIds(nextDraft.propertyIds);
    setDatePreset(nextDraft.datePreset);
    setDateAxis(nextDraft.dateAxis);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setSearch(nextDraft.search.trim());
    setPage(0);
    setFilterOpen(false);
  };

  const openFilters = () => {
    setDraft({ propertyIds, datePreset, dateAxis, fromDate, toDate, search });
    setCustomFromText(isoToReportDateText(fromDate));
    setCustomToText(isoToReportDateText(toDate));
    setFilterOpen(true);
  };

  const clearAllFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
    setPropertyIds(DEFAULT_DRAFT.propertyIds);
    setDatePreset(DEFAULT_DRAFT.datePreset);
    setDateAxis(DEFAULT_DRAFT.dateAxis);
    setFromDate(DEFAULT_DRAFT.fromDate);
    setToDate(DEFAULT_DRAFT.toDate);
    setSearch(DEFAULT_DRAFT.search);
    setPage(0);
    setFilterOpen(false);
  };

  if (!canFilterHotels && !hotelId) {
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

      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                {showNetEarningsTabs ? (
                  <PaymentsTabNav
                    active="payouts"
                    showNetEarnings
                    showPayouts
                    hotelId={hotelId}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={report?.dateRange.fromDate}
                  to={report?.dateRange.toDate}
                  detail={
                    report?.dateAxis || dateAxis
                      ? (DATE_AXIS_OPTIONS.find(
                          (option) =>
                            option.value === (report?.dateAxis || dateAxis),
                        )?.label ??
                        formatStatusLabel(report?.dateAxis || dateAxis))
                      : null
                  }
                />
                <ReportFilterButton
                  onClick={openFilters}
                  activeCount={activeFilterCount}
                />
                <ExportButton
                  iconOnly
                  disabled={exporting || loading || customRangeInvalid}
                  exporting={exporting}
                  exportingLabel={
                    exportStatusLabel(exportStatus) || "Exporting…"
                  }
                  onExportExcel={() => void downloadFullExport()}
                  onExportCSV={() => void downloadFullExport()}
                  onExportPDF={() => void downloadFullExport()}
                />
                <ReportRefreshButton
                  onClick={() => void loadReport()}
                  loading={loading}
                  disabled={customRangeInvalid}
                />
              </div>
            </div>

            <div className="px-4 py-3">
              {summary ? (
                <PayoutSummaryStrip summary={summary} />
              ) : (
                <p className="text-sm text-slate-400">
                  {loading ? "Loading summary…" : "Open Filter to load report"}
                </p>
              )}
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <PayoutPaymentsTable
            rows={report?.payments ?? []}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onOpenDetail={openDetail}
            onRowExport={downloadRowExport}
            rowExportingRef={rowExportingRef}
            loading={loading}
            page={page}
            pageSize={PAGE_SIZE}
            rowCount={report?.page.totalElements ?? 0}
            onPageChange={(nextPage) => setPage(Math.max(0, nextPage))}
          />
        </div>
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={clearAllFilters}
        onApply={applyFilters}
      >
        {canFilterHotels ? (
          <HotelLookupMultiSelectField
            value={draft.propertyIds}
            onChange={(ids) =>
              setDraft((prev) => ({ ...prev, propertyIds: ids }))
            }
          />
        ) : null}
        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            Payment date range
          </h3>
          <label className="mb-1 block text-xs text-slate-500">Date axis</label>
          <select
            value={draft.dateAxis}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                dateAxis: event.target.value as "" | PayoutMisDateAxis,
              }))
            }
            className="mb-3 w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            {DATE_AXIS_OPTIONS.map((option) => (
              <option key={option.value || "default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-slate-500">
            Time period
          </label>
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
      </ReportFilterDrawer>
    </>
  );
}
