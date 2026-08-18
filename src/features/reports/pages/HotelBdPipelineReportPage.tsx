import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  canFilterHotelBdReportsByUser,
  isSuperAdmin,
} from "@/constants/roles";
import { adminService } from "@/features/admin/services/adminService";
import {
  exportStatusLabel,
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
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  GitBranch,
  LayoutDashboard,
  Loader2,
  X,
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
  tone: "default" | "success" | "warning" | "danger";
  valueKey: keyof NonNullable<HotelBdPipelineReportResponse["funnel"]>;
}[] = [
  { status: "DRAFT", label: "Draft", tone: "default", valueKey: "draft" },
  { status: "UNDER_QC", label: "Under QC", tone: "warning", valueKey: "underQc" },
  {
    status: "QC_REJECTED",
    label: "QC Rejected",
    tone: "danger",
    valueKey: "qcRejected",
  },
  {
    status: "UNDER_ZONAL_REVIEW",
    label: "Under Zonal",
    tone: "warning",
    valueKey: "underZonalReview",
  },
  {
    status: "ZONAL_REJECTED",
    label: "Zonal Rejected",
    tone: "danger",
    valueKey: "zonalRejected",
  },
  { status: "LIVE", label: "Live", tone: "success", valueKey: "live" },
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
  sort: HotelBdPipelineSort;
  direction: "ASC" | "DESC";
  bdUserId: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  status: DEFAULT_STATUS,
  search: "",
  city: "",
  sort: DEFAULT_SORT,
  direction: "DESC",
  bdUserId: "",
};

function getHotelLink(row: HotelBdPipelineRow, isAdmin: boolean): string | null {
  if (!row.hotelId) return null;
  // Super admin: same read-only onboarding wizard as hotel-owner Active → View
  if (isAdmin) {
    return getHotelOnboardingReadOnlyLink(row.hotelId);
  }
  return getHotelOnboardingLink(row.hotelId, row.status);
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
  const { toast, showToast, hideToast } = useToast();

  const [status, setStatus] = useState<HotelBdPipelineStatus>(DEFAULT_STATUS);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<HotelBdPipelineSort>(DEFAULT_SORT);
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [bdUserId, setBdUserId] = useState("");
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
    (sort !== DEFAULT_SORT || direction !== "DESC" ? 1 : 0) +
    (bdUserId ? 1 : 0);

  useEffect(() => {
    if (!canFilterByBd) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await adminService.getUsers({
          role: "HOTEL_BD",
          size: 200,
          status: "ACTIVE",
        });
        if (cancelled) return;
        setBdUsers(
          (response.content || []).map((entry) => ({
            id: String(entry.userId ?? ""),
            label:
              [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim() ||
              entry.email?.trim() ||
              `User ${entry.userId ?? ""}`,
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
          sort: nextSort,
          direction: nextDirection,
          page: nextPage,
          size: PAGE_SIZE,
          bdUserId: nextBdUserId || undefined,
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
    [bdUserId, city, direction, page, search, showToast, sort, status],
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const applyFilters = () => {
    setStatus(draft.status);
    setSearch(draft.search);
    setCity(draft.city);
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
    setSort(DEFAULT_DRAFT.sort);
    setDirection(DEFAULT_DRAFT.direction);
    setBdUserId("");
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
          sort,
          direction,
          bdUserId: bdUserId || undefined,
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

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={GitBranch}
        iconClassName="bg-gradient-to-br from-violet-500 to-indigo-600"
        title="Onboarding Pipeline"
        description="Paginated onboarding pipeline with steps and days stuck"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft({ status, search, city, sort, direction, bdUserId });
                setFilterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            <Link
              to={ROUTES.REPORTS.HOTEL_BD_DASHBOARD}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
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
              value={report.funnel[card.valueKey]}
              active={status === card.status}
              onClick={() => applyStatusFilter(card.status)}
            />
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4" />
            <span>
              {loading && !report
                ? "Loading…"
                : `${totalElements} hotel${totalElements === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hotel
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Step
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Steps
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Done / Left
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Days Stuck
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && !report ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-600" />
                  </td>
                </tr>
              ) : !report?.rows.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No pipeline rows match your filters.
                  </td>
                </tr>
              ) : (
                report.rows.map((row, index) => {
                  const link = getHotelLink(row, isAdmin);
                  const stepMap = new Map(
                    row.steps.map((step) => [step.step, step.status]),
                  );
                  return (
                    <tr
                      key={`${row.hotelId ?? row.hotelCode}-${index}`}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">
                          {row.hotelName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.hotelCode}
                          {row.city ? ` · ${row.city}` : ""}
                          {row.locked ? " · Locked" : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            hotelStatusTone(row.status),
                          )}
                        >
                          {formatStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.currentStep
                          ? formatStatusLabel(row.currentStep)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {STEP_ORDER.map((stepKey) => {
                            const status =
                              stepMap.get(stepKey) ?? "NOT_STARTED";
                            return (
                              <span
                                key={stepKey}
                                title={`${formatStatusLabel(stepKey)}: ${formatStatusLabel(status)}`}
                                className={cn(
                                  "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                  stepTone(status),
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
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {row.completedSteps} / {row.incompleteSteps}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {row.daysStuck != null ? row.daysStuck : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {link ? (
                          <Link
                            to={link}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {isAdmin || !isHotelOnboardingEditable(row.status)
                              ? "View"
                              : "Edit"}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => {
                  const nextPage = page - 1;
                  setPage(nextPage);
                  void loadReport({ page: nextPage });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  void loadReport({ page: nextPage });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
                    BD user (admin)
                  </label>
                  <select
                    value={draft.bdUserId}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        bdUserId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All BD users</option>
                    {bdUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
