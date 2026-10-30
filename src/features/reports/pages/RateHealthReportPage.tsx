import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import { rateService } from "@/features/inventory/services/rateService";
import { useAuth } from "@/hooks/useAuth";
import { canUseCrossHotelReportFilter } from "@/constants/roles";
import { HotelLookupMultiSelectField } from "../components/HotelLookupFilterField";
import {
  mergeIdOptions,
  ReportIdMultiSelect,
  selectedOptionLabel,
  type ReportIdOption,
} from "../components/ReportIdMultiSelect";
import {
  exportStatusLabel,
  formatReportCurrency,
  formatReportDate,
  formatStatusLabel,
  healthStatusTone,
  isoToReportDateText,
  isValidCustomDateRange,
  SummaryCard,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
  ReportRefreshButton,
} from "../components/ReportFilterDrawer";
import {
  rateHealthReportService,
  type RateHealthDatePreset,
  type RateHealthReportResponse,
  type RateHealthRow,
} from "../services/rateHealthReportService";
import type { ExportJobStatus } from "../services/reportExportService";

const RATE_HEALTH_PAGE_SIZE = 20;

const rateHealthColumns: GridColDef<RateHealthRow>[] = [
  {
    field: "stayDate",
    headerName: "Stay Date",
    width: 120,
    sortable: false,
    renderCell: (params) => (
      <span className="whitespace-nowrap text-slate-800">
        {formatReportDate(params.row.stayDate)}
      </span>
    ),
  },
  {
    field: "hotelName",
    headerName: "Hotel Name",
    flex: 1,
    minWidth: 180,
    sortable: false,
    renderCell: (params) => (
      <span className="truncate text-slate-700" title={params.row.hotelName || undefined}>
        {params.row.hotelName || "—"}
      </span>
    ),
  },
  {
    field: "roomType",
    headerName: "Room Type",
    flex: 1,
    minWidth: 140,
    sortable: false,
  },
  {
    field: "ratePlan",
    headerName: "Rate Plan",
    flex: 1,
    minWidth: 140,
    sortable: false,
  },
  {
    field: "totalRooms",
    headerName: "Total Rooms",
    width: 120,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">{params.row.totalRooms}</span>
    ),
  },
  {
    field: "allocated",
    headerName: "Allocated",
    width: 110,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">{params.row.allocated}</span>
    ),
  },
  {
    field: "sold",
    headerName: "Sold",
    width: 90,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">{params.row.sold}</span>
    ),
  },
  {
    field: "b2cRate",
    headerName: "B2C Rate",
    width: 120,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">
        {formatReportCurrency(params.row.b2cRate)}
      </span>
    ),
  },
  {
    field: "b2bRate",
    headerName: "B2B Rate",
    width: 120,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">
        {formatReportCurrency(params.row.b2bRate)}
      </span>
    ),
  },
  {
    field: "bundleRate",
    headerName: "Bundle Rate",
    width: 130,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">
        {formatReportCurrency(params.row.bundleRate)}
      </span>
    ),
  },
  {
    field: "healthStatus",
    headerName: "Health Status",
    width: 150,
    sortable: false,
    renderCell: (params) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-tight ring-1 ring-inset",
          healthStatusTone(params.row.healthStatus),
        )}
      >
        {params.row.healthStatus.toUpperCase().includes("DISPAR")
          ? "Rate Variance"
          : formatStatusLabel(params.row.healthStatus)}
      </span>
    ),
  },
];
import {
  BadgeCheck,
  Ban,
  BedDouble,
  Building2,
  CircleAlert,
  Download,
  HeartPulse,
  Layers,
  Loader2,
  Scale,
  X,
} from "lucide-react";

const DEFAULT_DATE_PRESET: RateHealthDatePreset = "NEXT_30_DAYS";

const DATE_PRESET_OPTIONS: { value: RateHealthDatePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_WEEK", label: "Last week" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_14_DAYS", label: "Last 14 days" },
  { value: "LAST_15_DAYS", label: "Last 15 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_180_DAYS", label: "Last 180 days" },
  { value: "LAST_365_DAYS", label: "Last 365 days" },
  { value: "NEXT_7_DAYS", label: "Next 7 days" },
  { value: "NEXT_30_DAYS", label: "Next 30 days" },
  { value: "ALL_TIME", label: "All time" },
  { value: "CUSTOM", label: "Custom" },
];

const CUSTOM_RANGE_MAX_DAYS = 365;

type FilterDraft = {
  propertyIds: string[];
  datePreset: RateHealthDatePreset;
  fromDate: string;
  toDate: string;
  roomTypeIds: number[];
  ratePlanIds: number[];
};

const DEFAULT_DRAFT: FilterDraft = {
  propertyIds: [],
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  roomTypeIds: [],
  ratePlanIds: [],
};

export default function RateHealthReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { user } = useAuth();
  const canFilterHotels = canUseCrossHotelReportFilter(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<RateHealthDatePreset>(DEFAULT_DATE_PRESET);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [roomTypeIds, setRoomTypeIds] = useState<number[]>([]);
  const [ratePlanIds, setRatePlanIds] = useState<number[]>([]);
  const [roomOptions, setRoomOptions] = useState<ReportIdOption[]>([]);
  const [ratePlanOptions, setRatePlanOptions] = useState<ReportIdOption[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(RATE_HEALTH_PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] = useState<RateHealthReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const customRangeInvalid =
    datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

  const activeFilterCount =
    (propertyIds.length ? 1 : 0) +
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0) +
    (roomTypeIds.length ? 1 : 0) +
    (ratePlanIds.length ? 1 : 0);

  useEffect(() => {
    if ((!canFilterHotels && !hotelId) || customRangeInvalid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void rateHealthReportService
      .getReport({
        propertyIds: canFilterHotels
          ? propertyIds
          : hotelId
            ? [hotelId]
            : [],
        datePreset,
        fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
        toDate: datePreset === "CUSTOM" ? toDate : undefined,
        roomTypeIds,
        ratePlanIds,
        page,
        size: pageSize,
      })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Failed to load rate health report";
        setError(message);
        showToast(message, "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    hotelId,
    canFilterHotels,
    propertyIds,
    datePreset,
    fromDate,
    toDate,
    roomTypeIds,
    ratePlanIds,
    page,
    pageSize,
    customRangeInvalid,
    refreshNonce,
    showToast,
  ]);

  useEffect(() => {
    const optionHotelId = canFilterHotels
      ? propertyIds.length === 1
        ? propertyIds[0]
        : null
      : hotelId;
    if (!optionHotelId) {
      setRoomOptions((prev) => (prev.length ? [] : prev));
      setRatePlanOptions((prev) => (prev.length ? [] : prev));
      setRoomTypeIds((prev) => (prev.length ? [] : prev));
      setRatePlanIds((prev) => (prev.length ? [] : prev));
      return;
    }
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [rooms, plans] = await Promise.all([
        inventoryService.getCalendar(optionHotelId, today, today).catch(() => []),
        rateService.getHotelRatePlans(optionHotelId).catch(() => []),
      ]);
      if (cancelled) return;
      setRoomOptions(
        mergeIdOptions(
          [],
          rooms.map((room) => ({ id: room.roomId, name: room.roomName })),
        ),
      );
      const nameCounts = new Map<string, number>();
      for (const plan of plans) {
        const name = plan.ratePlanName || "Rate plan";
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
      }
      setRatePlanOptions(
        mergeIdOptions(
          [],
          plans.map((plan) => ({
            id: plan.ratePlanId,
            name:
              (nameCounts.get(plan.ratePlanName || "Rate plan") ?? 0) > 1 &&
              plan.roomName
                ? `${plan.ratePlanName} · ${plan.roomName}`
                : plan.ratePlanName || `Rate plan ${plan.ratePlanId}`,
          })),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, canFilterHotels, propertyIds]);

  useEffect(() => {
    if (!report?.rates.length) return;
    setRoomOptions((prev) =>
      mergeIdOptions(
        prev,
        report.rates.flatMap((row) =>
          row.roomTypeId != null
            ? [{ id: row.roomTypeId, name: row.roomType }]
            : [],
        ),
      ),
    );
    setRatePlanOptions((prev) =>
      mergeIdOptions(
        prev,
        report.rates.flatMap((row) =>
          row.ratePlanId != null
            ? [{ id: row.ratePlanId, name: row.ratePlan }]
            : [],
        ),
      ),
    );
  }, [report]);

  const openFilters = () => {
    setDraft({
      propertyIds,
      datePreset,
      fromDate,
      toDate,
      roomTypeIds,
      ratePlanIds,
    });
    setCustomFromText(isoToReportDateText(fromDate));
    setCustomToText(isoToReportDateText(toDate));
    setFilterOpen(true);
  };

  const applyFilters = () => {
    let nextDraft = draft;
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      const spanDays = Math.round(
        (new Date(`${parsed.toDate}T00:00:00`).getTime() -
          new Date(`${parsed.fromDate}T00:00:00`).getTime()) /
          86_400_000,
      );
      if (spanDays > CUSTOM_RANGE_MAX_DAYS) {
        showToast("Custom range cannot be longer than 365 days", "error");
        return;
      }
      nextDraft = {
        ...draft,
        fromDate: parsed.fromDate,
        toDate: parsed.toDate,
      };
    }
    setPropertyIds(nextDraft.propertyIds);
    setDatePreset(nextDraft.datePreset);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setRoomTypeIds(nextDraft.roomTypeIds);
    setRatePlanIds(nextDraft.ratePlanIds);
    setPage(0);
    setFilterOpen(false);
  };

  const clearAll = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
    setPropertyIds(DEFAULT_DRAFT.propertyIds);
    setDatePreset(DEFAULT_DRAFT.datePreset);
    setFromDate(DEFAULT_DRAFT.fromDate);
    setToDate(DEFAULT_DRAFT.toDate);
    setRoomTypeIds(DEFAULT_DRAFT.roomTypeIds);
    setRatePlanIds(DEFAULT_DRAFT.ratePlanIds);
    setPage(0);
    setFilterOpen(false);
  };

  const handleExport = async () => {
    if ((!canFilterHotels && !hotelId) || customRangeInvalid) return;
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await rateHealthReportService.exportReport({
        params: {
          propertyIds: canFilterHotels
            ? propertyIds
            : hotelId
              ? [hotelId]
              : [],
          datePreset,
          fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
          toDate: datePreset === "CUSTOM" ? toDate : undefined,
          roomTypeIds,
          ratePlanIds,
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

  if (!canFilterHotels && !hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Rate Variance
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
  const selectedRoomTypeName = selectedOptionLabel(
    roomOptions,
    roomTypeIds,
    "Room type",
    "room types",
  );
  const selectedRatePlanName = selectedOptionLabel(
    ratePlanOptions,
    ratePlanIds,
    "Rate plan",
    "rate plans",
  );

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-rose-600 to-orange-500 text-white shadow-sm">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-900">
                  Rate Variance
                </h1>
                {selectedRoomTypeName || selectedRatePlanName ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {selectedRoomTypeName ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700 ring-1 ring-rose-200">
                        <BedDouble className="h-3 w-3" />
                        {selectedRoomTypeName}
                      </span>
                    ) : null}
                    {selectedRatePlanName ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700 ring-1 ring-orange-200">
                        <Layers className="h-3 w-3" />
                        {selectedRatePlanName}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                from={report?.dateRange.fromDate}
                to={report?.dateRange.toDate}
                detail={presetLabel}
              />
              <ReportFilterButton
                onClick={openFilters}
                activeCount={activeFilterCount}
              />
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || loading || customRangeInvalid}
                aria-label={
                  exporting
                    ? exportStatusLabel(exportStatus) || "Exporting"
                    : "Download report"
                }
                title={
                  exporting
                    ? exportStatusLabel(exportStatus) || "Exporting…"
                    : "Download"
                }
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <ReportRefreshButton
                onClick={() => setRefreshNonce((n) => n + 1)}
                loading={loading}
                disabled={customRangeInvalid}
              />
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard
                label="Room types"
                value={summary.roomTypes}
                tone="sky"
                icon={BedDouble}
              />
              <SummaryCard
                label="Rate plans"
                value={summary.ratePlans}
                tone="indigo"
                icon={Layers}
              />
              <SummaryCard
                label="Healthy"
                value={summary.healthy}
                tone="success"
                icon={BadgeCheck}
              />
              <SummaryCard
                label="Missing rates"
                value={summary.missingRates}
                tone="warning"
                icon={CircleAlert}
              />
              <SummaryCard
                label="Rate variance"
                value={summary.highDisparities}
                tone="danger"
                icon={Scale}
              />
              <SummaryCard
                label="Not saleable"
                value={summary.notSaleable}
                tone="orange"
                icon={Ban}
              />
            </div>
          ) : null}

          <DataTable
            subtitle={
              <>
                <span className="font-medium text-slate-600">
                  {formatListCount(report?.page.totalElements ?? 0, "row")}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
              </>
            }
            rows={report?.rates ?? []}
            columns={rateHealthColumns}
            getRowId={(row) =>
              `${row.stayDate}-${row.hotelName}-${row.roomType}-${row.ratePlan}`
            }
            loading={loading}
            paginationMode="server"
            rowCount={report?.page.totalElements ?? 0}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              if (model.page !== page) setPage(model.page);
            }}
            pageSizeOptions={[RATE_HEALTH_PAGE_SIZE]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            localeText={{
              noRowsLabel: "No rate health rows for this period.",
            }}
          />
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
              {canFilterHotels ? (
                <HotelLookupMultiSelectField
                  value={draft.propertyIds}
                  onChange={(ids) =>
                    setDraft((prev) => ({
                      ...prev,
                      propertyIds: ids,
                      roomTypeIds: [],
                      ratePlanIds: [],
                    }))
                  }
                />
              ) : null}
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
                  <>
                    <ReportCustomDateFields
                      className="mt-3"
                      fromText={customFromText}
                      toText={customToText}
                      onFromTextChange={setCustomFromText}
                      onToTextChange={setCustomToText}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Custom range can span up to 365 days. Use it for a
                      forward window such as the next 6 months.
                    </p>
                  </>
                ) : null}
              </section>

              <ReportIdMultiSelect
                title="Room type"
                hint="Single or multiple rooms"
                options={roomOptions}
                selectedIds={draft.roomTypeIds}
                onChange={(ids) =>
                  setDraft((prev) => ({ ...prev, roomTypeIds: ids }))
                }
              />
              <ReportIdMultiSelect
                title="Rate plan"
                hint="Single or multiple rate plans"
                options={ratePlanOptions}
                selectedIds={draft.ratePlanIds}
                onChange={(ids) =>
                  setDraft((prev) => ({ ...prev, ratePlanIds: ids }))
                }
              />
            </div>

            <ReportFilterActions
              onReset={clearAll}
              onApply={applyFilters}
              applyDisabled={draftCustomInvalid || loading}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
