import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  allocationStatusTone,
  exportStatusLabel,
  formatReportDate,
  formatStatusLabel,
  isoToReportDateText,
  isValidCustomDateRange,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import { rateService } from "@/features/inventory/services/rateService";
import {
  mergeIdOptions,
  ReportIdMultiSelect,
  selectedOptionLabel,
  type ReportIdOption,
} from "../components/ReportIdMultiSelect";
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
  Ban,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Loader2,
  Package,
  Percent,
  ShoppingBag,
  TrendingUp,
  X,
  type LucideIcon,
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

const EXPORT_FORMATS: {
  value: ReportExportFormat;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "EXCEL", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { value: "CSV", label: "CSV (.csv)", icon: FileText },
];

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: {
    wrap: string;
    icon: string;
    label: string;
    value: string;
  };
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 shadow-sm", tone.wrap)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", tone.label)}>
          {label}
        </p>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", tone.value)}>{value}</p>
    </div>
  );
}

type FilterDraft = {
  datePreset: InventoryAllocationDatePreset;
  fromDate: string;
  toDate: string;
  roomTypeIds: number[];
  ratePlanIds: number[];
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  roomTypeIds: [],
  ratePlanIds: [],
};

export default function InventoryAllocationReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<InventoryAllocationDatePreset>(DEFAULT_DATE_PRESET);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [roomTypeIds, setRoomTypeIds] = useState<number[]>([]);
  const [ratePlanIds, setRatePlanIds] = useState<number[]>([]);
  const [roomOptions, setRoomOptions] = useState<ReportIdOption[]>([]);
  const [ratePlanOptions, setRatePlanOptions] = useState<ReportIdOption[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
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
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0) +
    (roomTypeIds.length ? 1 : 0) +
    (ratePlanIds.length ? 1 : 0);

  const loadReport = useCallback(
    async (overrides?: Partial<FilterDraft>) => {
      if (!hotelId) return;
      const nextPreset = overrides?.datePreset ?? datePreset;
      const nextFrom = overrides?.fromDate ?? fromDate;
      const nextTo = overrides?.toDate ?? toDate;
      const nextRoomTypeIds = overrides?.roomTypeIds ?? roomTypeIds;
      const nextRatePlanIds = overrides?.ratePlanIds ?? ratePlanIds;
      if (nextPreset === "CUSTOM" && (!nextFrom || !nextTo)) return;

      setLoading(true);
      setError(null);
      try {
        const data = await inventoryAllocationReportService.getReport({
          propertyIds: [hotelId],
          datePreset: nextPreset,
          fromDate: nextPreset === "CUSTOM" ? nextFrom : undefined,
          toDate: nextPreset === "CUSTOM" ? nextTo : undefined,
          roomTypeIds: nextRoomTypeIds,
          ratePlanIds: nextRatePlanIds,
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
    [
      hotelId,
      datePreset,
      fromDate,
      toDate,
      roomTypeIds,
      ratePlanIds,
      page,
      pageSize,
      showToast,
    ],
  );

  useEffect(() => {
    if (!hotelId) {
      setRoomOptions([]);
      setRatePlanOptions([]);
      setRoomTypeIds([]);
      setRatePlanIds([]);
      return;
    }
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [rooms, plans] = await Promise.all([
        inventoryService.getCalendar(hotelId, today, today).catch(() => []),
        rateService.getHotelRatePlans(hotelId).catch(() => []),
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
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId || customRangeInvalid) return;
    loadReport();
  }, [hotelId, page, loadReport, customRangeInvalid]);

  useEffect(() => {
    if (!report?.inventory.length) return;
    setRoomOptions((prev) =>
      mergeIdOptions(
        prev,
        report.inventory.flatMap((row) =>
          row.roomTypeId != null
            ? [{ id: row.roomTypeId, name: row.roomType }]
            : [],
        ),
      ),
    );
    setRatePlanOptions((prev) =>
      mergeIdOptions(
        prev,
        report.inventory.flatMap((row) =>
          row.ratePlanId != null
            ? [{ id: row.ratePlanId, name: row.ratePlan }]
            : [],
        ),
      ),
    );
  }, [report]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [exportMenuOpen]);

  const openFilters = () => {
    setDraft({ datePreset, fromDate, toDate, roomTypeIds, ratePlanIds });
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
      nextDraft = {
        ...draft,
        fromDate: parsed.fromDate,
        toDate: parsed.toDate,
      };
    }
    setDatePreset(nextDraft.datePreset);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setRoomTypeIds(nextDraft.roomTypeIds);
    setRatePlanIds(nextDraft.ratePlanIds);
    setPage(0);
    setFilterOpen(false);
    loadReport(nextDraft);
  };

  const clearAll = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
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
          roomTypeIds,
          ratePlanIds,
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
      <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-violet-50/20">
        <div className="container mx-auto px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-500 text-white shadow-sm">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-slate-900">
                  Inventory Allocation Report
                </h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
                    <span className="font-semibold text-slate-700">{presetLabel}</span>
                    {report?.dateRange.fromDate ? (
                      <span>
                        {formatReportDate(report.dateRange.fromDate)} –{" "}
                        {formatReportDate(report.dateRange.toDate)}
                      </span>
                    ) : null}
                  </span>
                  {selectedRoomTypeName ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700 ring-1 ring-violet-200">
                      <BedDouble className="h-3 w-3" />
                      {selectedRoomTypeName}
                    </span>
                  ) : null}
                  {selectedRatePlanName ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 ring-1 ring-indigo-200">
                      <Layers className="h-3 w-3" />
                      {selectedRatePlanName}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openFilters}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  activeFilterCount
                    ? "border-violet-200 bg-violet-50 text-violet-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50",
                )}
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount ? (
                  <span className="rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
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
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-800 transition hover:bg-violet-100 disabled:opacity-60"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
                {exportMenuOpen && !exporting ? (
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {EXPORT_FORMATS.map((format) => {
                      const Icon = format.icon;
                      return (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() => handleExport(format.value)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50"
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              format.value === "EXCEL"
                                ? "text-emerald-600"
                                : "text-sky-600",
                            )}
                          />
                          {format.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {summary ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              <MetricCard
                label="Total rooms"
                value={summary.totalRooms}
                icon={Building2}
                tone={{
                  wrap: "border-slate-200 bg-slate-50/80",
                  icon: "bg-slate-200 text-slate-700",
                  label: "text-slate-500",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Allocated"
                value={summary.allocatedRooms}
                icon={Layers}
                tone={{
                  wrap: "border-violet-200 bg-violet-50/80",
                  icon: "bg-violet-100 text-violet-700",
                  label: "text-violet-600",
                  value: "text-violet-900",
                }}
              />
              <MetricCard
                label="Sold"
                value={summary.soldRooms}
                icon={ShoppingBag}
                tone={{
                  wrap: "border-emerald-200 bg-emerald-50/80",
                  icon: "bg-emerald-100 text-emerald-700",
                  label: "text-emerald-600",
                  value: "text-emerald-900",
                }}
              />
              <MetricCard
                label="Available"
                value={summary.availableRooms}
                icon={CheckCircle2}
                tone={{
                  wrap: "border-sky-200 bg-sky-50/80",
                  icon: "bg-sky-100 text-sky-700",
                  label: "text-sky-600",
                  value: "text-sky-900",
                }}
              />
              <MetricCard
                label="Remaining"
                value={summary.remainingRooms}
                icon={BedDouble}
                tone={{
                  wrap: "border-teal-200 bg-teal-50/80",
                  icon: "bg-teal-100 text-teal-700",
                  label: "text-teal-600",
                  value: "text-teal-900",
                }}
              />
              <MetricCard
                label="Blocked"
                value={summary.blockedRooms}
                icon={Ban}
                tone={{
                  wrap: "border-rose-200 bg-rose-50/80",
                  icon: "bg-rose-100 text-rose-700",
                  label: "text-rose-600",
                  value: "text-rose-900",
                }}
              />
              <MetricCard
                label="Allocation %"
                value={`${summary.allocationPercentage}%`}
                icon={Percent}
                tone={{
                  wrap: "border-amber-200 bg-amber-50/80",
                  icon: "bg-amber-100 text-amber-700",
                  label: "text-amber-600",
                  value: "text-amber-900",
                }}
              />
              <MetricCard
                label="Utilization %"
                value={`${summary.utilizationPercentage}%`}
                icon={TrendingUp}
                tone={{
                  wrap: "border-indigo-200 bg-indigo-50/80",
                  icon: "bg-indigo-100 text-indigo-700",
                  label: "text-indigo-600",
                  value: "text-indigo-900",
                }}
              />
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
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
                        className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-normal text-slate-500"
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
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                            {formatReportDate(row.date)}
                          </span>
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
                        <td className="px-3 py-2.5 tabular-nums font-medium text-violet-700">
                          {row.allocated}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-emerald-700">
                          {row.sold}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-sky-700">
                          {row.available}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-teal-700">
                          {row.remaining}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-rose-700">
                          {row.blocked}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-amber-700">
                          {row.allocationPercentage}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-indigo-700">
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
                  <ReportCustomDateFields
                    className="mt-3"
                    fromText={customFromText}
                    toText={customToText}
                    onFromTextChange={setCustomFromText}
                    onToTextChange={setCustomToText}
                  />
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
