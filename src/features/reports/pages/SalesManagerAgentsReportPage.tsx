import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canFilterSalesManagerReportsByUser } from "@/constants/roles";
import { adminService } from "@/features/admin/services/adminService";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportPageHeader,
  SummaryCard,
  agentStatusTone,
  formatReportDate,
  formatReportDateTime,
  formatReportMoney,
  formatStatusLabel,
} from "../components/reportUiHelpers";
import {
  salesManagerAgentsReportService,
  type SalesManagerAgentPortfolioRow,
  type SalesManagerAgentsReportResponse,
} from "../services/salesManagerAgentsReportService";
import type {
  SalesManagerAgencyTier,
  SalesManagerAgentStatus,
  SalesManagerAgentsSortField,
  SalesManagerBookingType,
  SalesManagerDateAxis,
  SalesManagerDatePreset,
  SalesManagerSortDir,
} from "../services/salesManagerReportTypes";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  UserRoundCog,
  X,
} from "lucide-react";

const DEFAULT_DATE_PRESET: SalesManagerDatePreset = "THIS_MONTH";
const DEFAULT_DATE_AXIS: SalesManagerDateAxis = "BOOKING";
const DEFAULT_BOOKING_TYPE: SalesManagerBookingType = "ALL";
const DEFAULT_STATUS: SalesManagerAgentStatus | "ALL" = "ALL";
const DEFAULT_SORT: SalesManagerAgentsSortField = "TOTAL_BOOKINGS";
const PAGE_SIZE = 20;

const DATE_PRESET_OPTIONS: {
  value: SalesManagerDatePreset;
  label: string;
}[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom" },
];

const SORT_OPTIONS: { value: SalesManagerAgentsSortField; label: string }[] = [
  { value: "TOTAL_BOOKINGS", label: "Total bookings" },
  { value: "REVENUE", label: "Revenue" },
  { value: "COLLECTION_PERCENT", label: "Collection %" },
  { value: "LAST_BOOKING", label: "Last booking" },
  { value: "LAST_LOGIN", label: "Last login" },
  { value: "ACTIVE_DAYS", label: "Active days" },
  { value: "AGENCY_NAME", label: "Agency name" },
];

type FilterDraft = {
  datePreset: SalesManagerDatePreset;
  fromDate: string;
  toDate: string;
  dateAxis: SalesManagerDateAxis;
  bookingType: SalesManagerBookingType;
  stateId: string;
  state: string;
  agencyTier: string;
  salesManagerId: string;
  search: string;
  agentStatus: SalesManagerAgentStatus | "ALL";
  sort: SalesManagerAgentsSortField;
  sortDir: SalesManagerSortDir;
  onboardedFrom: string;
  onboardedTo: string;
  lastBookingFrom: string;
  lastBookingTo: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  dateAxis: DEFAULT_DATE_AXIS,
  bookingType: DEFAULT_BOOKING_TYPE,
  stateId: "",
  state: "",
  agencyTier: "",
  salesManagerId: "",
  search: "",
  agentStatus: DEFAULT_STATUS,
  sort: DEFAULT_SORT,
  sortDir: "DESC",
  onboardedFrom: "",
  onboardedTo: "",
  lastBookingFrom: "",
  lastBookingTo: "",
};

export default function SalesManagerAgentsReportPage() {
  const { user } = useAuth();
  const canFilterByManager = canFilterSalesManagerReportsByUser(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [datePreset, setDatePreset] =
    useState<SalesManagerDatePreset>(DEFAULT_DATE_PRESET);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateAxis, setDateAxis] =
    useState<SalesManagerDateAxis>(DEFAULT_DATE_AXIS);
  const [bookingType, setBookingType] =
    useState<SalesManagerBookingType>(DEFAULT_BOOKING_TYPE);
  const [stateId, setStateId] = useState("");
  const [state, setState] = useState("");
  const [agencyTier, setAgencyTier] = useState("");
  const [salesManagerId, setSalesManagerId] = useState("");
  const [search, setSearch] = useState("");
  const [agentStatus, setAgentStatus] = useState<
    SalesManagerAgentStatus | "ALL"
  >(DEFAULT_STATUS);
  const [sort, setSort] = useState<SalesManagerAgentsSortField>(DEFAULT_SORT);
  const [sortDir, setSortDir] = useState<SalesManagerSortDir>("DESC");
  const [onboardedFrom, setOnboardedFrom] = useState("");
  const [onboardedTo, setOnboardedTo] = useState("");
  const [lastBookingFrom, setLastBookingFrom] = useState("");
  const [lastBookingTo, setLastBookingTo] = useState("");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);

  const [report, setReport] = useState<SalesManagerAgentsReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managerOptions, setManagerOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [states, setStates] = useState<Array<{ id: string; label: string }>>(
    [],
  );

  const customRangeInvalid =
    datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" && (!draft.fromDate || !draft.toDate);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (dateAxis !== DEFAULT_DATE_AXIS ? 1 : 0) +
    (bookingType !== DEFAULT_BOOKING_TYPE ? 1 : 0) +
    (agentStatus !== DEFAULT_STATUS ? 1 : 0) +
    (sort !== DEFAULT_SORT || sortDir !== "DESC" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (stateId ? 1 : 0) +
    (state.trim() ? 1 : 0) +
    (agencyTier ? 1 : 0) +
    (salesManagerId ? 1 : 0) +
    (onboardedFrom || onboardedTo ? 1 : 0) +
    (lastBookingFrom || lastBookingTo ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0);

  useEffect(() => {
    if (!canFilterByManager) return;
    let cancelled = false;
    adminService
      .getUsers({ role: "SALES_MANAGER", size: 200, status: "ACTIVE" })
      .then((response) => {
        if (cancelled) return;
        setManagerOptions(
          (response.content || []).map((entry) => ({
            id: String(entry.userId ?? entry.id ?? ""),
            label:
              [entry.firstName, entry.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              entry.email?.trim() ||
              `User ${entry.userId ?? entry.id ?? ""}`,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setManagerOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canFilterByManager]);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getStates()
      .then((stateList) => {
        if (cancelled) return;
        setStates(
          stateList.map((item) => ({
            id: String(item.id),
            label: item.name,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReport = useCallback(
    async (overrides?: Partial<FilterDraft & { page?: number }>) => {
      const nextPreset = overrides?.datePreset ?? datePreset;
      const nextFrom = overrides?.fromDate ?? fromDate;
      const nextTo = overrides?.toDate ?? toDate;
      const nextPage = overrides?.page ?? page;

      if (nextPreset === "CUSTOM" && (!nextFrom || !nextTo)) return;

      setLoading(true);
      setError(null);
      try {
        const data = await salesManagerAgentsReportService.getReport({
          datePreset: nextPreset,
          fromDate: nextPreset === "CUSTOM" ? nextFrom : undefined,
          toDate: nextPreset === "CUSTOM" ? nextTo : undefined,
          dateAxis: overrides?.dateAxis ?? dateAxis,
          bookingType: overrides?.bookingType ?? bookingType,
          stateId: (overrides?.stateId ?? stateId) || undefined,
          state: (overrides?.state ?? state).trim() || undefined,
          agencyTier:
            ((overrides?.agencyTier ?? agencyTier) as SalesManagerAgencyTier) ||
            undefined,
          salesManagerId:
            (overrides?.salesManagerId ?? salesManagerId) || undefined,
          search: (overrides?.search ?? search).trim() || undefined,
          agentStatus: overrides?.agentStatus ?? agentStatus,
          sort: overrides?.sort ?? sort,
          sortDir: overrides?.sortDir ?? sortDir,
          onboardedFrom: (overrides?.onboardedFrom ?? onboardedFrom) || undefined,
          onboardedTo: (overrides?.onboardedTo ?? onboardedTo) || undefined,
          lastBookingFrom:
            (overrides?.lastBookingFrom ?? lastBookingFrom) || undefined,
          lastBookingTo: (overrides?.lastBookingTo ?? lastBookingTo) || undefined,
          page: nextPage,
          size: PAGE_SIZE,
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
    [
      agencyTier,
      agentStatus,
      bookingType,
      dateAxis,
      datePreset,
      fromDate,
      lastBookingFrom,
      lastBookingTo,
      onboardedFrom,
      onboardedTo,
      page,
      salesManagerId,
      search,
      showToast,
      sort,
      sortDir,
      state,
      stateId,
      toDate,
    ],
  );

  useEffect(() => {
    if (customRangeInvalid) return;
    void loadReport();
  }, [customRangeInvalid, loadReport]);

  const applyFilters = () => {
    if (draftCustomInvalid) return;
    setDatePreset(draft.datePreset);
    setFromDate(draft.fromDate);
    setToDate(draft.toDate);
    setDateAxis(draft.dateAxis);
    setBookingType(draft.bookingType);
    setStateId(draft.stateId);
    setState(draft.state);
    setAgencyTier(draft.agencyTier);
    setSalesManagerId(draft.salesManagerId);
    setSearch(draft.search);
    setAgentStatus(draft.agentStatus);
    setSort(draft.sort);
    setSortDir(draft.sortDir);
    setOnboardedFrom(draft.onboardedFrom);
    setOnboardedTo(draft.onboardedTo);
    setLastBookingFrom(draft.lastBookingFrom);
    setLastBookingTo(draft.lastBookingTo);
    setPage(0);
    setFilterOpen(false);
    void loadReport({ ...draft, page: 0 });
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setDatePreset(DEFAULT_DRAFT.datePreset);
    setFromDate("");
    setToDate("");
    setDateAxis(DEFAULT_DRAFT.dateAxis);
    setBookingType(DEFAULT_DRAFT.bookingType);
    setStateId("");
    setState("");
    setAgencyTier("");
    setSalesManagerId("");
    setSearch("");
    setAgentStatus(DEFAULT_DRAFT.agentStatus);
    setSort(DEFAULT_DRAFT.sort);
    setSortDir(DEFAULT_DRAFT.sortDir);
    setOnboardedFrom("");
    setOnboardedTo("");
    setLastBookingFrom("");
    setLastBookingTo("");
    setPage(0);
    setFilterOpen(false);
    void loadReport({ ...DEFAULT_DRAFT, page: 0 });
  };

  const totalPages = report?.agents.page.totalPages ?? 0;
  const totalElements = report?.agents.page.totalElements ?? 0;

  const tierSummary = report?.summary.tierDistribution;

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={UserRoundCog}
        iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Agent Portfolio"
        description="Search, filter and review assigned travel agent performance"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft({
                  datePreset,
                  fromDate,
                  toDate,
                  dateAxis,
                  bookingType,
                  stateId,
                  state,
                  agencyTier,
                  salesManagerId,
                  search,
                  agentStatus,
                  sort,
                  sortDir,
                  onboardedFrom,
                  onboardedTo,
                  lastBookingFrom,
                  lastBookingTo,
                });
                setFilterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || customRangeInvalid}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
            <Link
              to={ROUTES.REPORTS.SALES_MANAGER_DASHBOARD}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(0);
                void loadReport({ search: event.currentTarget.value, page: 0 });
              }
            }}
            placeholder="Search agency, email or contact…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm shadow-sm"
          />
        </div>
        {report?.dateRange?.fromDate && report?.dateRange?.toDate ? (
          <p className="text-xs text-slate-500">
            {formatReportDate(report.dateRange.fromDate)} –{" "}
            {formatReportDate(report.dateRange.toDate)}
            {report.metricWindow
              ? ` · ${formatStatusLabel(report.metricWindow)} metrics`
              : null}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Total Agents"
          value={report?.summary.totalAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Active"
          tone="success"
          value={report?.summary.activeAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Inactive"
          value={report?.summary.inactiveAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Zero Booking"
          tone="warning"
          value={report?.summary.zeroBookingAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Suspended"
          tone="danger"
          value={report?.summary.suspendedAgents ?? (loading ? "…" : 0)}
        />
      </div>

      {tierSummary ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(
            [
              ["Bronze", tierSummary.bronze],
              ["Silver", tierSummary.silver],
              ["Gold", tierSummary.gold],
              ["Platinum", tierSummary.platinum],
              ["Diamond", tierSummary.diamond],
            ] as const
          ).map(([label, value]) => (
            <SummaryCard
              key={label}
              label={label}
              value={loading && !report ? "…" : value}
            />
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Quality</th>
              </tr>
            </thead>
            <tbody>
              {(report?.agents.content ?? []).map((row) => (
                <AgentRow key={row.agentId} row={row} />
              ))}
              {!loading && !(report?.agents.content.length ?? 0) ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No agents match the current filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            {totalElements} agent{totalElements === 1 ? "" : "s"}
            {report?.agents.page.sort
              ? ` · sorted by ${formatStatusLabel(report.agents.page.sort)} (${report.agents.page.direction})`
              : null}
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
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-xs tabular-nums text-slate-600">
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                void loadReport({ page: nextPage });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filterOpen ? (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <FilterField label="Search">
                <input
                  type="text"
                  value={draft.search}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Agency, email, contact"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </FilterField>
              <FilterField label="Date preset">
                <select
                  value={draft.datePreset}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: event.target.value as SalesManagerDatePreset,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {DATE_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              {draft.datePreset === "CUSTOM" ? (
                <div className="grid grid-cols-2 gap-2">
                  <FilterField label="From">
                    <input
                      type="date"
                      value={draft.fromDate}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          fromDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </FilterField>
                  <FilterField label="To">
                    <input
                      type="date"
                      value={draft.toDate}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          toDate: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </FilterField>
                </div>
              ) : null}
              <FilterField label="Date axis">
                <select
                  value={draft.dateAxis}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dateAxis: event.target.value as SalesManagerDateAxis,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="BOOKING">Booking date</option>
                  <option value="TRAVEL">Travel date</option>
                </select>
              </FilterField>
              <FilterField label="Booking type">
                <select
                  value={draft.bookingType}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      bookingType: event.target
                        .value as SalesManagerBookingType,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="PACKAGE">Package</option>
                </select>
              </FilterField>
              <FilterField label="Agent status">
                <select
                  value={draft.agentStatus}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      agentStatus: event.target
                        .value as SalesManagerAgentStatus | "ALL",
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {(report?.filters?.status ?? [
                    "ALL",
                    "ACTIVE",
                    "INACTIVE",
                    "ZERO_BOOKING",
                    "LOW_COLLECTION",
                    "HIGH_OUTSTANDING",
                    "SUSPENDED",
                  ]).map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="State">
                <select
                  value={draft.stateId}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      stateId: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All states</option>
                  {states.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="State name / code">
                <input
                  type="text"
                  value={draft.state}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      state: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </FilterField>
              <FilterField label="Agency tier">
                <select
                  value={draft.agencyTier}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      agencyTier: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All tiers</option>
                  {(report?.filters?.tier ?? [
                    "BRONZE",
                    "SILVER",
                    "GOLD",
                    "PLATINUM",
                    "DIAMOND",
                  ]).map((tier) => (
                    <option key={tier} value={tier}>
                      {formatStatusLabel(tier)}
                    </option>
                  ))}
                </select>
              </FilterField>
              {canFilterByManager ? (
                <FilterField label="Sales manager">
                  <select
                    value={draft.salesManagerId}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        salesManagerId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All managers</option>
                    {managerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
              ) : null}
              <FilterField label="Sort by">
                <select
                  value={draft.sort}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      sort: event.target.value as SalesManagerAgentsSortField,
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
              </FilterField>
              <FilterField label="Sort direction">
                <select
                  value={draft.sortDir}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      sortDir: event.target.value as SalesManagerSortDir,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </FilterField>
              <div className="grid grid-cols-2 gap-2">
                <FilterField label="Onboarded from">
                  <input
                    type="date"
                    value={draft.onboardedFrom}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        onboardedFrom: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </FilterField>
                <FilterField label="Onboarded to">
                  <input
                    type="date"
                    value={draft.onboardedTo}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        onboardedTo: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </FilterField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FilterField label="Last booking from">
                  <input
                    type="date"
                    value={draft.lastBookingFrom}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        lastBookingFrom: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </FilterField>
                <FilterField label="Last booking to">
                  <input
                    type="date"
                    value={draft.lastBookingTo}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        lastBookingTo: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </FilterField>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
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
                disabled={draftCustomInvalid}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function AgentRow({ row }: { row: SalesManagerAgentPortfolioRow }) {
  return (
    <tr className="border-t border-slate-100 align-top hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">{row.agency.name}</p>
        <p className="text-xs text-slate-500">
          {row.agentCode}
          {row.agency.contactPerson ? ` · ${row.agency.contactPerson}` : ""}
        </p>
        {row.agency.email ? (
          <p className="text-xs text-slate-500">{row.agency.email}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-slate-700">
        <p>{row.location.state || "—"}</p>
        <p className="text-xs text-slate-500">{row.location.city || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {row.tier.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
            agentStatusTone(row.status.color, row.status.code),
          )}
        >
          {row.status.label}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-slate-800">
        <p className="font-semibold">{row.bookings.total}</p>
        <p className="text-xs text-slate-500">
          H {row.bookings.hotel} · P {row.bookings.package}
        </p>
        <p className="text-xs text-slate-500">
          {row.bookings.confirmed} confirmed · {row.bookings.cancelled}{" "}
          cancelled
        </p>
      </td>
      <td className="px-4 py-3 tabular-nums text-slate-800">
        <p className="font-semibold">
          {formatReportMoney(row.revenue.grossBookingValue)}
        </p>
        <p className="text-xs text-slate-500">
          Collected {formatReportMoney(row.revenue.collected)}
        </p>
        <p className="text-xs text-slate-500">
          Outstanding {formatReportMoney(row.revenue.outstanding)}
        </p>
      </td>
      <td className="px-4 py-3 tabular-nums text-slate-800">
        <p className="font-semibold">
          {row.revenue.collectionPercent.toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500">
          ABV {formatReportMoney(row.revenue.averageBookingValue)}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <p className="text-xs">
          Last booking: {formatReportDateTime(row.activity.lastBookingAt)}
        </p>
        <p className="text-xs">
          Last login: {formatReportDateTime(row.activity.lastLoginAt)}
        </p>
        <p className="text-xs text-slate-500">
          Active {row.activity.activeDays} days
          {row.activity.daysSinceLastBooking != null
            ? ` · ${row.activity.daysSinceLastBooking}d since booking`
            : ""}
        </p>
      </td>
      <td className="px-4 py-3 tabular-nums text-slate-700">
        <p className="text-xs">
          Cancel {row.quality.cancellationPercent.toFixed(1)}%
        </p>
        <p className="text-xs">Refund {row.quality.refundPercent.toFixed(1)}%</p>
      </td>
    </tr>
  );
}
