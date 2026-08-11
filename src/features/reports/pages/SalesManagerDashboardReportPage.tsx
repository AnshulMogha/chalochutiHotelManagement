import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canFilterSalesManagerReportsByUser } from "@/constants/roles";
import { adminService } from "@/features/admin/services/adminService";
import { SalesManagerTrendChart } from "../components/SalesManagerTrendChart";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportPageHeader,
  SummaryCard,
  agentStatusTone,
  formatChangePercent,
  formatReportDate,
  formatReportMoney,
  formatStatusLabel,
  getSalesManagerActionLink,
  severityTone,
} from "../components/reportUiHelpers";
import {
  salesManagerDashboardReportService,
  type SalesManagerActionInboxItem,
  type SalesManagerAgentSnapshot,
  type SalesManagerDashboardReportResponse,
  type SalesManagerInboxType,
  type SalesManagerPeriodMetric,
  type SalesManagerPeriodMoneyMetric,
} from "../services/salesManagerDashboardReportService";
import type {
  SalesManagerAgencyTier,
  SalesManagerBookingType,
  SalesManagerDateAxis,
  SalesManagerDatePreset,
} from "../services/salesManagerReportTypes";
import {
  AlertCircle,
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

const FUNNEL_STEPS: {
  key: keyof SalesManagerDashboardReportResponse["agentFunnel"];
  label: string;
  tone: string;
  isPercent?: boolean;
}[] = [
  { key: "applied", label: "Applied", tone: "bg-sky-500" },
  { key: "approved", label: "Approved", tone: "bg-indigo-500" },
  { key: "activated", label: "Activated", tone: "bg-violet-500" },
  { key: "firstBooking", label: "First Booking", tone: "bg-emerald-500" },
  { key: "retainedAgents", label: "Retained", tone: "bg-teal-500" },
  { key: "rejected", label: "Rejected", tone: "bg-rose-500" },
];

const HEALTH_ITEMS: {
  key: keyof SalesManagerDashboardReportResponse["agentHealth"];
  label: string;
  tone?: "warning" | "danger";
}[] = [
  { key: "zeroBookingAgents", label: "Zero booking", tone: "warning" },
  { key: "pendingDocuments", label: "Pending documents", tone: "warning" },
  { key: "loggedInToday", label: "Logged in today" },
  { key: "loggedInThisWeek", label: "Logged in this week" },
  { key: "inactiveOver30Days", label: "Inactive 30+ days", tone: "danger" },
  {
    key: "outstandingBalanceAgents",
    label: "Outstanding balance",
    tone: "warning",
  },
  {
    key: "highCancellationAgents",
    label: "High cancellation",
    tone: "danger",
  },
  { key: "lowCollectionAgents", label: "Low collection", tone: "warning" },
  { key: "negativeGrowthAgents", label: "Negative growth", tone: "danger" },
  { key: "highRefundAgents", label: "High refund", tone: "danger" },
];

const INBOX_TABS: { value: SalesManagerInboxType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "HIGH_CANCELLATION", label: "High cancellation" },
  { value: "LOW_COLLECTION", label: "Low collection" },
  { value: "HIGH_OUTSTANDING", label: "High outstanding" },
  { value: "NEW_AGENT_PENDING", label: "Pending approval" },
  { value: "NO_LOGIN_30_DAYS", label: "No login" },
];

const LEADERBOARD_ITEMS: {
  key: keyof SalesManagerDashboardReportResponse["leaderboard"];
  label: string;
}[] = [
  { key: "highestRevenueAgent", label: "Highest revenue" },
  { key: "highestBookingAgent", label: "Most bookings" },
  { key: "bestCollectionAgent", label: "Best collection" },
  { key: "fastestGrowingAgent", label: "Fastest growing" },
  { key: "highestOutstandingAgent", label: "Highest outstanding" },
  { key: "highestCancellationAgent", label: "Highest cancellation" },
];

type FilterDraft = {
  datePreset: SalesManagerDatePreset;
  fromDate: string;
  toDate: string;
  dateAxis: SalesManagerDateAxis;
  bookingType: SalesManagerBookingType;
  stateId: string;
  agencyTier: string;
  salesManagerId: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  dateAxis: DEFAULT_DATE_AXIS,
  bookingType: DEFAULT_BOOKING_TYPE,
  stateId: "",
  agencyTier: "",
  salesManagerId: "",
};

function MetricWithChange({
  label,
  metric,
  formatValue,
}: {
  label: string;
  metric?: SalesManagerPeriodMetric | SalesManagerPeriodMoneyMetric;
  formatValue: (value: number) => string;
}) {
  const current =
    metric && "current" in metric
      ? typeof metric.current === "object"
        ? metric.current.amount
        : metric.current
      : 0;
  const change =
    metric && "changePercent" in metric ? metric.changePercent : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
        {formatValue(current ?? 0)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        vs previous: {formatChangePercent(change)}
      </p>
    </div>
  );
}

function AgentCard({ agent }: { agent: SalesManagerAgentSnapshot }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {agent.agencyName}
          </p>
          <p className="text-xs text-slate-500">
            {agent.agentCode} · {agent.state || "—"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
            agentStatusTone(null, agent.status),
          )}
        >
          {formatStatusLabel(agent.status)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Bookings</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {agent.totalBookings}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Revenue</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {formatReportMoney(agent.grossBookingValue)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Collection</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {agent.collectionPercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-slate-500">Outstanding</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {formatReportMoney(agent.outstanding)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SalesManagerDashboardReportPage() {
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
  const [agencyTier, setAgencyTier] = useState("");
  const [salesManagerId, setSalesManagerId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [inboxTab, setInboxTab] = useState<SalesManagerInboxType | "ALL">(
    "ALL",
  );
  const [inboxSearch, setInboxSearch] = useState("");

  const [report, setReport] =
    useState<SalesManagerDashboardReportResponse | null>(null);
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
    (stateId ? 1 : 0) +
    (agencyTier ? 1 : 0) +
    (salesManagerId ? 1 : 0) +
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
          stateList.map((state) => ({
            id: String(state.id),
            label: state.name,
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
    async (overrides?: Partial<FilterDraft>) => {
      const nextPreset = overrides?.datePreset ?? datePreset;
      const nextFrom = overrides?.fromDate ?? fromDate;
      const nextTo = overrides?.toDate ?? toDate;
      const nextDateAxis = overrides?.dateAxis ?? dateAxis;
      const nextBookingType = overrides?.bookingType ?? bookingType;
      const nextStateId = overrides?.stateId ?? stateId;
      const nextAgencyTier = overrides?.agencyTier ?? agencyTier;
      const nextSalesManagerId = overrides?.salesManagerId ?? salesManagerId;

      if (nextPreset === "CUSTOM" && (!nextFrom || !nextTo)) return;

      setLoading(true);
      setError(null);
      try {
        const data = await salesManagerDashboardReportService.getReport({
          datePreset: nextPreset,
          fromDate: nextPreset === "CUSTOM" ? nextFrom : undefined,
          toDate: nextPreset === "CUSTOM" ? nextTo : undefined,
          dateAxis: nextDateAxis,
          bookingType: nextBookingType,
          stateId: nextStateId || undefined,
          agencyTier: (nextAgencyTier as SalesManagerAgencyTier) || undefined,
          salesManagerId: nextSalesManagerId || undefined,
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
      bookingType,
      dateAxis,
      datePreset,
      fromDate,
      salesManagerId,
      showToast,
      stateId,
      toDate,
    ],
  );

  useEffect(() => {
    if (customRangeInvalid) return;
    void loadReport();
  }, [customRangeInvalid, loadReport]);

  const filteredInbox = useMemo(() => {
    const items = report?.actionInbox ?? [];
    const query = inboxSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (inboxTab !== "ALL" && item.type !== inboxTab) return false;
      if (!query) return true;
      const haystack =
        `${item.agencyName} ${item.title} ${item.state ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [inboxSearch, inboxTab, report?.actionInbox]);

  const funnelCounts = FUNNEL_STEPS.filter((step) => !step.isPercent);
  const funnelTotal = useMemo(() => {
    if (!report?.agentFunnel) return 0;
    return funnelCounts.reduce(
      (sum, step) => sum + (report.agentFunnel[step.key] as number),
      0,
    );
  }, [funnelCounts, report?.agentFunnel]);

  const applyFilters = () => {
    if (draftCustomInvalid) return;
    setDatePreset(draft.datePreset);
    setFromDate(draft.fromDate);
    setToDate(draft.toDate);
    setDateAxis(draft.dateAxis);
    setBookingType(draft.bookingType);
    setStateId(draft.stateId);
    setAgencyTier(draft.agencyTier);
    setSalesManagerId(draft.salesManagerId);
    setFilterOpen(false);
    void loadReport(draft);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setDatePreset(DEFAULT_DRAFT.datePreset);
    setFromDate("");
    setToDate("");
    setDateAxis(DEFAULT_DRAFT.dateAxis);
    setBookingType(DEFAULT_DRAFT.bookingType);
    setStateId("");
    setAgencyTier("");
    setSalesManagerId("");
    setFilterOpen(false);
    void loadReport(DEFAULT_DRAFT);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={LayoutDashboard}
        iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Sales Manager Dashboard"
        description="Portfolio KPIs, agent funnel, trends and action inbox"
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
                  agencyTier,
                  salesManagerId,
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
              to={ROUTES.REPORTS.SALES_MANAGER_AGENTS}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <UserRoundCog className="h-4 w-4" />
              Agent Portfolio
            </Link>
          </div>
        }
      />

      {report?.dateRange?.fromDate && report?.dateRange?.toDate ? (
        <p className="mb-3 text-xs text-slate-500">
          Period ({formatStatusLabel(report.dateAxis || "BOOKING")}):{" "}
          {formatReportDate(report.dateRange.fromDate)} –{" "}
          {formatReportDate(report.dateRange.toDate)}
          {report.scope ? ` · ${formatStatusLabel(report.scope)}` : null}
        </p>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Assigned Agents"
          value={report?.portfolioKpis.assignedAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Active Agents"
          tone="success"
          value={report?.portfolioKpis.activeAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Pending Approvals"
          tone="warning"
          value={report?.portfolioKpis.pendingApprovals ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="New Agents"
          value={report?.portfolioKpis.newAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Suspended"
          tone="danger"
          value={report?.portfolioKpis.suspendedAgents ?? (loading ? "…" : 0)}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryCard
          label="Avg Bookings / Agent"
          value={
            report?.portfolioKpis.averageBookingsPerAgent ?? (loading ? "…" : 0)
          }
        />
        <SummaryCard
          label="Avg Revenue / Agent"
          value={
            report
              ? formatReportMoney(report.portfolioKpis.averageRevenuePerAgent)
              : loading
                ? "…"
                : "—"
          }
        />
        <SummaryCard
          label="Approved → Active"
          tone="success"
          value={
            report
              ? `${report.portfolioKpis.approvedToActiveConversionPercent.toFixed(1)}%`
              : loading
                ? "…"
                : "—"
          }
        />
        <SummaryCard
          label="Active Sub-agents"
          value={
            report?.portfolioKpis.totalActiveSubAgents ?? (loading ? "…" : 0)
          }
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MetricWithChange
          label="Total Bookings"
          metric={report?.bookingKpis.totalBookings}
          formatValue={(value) => String(value)}
        />
        <MetricWithChange
          label="Hotel Bookings"
          metric={report?.bookingKpis.hotelBookings}
          formatValue={(value) => String(value)}
        />
        <MetricWithChange
          label="Package Bookings"
          metric={report?.bookingKpis.packageBookings}
          formatValue={(value) => String(value)}
        />
        <MetricWithChange
          label="Confirmed"
          metric={report?.bookingKpis.confirmedBookings}
          formatValue={(value) => String(value)}
        />
        <MetricWithChange
          label="Cancelled"
          metric={report?.bookingKpis.cancelledBookings}
          formatValue={(value) => String(value)}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricWithChange
          label="Gross Booking Value"
          metric={report?.revenueKpis.grossBookingValue}
          formatValue={(value) => formatReportMoney({ amount: value })}
        />
        <MetricWithChange
          label="Collected Revenue"
          metric={report?.revenueKpis.collectedRevenue}
          formatValue={(value) => formatReportMoney({ amount: value })}
        />
        <MetricWithChange
          label="Outstanding Balance"
          metric={report?.revenueKpis.outstandingBalance}
          formatValue={(value) => formatReportMoney({ amount: value })}
        />
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Collection Rate
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
            {report
              ? `${report.revenueKpis.collectionRate.current.toFixed(1)}%`
              : loading
                ? "…"
                : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Efficiency{" "}
            {report
              ? `${report.revenueKpis.collectionEfficiencyPercent.toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Agent Funnel
            </h2>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {funnelCounts.map((step) => {
              const count = (report?.agentFunnel[step.key] as number) ?? 0;
              const pct =
                funnelTotal > 0 ? Math.round((count / funnelTotal) * 100) : 0;
              return (
                <div
                  key={step.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-600">
                      {step.label}
                    </p>
                    <span className="text-lg font-bold tabular-nums text-slate-900">
                      {loading && !report ? "…" : count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cn("h-full rounded-full", step.tone)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:grid-cols-4">
            <span>
              Applied → Approved:{" "}
              {report?.agentFunnel.appliedToApprovedPercent.toFixed(1) ?? "—"}%
            </span>
            <span>
              Approved → Active:{" "}
              {report?.agentFunnel.approvedToActivatedPercent.toFixed(1) ?? "—"}%
            </span>
            <span>
              Active → First booking:{" "}
              {report?.agentFunnel.activatedToFirstBookingPercent?.toFixed(1) ??
                "—"}
              %
            </span>
            <span>
              First booking → Retained:{" "}
              {report?.agentFunnel.firstBookingToRetainedPercent.toFixed(1) ??
                "—"}
              %
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Agent Health
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {HEALTH_ITEMS.map((item) => {
              const value = report?.agentHealth[item.key] ?? 0;
              return (
                <SummaryCard
                  key={item.key}
                  label={item.label}
                  tone={value > 0 ? item.tone : "default"}
                  value={loading && !report ? "…" : value}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Booking Trend",
            points:
              report?.charts.bookingTrend.map((point) => ({
                date: point.date,
                value: point.count,
              })) ?? [],
            color: "#059669",
            prefix: "",
          },
          {
            title: "Revenue Trend",
            points:
              report?.charts.revenueTrend.map((point) => ({
                date: point.date,
                value: point.amount.amount,
              })) ?? [],
            color: "#2563eb",
            prefix: "₹",
          },
          {
            title: "Collection Trend",
            points:
              report?.charts.collectionTrend.map((point) => ({
                date: point.date,
                value: point.amount.amount,
              })) ?? [],
            color: "#7c3aed",
            prefix: "₹",
          },
        ].map((chart) => (
          <div
            key={chart.title}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {chart.title}
              </h2>
            </div>
            <div className="p-4">
              <SalesManagerTrendChart
                title={chart.title}
                points={chart.points}
                color={chart.color}
                valuePrefix={chart.prefix}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Product Mix</h2>
          </div>
          <div className="space-y-3 p-4 text-sm">
            {[
              {
                label: "Hotel bookings",
                count: report?.productMix.hotelBookings,
                pct: report?.productMix.hotelPercent,
                revenue: report?.productMix.hotelRevenue,
                tone: "bg-sky-500",
              },
              {
                label: "Package bookings",
                count: report?.productMix.packageBookings,
                pct: report?.productMix.packagePercent,
                revenue: report?.productMix.packageRevenue,
                tone: "bg-violet-500",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="tabular-nums text-slate-900">
                    {item.count ?? 0} ({item.pct?.toFixed(1) ?? 0}%)
                  </span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn("h-full rounded-full", item.tone)}
                    style={{ width: `${item.pct ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Revenue: {formatReportMoney(item.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Payment Mix</h2>
          </div>
          <div className="space-y-3 p-4 text-sm">
            {[
              {
                label: "Fully paid",
                count: report?.paymentMix.fullyPaid,
                pct: report?.paymentMix.fullyPaidPercent,
                tone: "bg-emerald-500",
              },
              {
                label: "Partially paid",
                count: report?.paymentMix.partiallyPaid,
                pct: report?.paymentMix.partiallyPaidPercent,
                tone: "bg-amber-500",
              },
              {
                label: "Outstanding",
                count: report?.paymentMix.outstanding,
                pct: report?.paymentMix.outstandingPercent,
                tone: "bg-rose-500",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="tabular-nums text-slate-900">
                    {item.count ?? 0} ({item.pct?.toFixed(1) ?? 0}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn("h-full rounded-full", item.tone)}
                    style={{ width: `${item.pct ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Tier Distribution
            </h2>
          </div>
          <div className="space-y-2 p-4">
            {(report?.agentTierDistribution ?? []).map((tier) => (
              <div key={tier.tier}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {formatStatusLabel(tier.tier)}
                  </span>
                  <span className="tabular-nums text-slate-900">
                    {tier.agents} ({tier.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${tier.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Geographic Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">State</th>
                  <th className="px-4 py-2">Agents</th>
                  <th className="px-4 py-2">Bookings</th>
                  <th className="px-4 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(report?.geographicPerformance ?? []).map((row) => (
                  <tr key={row.stateId} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {row.state}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{row.agents}</td>
                    <td className="px-4 py-2 tabular-nums">{row.bookings}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {formatReportMoney(row.grossBookingValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Top Destinations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Destination</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Bookings</th>
                  <th className="px-4 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(report?.topDestinations ?? []).map((row, index) => (
                  <tr
                    key={`${row.destination}-${row.product}-${index}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {row.destination}
                    </td>
                    <td className="px-4 py-2">{formatStatusLabel(row.product)}</td>
                    <td className="px-4 py-2 tabular-nums">{row.bookings}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {formatReportMoney(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Top Performing Agents
              </h2>
              <div className="space-y-2">
                {(report?.topPerformingAgents ?? []).length ? (
                  report?.topPerformingAgents.map((agent) => (
                    <AgentCard key={agent.agentUserId} agent={agent} />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    No top performers in this period
                  </p>
                )}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Needs Attention
              </h2>
              <div className="space-y-2">
                {(report?.lowPerformingAgents ?? []).length ? (
                  report?.lowPerformingAgents.map((agent) => (
                    <AgentCard key={agent.agentUserId} agent={agent} />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    No low performers flagged
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
          </div>
          <div className="space-y-3 p-4">
            {LEADERBOARD_ITEMS.map((item) => {
              const agent = report?.leaderboard[item.key];
              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  {agent ? (
                    <>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {agent.agencyName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {agent.totalBookings} bookings ·{" "}
                        {formatReportMoney(agent.grossBookingValue)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Action Inbox
            </h2>
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inboxSearch}
                onChange={(event) => setInboxSearch(event.target.value)}
                placeholder="Search agency or title…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {INBOX_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setInboxTab(tab.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  inboxTab === tab.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredInbox.length ? (
            filteredInbox.map((item) => (
              <InboxRow key={`${item.type}-${item.entityId}`} item={item} />
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {loading ? "Loading inbox…" : "No actions in this view"}
            </p>
          )}
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
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.label}
                    </option>
                  ))}
                </select>
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
                  {["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"].map(
                    (tier) => (
                      <option key={tier} value={tier}>
                        {formatStatusLabel(tier)}
                      </option>
                    ),
                  )}
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

function InboxRow({ item }: { item: SalesManagerActionInboxItem }) {
  const link = getSalesManagerActionLink(item.actionUrl, item.onboardingId);

  return (
    <Link
      to={link}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
    >
      <div
        className={cn(
          "mt-0.5 min-w-[72px] rounded-full px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide",
          severityTone(item.severity),
        )}
      >
        {item.severity}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {formatStatusLabel(item.type)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
        <p className="mt-1 text-xs text-slate-500">
          {item.agencyName}
          {item.state ? ` · ${item.state}` : ""}
          {item.amount ? ` · ${formatReportMoney(item.amount)}` : ""}
        </p>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
