import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
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
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
  ReportRefreshButton,
} from "../components/ReportFilterDrawer";
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
  inventoryAllocationReportService,
  type InventoryAllocationDatePreset,
  type InventoryAllocationReportResponse,
  type InventoryAllocationRow,
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
const INVENTORY_PAGE_SIZE = 20;

const inventoryColumns: GridColDef<InventoryAllocationRow>[] = [
  {
    field: "date",
    headerName: "Date",
    width: 130,
    sortable: false,
    renderCell: (params) => (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-800">
        <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
        {formatReportDate(params.row.date)}
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
  { field: "roomType", headerName: "Room Type", flex: 1, minWidth: 140, sortable: false },
  { field: "ratePlan", headerName: "Rate Plan", flex: 1, minWidth: 140, sortable: false },
  {
    field: "total",
    headerName: "Total",
    width: 90,
    sortable: false,
    renderCell: (params) => <span className="tabular-nums text-slate-700">{params.row.total}</span>,
  },
  {
    field: "allocated",
    headerName: "Allocated",
    width: 110,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums font-medium text-violet-700">{params.row.allocated}</span>
    ),
  },
  {
    field: "sold",
    headerName: "Sold",
    width: 90,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums font-medium text-emerald-700">{params.row.sold}</span>
    ),
  },
  {
    field: "available",
    headerName: "Available",
    width: 110,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-sky-700">{params.row.available}</span>
    ),
  },
  {
    field: "remaining",
    headerName: "Remaining",
    width: 110,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-teal-700">{params.row.remaining}</span>
    ),
  },
  {
    field: "blocked",
    headerName: "Blocked",
    width: 100,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums font-medium text-rose-700">{params.row.blocked}</span>
    ),
  },
  {
    field: "allocationPercentage",
    headerName: "Alloc %",
    width: 100,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-amber-700">{params.row.allocationPercentage}%</span>
    ),
  },
  {
    field: "utilizationPercentage",
    headerName: "Util %",
    width: 100,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-indigo-700">{params.row.utilizationPercentage}%</span>
    ),
  },
  {
    field: "occupancyPercentage",
    headerName: "Occ %",
    width: 90,
    sortable: false,
    renderCell: (params) => (
      <span className="tabular-nums text-slate-700">{params.row.occupancyPercentage}%</span>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    width: 140,
    sortable: false,
    renderCell: (params) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-tight ring-1 ring-inset",
          allocationStatusTone(params.row.status),
        )}
      >
        {formatStatusLabel(params.row.status)}
      </span>
    ),
  },
];

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
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className={cn("min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide", tone.label)}>
          {label}
        </p>
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", tone.value)}>{value}</p>
    </div>
  );
}

type FilterDraft = {
  propertyIds: string[];
  datePreset: InventoryAllocationDatePreset;
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

export default function InventoryAllocationReportPage() {
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { user } = useAuth();
  const canFilterHotels = canUseCrossHotelReportFilter(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<InventoryAllocationDatePreset>(DEFAULT_DATE_PRESET);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [roomTypeIds, setRoomTypeIds] = useState<number[]>([]);
  const [ratePlanIds, setRatePlanIds] = useState<number[]>([]);
  const [roomOptions, setRoomOptions] = useState<ReportIdOption[]>([]);
  const [ratePlanOptions, setRatePlanOptions] = useState<ReportIdOption[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(INVENTORY_PAGE_SIZE);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] =
    useState<InventoryAllocationReportResponse | null>(null);
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
    void inventoryAllocationReportService
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
            : "Failed to load inventory allocation report";
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

  const handleExport = async (format: ReportExportFormat) => {
    if ((!canFilterHotels && !hotelId) || customRangeInvalid) return;
    setExportMenuOpen(false);
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await inventoryAllocationReportService.exportReport({
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

  if (!canFilterHotels && !hotelId) {
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
                {selectedRoomTypeName || selectedRatePlanName ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
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
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              <MetricCard
                label="Total rooms"
                value={summary.totalRooms}
                icon={Building2}
                tone={{
                  wrap: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
                  icon: "bg-sky-500 text-white",
                  label: "text-sky-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Allocated"
                value={summary.allocatedRooms}
                icon={Layers}
                tone={{
                  wrap: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
                  icon: "bg-violet-600 text-white",
                  label: "text-violet-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Sold"
                value={summary.soldRooms}
                icon={ShoppingBag}
                tone={{
                  wrap: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
                  icon: "bg-emerald-600 text-white",
                  label: "text-emerald-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Available"
                value={summary.availableRooms}
                icon={CheckCircle2}
                tone={{
                  wrap: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
                  icon: "bg-blue-600 text-white",
                  label: "text-blue-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Remaining"
                value={summary.remainingRooms}
                icon={BedDouble}
                tone={{
                  wrap: "border-teal-100 bg-gradient-to-br from-teal-50 to-white",
                  icon: "bg-teal-600 text-white",
                  label: "text-teal-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Blocked"
                value={summary.blockedRooms}
                icon={Ban}
                tone={{
                  wrap: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
                  icon: "bg-rose-500 text-white",
                  label: "text-rose-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Allocation %"
                value={`${summary.allocationPercentage}%`}
                icon={Percent}
                tone={{
                  wrap: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
                  icon: "bg-amber-500 text-white",
                  label: "text-amber-700",
                  value: "text-slate-900",
                }}
              />
              <MetricCard
                label="Utilization %"
                value={`${summary.utilizationPercentage}%`}
                icon={TrendingUp}
                tone={{
                  wrap: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
                  icon: "bg-indigo-600 text-white",
                  label: "text-indigo-700",
                  value: "text-slate-900",
                }}
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
            rows={report?.inventory ?? []}
            columns={inventoryColumns}
            getRowId={(row) =>
              `${row.date}-${row.roomTypeId ?? row.roomType}-${row.ratePlanId ?? row.ratePlan}-${row.hotelName ?? ""}`
            }
            loading={loading}
            paginationMode="server"
            rowCount={report?.page.totalElements ?? 0}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              if (model.page !== page) setPage(model.page);
            }}
            pageSizeOptions={[INVENTORY_PAGE_SIZE]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            localeText={{
              noRowsLabel: "No inventory allocation rows for this period.",
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
