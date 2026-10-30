import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  canFilterHotelBdReportsByUser,
  canViewHotelBdReports,
  isReviewerPortalRole,
  isSuperAdmin,
} from "@/constants/roles";
import {
  exportStatusLabel,
  formatReportDate,
  formatStatusLabel,
  getHotelOnboardingLink,
  getHotelOnboardingReadOnlyLink,
  hotelStatusTone,
  isHotelOnboardingEditable,
  ReportPageHeader,
  SummaryCard,
} from "../components/reportUiHelpers";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
  ReportRefreshButton,
} from "../components/ReportFilterDrawer";
import { hotelBdDashboardReportService } from "../services/hotelBdDashboardReportService";
import {
  hotelBdPipelineReportService,
  type HotelBdPipelineReportResponse,
  type HotelBdPipelineRow,
  type HotelBdPipelineSort,
  type HotelBdPipelineStatus,
  type HotelBdStepStatus,
} from "../services/hotelBdPipelineReportService";
import type { ExportJobStatus } from "../services/reportExportService";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Building2,
  ChevronRight,
  CircleX,
  ClipboardCheck,
  Download,
  FilePen,
  GitBranch,
  LayoutDashboard,
  Loader2,
  MapPinned,
  X,
  type LucideIcon,
} from "lucide-react";

const DEFAULT_STATUS: HotelBdPipelineStatus = "ALL";
const DEFAULT_SORT: HotelBdPipelineSort = "UPDATED_AT";
const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: HotelBdPipelineStatus; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PIPELINE", label: "Pipeline" },
  { value: "DRAFT", label: "Draft" },
  { value: "UNDER_QC", label: "Under QC" },
  { value: "QC_REJECTED", label: "QC Rejected" },
  { value: "UNDER_ZONAL_REVIEW", label: "Under Zonal Review" },
  { value: "ZONAL_REJECTED", label: "Zonal Rejected" },
  { value: "LIVE", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
];

const FUNNEL_CARDS: {
  status: HotelBdPipelineStatus;
  label: string;
  tone: "sky" | "indigo" | "success" | "warning" | "danger" | "orange";
  icon: LucideIcon;
  valueKey: keyof NonNullable<HotelBdPipelineReportResponse["funnel"]>;
}[] = [
  {
    status: "DRAFT",
    label: "Draft",
    tone: "sky",
    icon: FilePen,
    valueKey: "draft",
  },
  {
    status: "UNDER_QC",
    label: "Under QC",
    tone: "warning",
    icon: ClipboardCheck,
    valueKey: "underQc",
  },
  {
    status: "QC_REJECTED",
    label: "QC Rejected",
    tone: "danger",
    icon: Ban,
    valueKey: "qcRejected",
  },
  {
    status: "UNDER_ZONAL_REVIEW",
    label: "Under Zonal",
    tone: "indigo",
    icon: MapPinned,
    valueKey: "underZonalReview",
  },
  {
    status: "ZONAL_REJECTED",
    label: "Zonal Rejected",
    tone: "orange",
    icon: CircleX,
    valueKey: "zonalRejected",
  },
  {
    status: "LIVE",
    label: "Live",
    tone: "success",
    icon: BadgeCheck,
    valueKey: "live",
  },
];

const SORT_OPTIONS: { value: HotelBdPipelineSort; label: string }[] = [
  { value: "UPDATED_AT", label: "Updated at" },
  { value: "CREATED_AT", label: "Created at" },
  { value: "HOTEL_CODE", label: "Hotel code" },
  { value: "STATUS", label: "Status" },
  { value: "CURRENT_STEP", label: "Current step" },
];

type FilterDraft = {
  status: HotelBdPipelineStatus;
  search: string;
  city: string;
  state: string;
  sort: HotelBdPipelineSort;
  direction: "ASC" | "DESC";
  bdUserId: string[];
};

const DEFAULT_DRAFT: FilterDraft = {
  status: DEFAULT_STATUS,
  search: "",
  city: "",
  state: "",
  sort: DEFAULT_SORT,
  direction: "DESC",
  bdUserId: [],
};

function formatPipelineDate(value?: string | null): string {
  if (!value) return "—";
  const isoDate = value.includes("T") ? value.slice(0, 10) : value;
  return formatReportDate(isoDate);
}

function withPipelineOrigin(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}from=pipeline`;
}

function getHotelLink(row: HotelBdPipelineRow, isAdmin: boolean): string | null {
  if (!row.hotelId) return null;
  // Super admin: same read-only onboarding wizard as hotel-owner Active → View
  const url = isAdmin
    ? getHotelOnboardingReadOnlyLink(row.hotelId)
    : getHotelOnboardingLink(row.hotelId, row.status);
  return withPipelineOrigin(url);
}

function stepTone(status: HotelBdStepStatus): string {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "IN_PROGRESS") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

const STEP_ORDER = [
  "BASIC_INFO",
  "LOCATION",
  "AMENITIES",
  "ROOMS",
  "MEDIA",
  "POLICIES",
  "DOCUMENTS",
  "FINANCE",
] as const;

export default function HotelBdPipelineReportPage() {
  const { user } = useAuth();
  const userRoles = user?.roles;
  const canFilterByBd = canFilterHotelBdReportsByUser(userRoles);
  const isAdmin = isSuperAdmin(userRoles);
  const hideDashboardLink =
    isReviewerPortalRole(userRoles) && !canViewHotelBdReports(userRoles);
  const { toast, showToast, hideToast } = useToast();

  const [status, setStatus] = useState<HotelBdPipelineStatus>(DEFAULT_STATUS);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sort, setSort] = useState<HotelBdPipelineSort>(DEFAULT_SORT);
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [bdUserId, setBdUserId] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] = useState<HotelBdPipelineReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bdUsers, setBdUsers] = useState<
    Array<{ id: string; label: string }>
  >([]);

  const activeFilterCount =
    (status !== DEFAULT_STATUS ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (city.trim() ? 1 : 0) +
    (stateFilter.trim() ? 1 : 0) +
    (sort !== DEFAULT_SORT || direction !== "DESC" ? 1 : 0) +
    (bdUserId.length ? 1 : 0);

  useEffect(() => {
    if (!canFilterByBd) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await hotelBdDashboardReportService.getBdUsers();
        if (cancelled) return;
        setBdUsers(
          response.map((entry) => ({
            id: String(entry.userId),
            label:
              entry.displayName || entry.email || `User ${entry.userId}`,
          })),
        );
      } catch {
        if (!cancelled) setBdUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFilterByBd]);

  const loadReport = useCallback(
    async (overrides?: Partial<FilterDraft & { page?: number }>) => {
      const nextStatus = overrides?.status ?? status;
      const nextSearch = overrides?.search ?? search;
      const nextCity = overrides?.city ?? city;
      const nextState = overrides?.state ?? stateFilter;
      const nextSort = overrides?.sort ?? sort;
      const nextDirection = overrides?.direction ?? direction;
      const nextBdUserId = overrides?.bdUserId ?? bdUserId;
      const nextPage = overrides?.page ?? page;

      setLoading(true);
      setError(null);
      try {
        const data = await hotelBdPipelineReportService.getReport({
          status: nextStatus,
          search: nextSearch.trim() || undefined,
          city: nextCity.trim() || undefined,
          state: nextState.trim() || undefined,
          sort: nextSort,
          direction: nextDirection,
          page: nextPage,
          size: PAGE_SIZE,
          bdUserId: nextBdUserId.length ? nextBdUserId.join(",") : undefined,
        });
        setReport(data);
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [bdUserId, city, stateFilter, direction, page, search, showToast, sort, status],
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const applyFilters = () => {
    setStatus(draft.status);
    setSearch(draft.search);
    setCity(draft.city);
    setStateFilter(draft.state);
    setSort(draft.sort);
    setDirection(draft.direction);
    setBdUserId(draft.bdUserId);
    setPage(0);
    setFilterOpen(false);
    void loadReport({ ...draft, page: 0 });
  };

  const applyStatusFilter = (nextStatus: HotelBdPipelineStatus) => {
    const resolved = status === nextStatus ? DEFAULT_STATUS : nextStatus;
    setStatus(resolved);
    setDraft((prev) => ({ ...prev, status: resolved }));
    setPage(0);
    void loadReport({ status: resolved, page: 0 });
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setStatus(DEFAULT_DRAFT.status);
    setSearch("");
    setCity("");
    setStateFilter("");
    setSort(DEFAULT_DRAFT.sort);
    setDirection(DEFAULT_DRAFT.direction);
    setBdUserId([]);
    setPage(0);
    setFilterOpen(false);
    void loadReport({ ...DEFAULT_DRAFT, page: 0 });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await hotelBdPipelineReportService.exportReport(
        {
          status,
          search: search.trim() || undefined,
          city: city.trim() || undefined,
          state: stateFilter.trim() || undefined,
          sort,
          direction,
          bdUserId: bdUserId.length ? bdUserId.join(",") : undefined,
        },
        "EXCEL",
        setExportStatus,
      );
      showToast("Pipeline export downloaded.", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const totalPages = report?.page.totalPages ?? 1;
  const totalElements = report?.page.totalElements ?? 0;
  const pipelineRows = (report?.rows ?? []).map((row, index) => ({
    ...row,
    id: `${row.hotelId ?? row.hotelCode}-${index}`,
  }));
  const pipelineColumns: GridColDef<(typeof pipelineRows)[number]>[] = [
    {
      field: "hotelName",
      headerName: "Hotel",
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => (
        <div className="min-w-0 py-1 leading-tight">
          <div className="truncate font-medium text-slate-900">
            {params.row.hotelName}
          </div>
          <div className="truncate text-xs text-slate-500">
            {params.row.hotelCode}
            {params.row.city ? ` · ${params.row.city}` : ""}
            {params.row.state ? `, ${params.row.state}` : ""}
            {params.row.locked ? " · Locked" : ""}
          </div>
        </div>
      ),
    },
    {
      field: "hotelBd",
      headerName: "Hotel BD / Owner",
      width: 160,
      sortable: false,
      renderCell: (params) => params.row.hotelBd || "—",
    },
    {
      field: "qc",
      headerName: "QC",
      width: 140,
      sortable: false,
      renderCell: (params) => params.row.qc || "—",
    },
    {
      field: "zonalManager",
      headerName: "Zonal Manager",
      width: 160,
      sortable: false,
      renderCell: (params) => params.row.zonalManager || "—",
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <span
          className={cn(
            "inline-flex h-auto items-center self-center rounded-full px-2 py-0.5 text-xs font-medium leading-tight ring-1 ring-inset",
            hotelStatusTone(params.row.status),
          )}
        >
          {formatStatusLabel(params.row.status)}
        </span>
      ),
    },
    {
      field: "currentStep",
      headerName: "Current Step",
      width: 150,
      sortable: false,
      renderCell: (params) =>
        params.row.currentStep ? formatStatusLabel(params.row.currentStep) : "—",
    },
    {
      field: "steps",
      headerName: "Steps",
      width: 220,
      sortable: false,
      renderCell: (params) => {
        const stepMap = new Map(
          params.row.steps.map((step) => [step.step, step.status]),
        );
        return (
          <div className="flex max-w-xs flex-wrap gap-1 py-1">
            {STEP_ORDER.map((stepKey) => {
              const stepStatus = stepMap.get(stepKey) ?? "NOT_STARTED";
              return (
                <span
                  key={stepKey}
                  title={`${formatStatusLabel(stepKey)}: ${formatStatusLabel(stepStatus)}`}
                  className={cn(
                    "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ring-1 ring-inset",
                    stepTone(stepStatus),
                  )}
                >
                  {stepKey
                    .split("_")
                    .map((part) => part[0])
                    .join("")}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      field: "completedSteps",
      headerName: "Done / Left",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {params.row.completedSteps} / {params.row.incompleteSteps}
        </span>
      ),
    },
    {
      field: "daysStuck",
      headerName: "Days Stuck",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {params.row.daysStuck != null ? params.row.daysStuck : "—"}
        </span>
      ),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">{formatPipelineDate(params.row.createdAt)}</span>
      ),
    },
    {
      field: "updatedAt",
      headerName: "Updated At",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">{formatPipelineDate(params.row.updatedAt)}</span>
      ),
    },
    {
      field: "qcReviewedAt",
      headerName: "QC Reviewed At",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {formatPipelineDate(params.row.qcReviewedAt)}
        </span>
      ),
    },
    {
      field: "zonalApprovedAt",
      headerName: "Zonal Reviewed At",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums">
          {formatPipelineDate(params.row.zonalApprovedAt)}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 88,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const link = getHotelLink(params.row, isAdmin);
        if (!link) return <span className="text-slate-400">—</span>;
        return (
          <Link
            to={link}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {isAdmin || !isHotelOnboardingEditable(params.row.status)
              ? "View"
              : "Edit"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={GitBranch}
        iconClassName="bg-[#2f3d95]"
        title="Onboarding Pipeline"
        description="Paginated onboarding pipeline with steps and days stuck"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportAppliedRange
              detail={[
                STATUS_OPTIONS.find((option) => option.value === status)?.label ??
                  status,
                search.trim() || null,
                [city.trim(), stateFilter.trim()].filter(Boolean).join(", ") ||
                  null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <ReportFilterButton
              onClick={() => {
                setDraft({ status, search, city, state: stateFilter, sort, direction, bdUserId });
                setFilterOpen(true);
              }}
              activeCount={activeFilterCount}
            />
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || loading}
              aria-label={
                exportStatus
                  ? exportStatusLabel(exportStatus)
                  : "Download report"
              }
              title={
                exportStatus
                  ? exportStatusLabel(exportStatus)
                  : "Download report"
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
              onClick={() => void loadReport()}
              loading={loading}
            />
            {hideDashboardLink ? null : (
              <Link
                to={ROUTES.REPORTS.HOTEL_BD_DASHBOARD}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#263578]"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </div>
        }
      />

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {report?.funnel ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {FUNNEL_CARDS.map((card) => (
            <SummaryCard
              key={card.status}
              label={card.label}
              tone={card.tone}
              icon={card.icon}
              value={report.funnel[card.valueKey]}
              active={status === card.status}
              onClick={() => applyStatusFilter(card.status)}
            />
          ))}
        </div>
      ) : null}

      <DataTable
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {loading && !report
              ? "Loading…"
              : `${formatListCount(totalElements, "hotel")} · Page ${page + 1} of ${Math.max(totalPages, 1)}`}
          </span>
        }
        rows={pipelineRows}
        columns={pipelineColumns}
        getRowId={(row) => row.id}
        loading={loading && !report}
        paginationMode="server"
        rowCount={totalElements}
        paginationModel={{ page, pageSize: PAGE_SIZE }}
        onPaginationModelChange={(model) => {
          if (model.page !== page) {
            setPage(model.page);
            void loadReport({ page: model.page });
          }
        }}
        pageSizeOptions={[PAGE_SIZE]}
        disableRowSelectionOnClick
        disableColumnFilter
        showToolbar
        showExport={false}
        allowHorizontalScroll
        getRowHeight={() => "auto"}
        sx={{
          "& .MuiDataGrid-cell": {
            alignItems: "flex-start",
            whiteSpace: "normal",
            py: "8px",
          },
        }}
        localeText={{ noRowsLabel: "No pipeline rows match your filters." }}
      />

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Hotel
                </label>
                <input
                  type="search"
                  value={draft.search}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Hotel code or property name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  City
                </label>
                <input
                  type="search"
                  value={draft.city}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                  placeholder="City name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  State
                </label>
                <input
                  type="search"
                  value={draft.state}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      state: event.target.value,
                    }))
                  }
                  placeholder="State name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      status: event.target.value as HotelBdPipelineStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Sort by
                </label>
                <select
                  value={draft.sort}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      sort: event.target.value as HotelBdPipelineSort,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Sort direction
                </label>
                <select
                  value={draft.direction}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      direction: event.target.value as "ASC" | "DESC",
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="DESC">Newest first</option>
                  <option value="ASC">Oldest first</option>
                </select>
              </div>
              {canFilterByBd ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    BD users
                  </label>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 px-2 py-2">
                    {bdUsers.length ? (
                      bdUsers.map((entry) => {
                        const checked = draft.bdUserId.includes(entry.id);
                        return (
                          <label
                            key={entry.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-800 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  bdUserId: checked
                                    ? prev.bdUserId.filter((id) => id !== entry.id)
                                    : [...prev.bdUserId, entry.id],
                                }))
                              }
                            />
                            <span className="min-w-0 truncate">{entry.label}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="px-1 py-1 text-xs text-slate-500">
                        No BD users found.
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {draft.bdUserId.length
                      ? `${draft.bdUserId.length} selected`
                      : "None selected shows all BD users"}
                  </p>
                </div>
              ) : null}
            </div>
            <ReportFilterActions onReset={resetFilters} onApply={applyFilters} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
