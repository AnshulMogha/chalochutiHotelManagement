import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { toPng } from "html-to-image";
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
  agentStatusTone,
  formatChangePercent,
  formatReportDate,
  formatReportMoney,
  formatStatusLabel,
  isoToReportDateText,
  isValidCustomDateRange,
  severityTone,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
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
  AlertTriangle,
  BadgeCheck,
  Ban,
  Banknote,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Download,
  Filter,
  Handshake,
  LayoutDashboard,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRoundCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  bar: string;
  isPercent?: boolean;
}[] = [
  { key: "applied", label: "Applied", tone: "text-sky-700", bar: "bg-sky-500" },
  {
    key: "approved",
    label: "Approved",
    tone: "text-indigo-700",
    bar: "bg-indigo-500",
  },
  {
    key: "activated",
    label: "Activated",
    tone: "text-violet-700",
    bar: "bg-violet-500",
  },
  {
    key: "firstBooking",
    label: "First Booking",
    tone: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  {
    key: "retainedAgents",
    label: "Retained",
    tone: "text-teal-700",
    bar: "bg-teal-500",
  },
  {
    key: "rejected",
    label: "Rejected",
    tone: "text-rose-700",
    bar: "bg-rose-500",
  },
];

const HEALTH_ITEMS: {
  key: keyof SalesManagerDashboardReportResponse["agentHealth"];
  label: string;
  tone?: "warning" | "danger";
  icon: LucideIcon;
}[] = [
  {
    key: "zeroBookingAgents",
    label: "Zero booking",
    tone: "warning",
    icon: BookOpen,
  },
  {
    key: "pendingDocuments",
    label: "Pending documents",
    tone: "warning",
    icon: AlertTriangle,
  },
  { key: "loggedInToday", label: "Logged in today", icon: UserCheck },
  { key: "loggedInThisWeek", label: "Logged in this week", icon: Users },
  {
    key: "inactiveOver30Days",
    label: "Inactive 30+ days",
    tone: "danger",
    icon: Ban,
  },
  {
    key: "outstandingBalanceAgents",
    label: "Outstanding balance",
    tone: "warning",
    icon: CircleDollarSign,
  },
  {
    key: "highCancellationAgents",
    label: "High cancellation",
    tone: "danger",
    icon: ShieldAlert,
  },
  {
    key: "lowCollectionAgents",
    label: "Low collection",
    tone: "warning",
    icon: Percent,
  },
  {
    key: "negativeGrowthAgents",
    label: "Negative growth",
    tone: "danger",
    icon: TrendingUp,
  },
  {
    key: "highRefundAgents",
    label: "High refund",
    tone: "danger",
    icon: Wallet,
  },
];

const INBOX_TABS: { value: SalesManagerInboxType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "HIGH_CANCELLATION", label: "High cancellation" },
  { value: "LOW_COLLECTION", label: "Low collection" },
  { value: "HIGH_OUTSTANDING", label: "High outstanding" },
  { value: "NEW_AGENT_PENDING", label: "Pending approval" },
  { value: "ZERO_BOOKING_AGENT", label: "Zero booking" },
  { value: "NO_LOGIN_30_DAYS", label: "No login" },
];

type DashboardTab =
  | "portfolio"
  | "bookings"
  | "revenue"
  | "pipeline"
  | "leaderboard"
  | "rankings"
  | "analytics"
  | "actions";

const DASHBOARD_TABS: { value: DashboardTab; label: string }[] = [
  { value: "portfolio", label: "Portfolio" },
  { value: "bookings", label: "Bookings" },
  { value: "revenue", label: "Revenue" },
  { value: "pipeline", label: "Pipeline" },
  { value: "leaderboard", label: "Leaderboard" },
  { value: "rankings", label: "Rankings" },
  { value: "analytics", label: "Analytics" },
  { value: "actions", label: "Action Inbox" },
];

const LEADERBOARD_ITEMS: {
  key: keyof SalesManagerDashboardReportResponse["leaderboard"];
  label: string;
  icon: LucideIcon;
  group: "top" | "watch";
  metric: (agent: SalesManagerAgentSnapshot) => string;
  subMetric?: (agent: SalesManagerAgentSnapshot) => string;
}[] = [
  {
    key: "highestRevenueAgent",
    label: "Highest revenue",
    icon: CircleDollarSign,
    group: "top",
    metric: (agent) => formatReportMoney(agent.grossBookingValue),
    subMetric: (agent) => `${agent.totalBookings} bookings`,
  },
  {
    key: "highestBookingAgent",
    label: "Most bookings",
    icon: BookOpen,
    group: "top",
    metric: (agent) => String(agent.totalBookings),
    subMetric: (agent) =>
      `H ${agent.hotelBookings} · P ${agent.packageBookings}`,
  },
  {
    key: "bestCollectionAgent",
    label: "Best collection",
    icon: Percent,
    group: "top",
    metric: (agent) => `${agent.collectionPercent.toFixed(1)}%`,
    subMetric: (agent) => formatReportMoney(agent.grossBookingValue),
  },
  {
    key: "fastestGrowingAgent",
    label: "Fastest growing",
    icon: TrendingUp,
    group: "top",
    metric: (agent) => `${agent.activeDays} days`,
    subMetric: (agent) => formatReportMoney(agent.grossBookingValue),
  },
  {
    key: "highestOutstandingAgent",
    label: "Highest outstanding",
    icon: AlertTriangle,
    group: "watch",
    metric: (agent) => formatReportMoney(agent.outstanding),
    subMetric: (agent) => `${agent.collectionPercent.toFixed(1)}% collected`,
  },
  {
    key: "highestCancellationAgent",
    label: "Highest cancellation",
    icon: Ban,
    group: "watch",
    metric: (agent) => String(agent.totalBookings),
    subMetric: (agent) => agent.state || agent.agentCode,
  },
];

function formatDisplayName(value?: string | null): string {
  if (!value?.trim()) return "—";
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function ReportDataTable({
  columns,
  rows,
  emptyMessage,
  loading,
}: {
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, ReactNode>>;
  emptyMessage: string;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-2.5",
                  column.align === "right" && "text-right",
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr
                key={String(row.id ?? index)}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-2.5 text-slate-700",
                      column.align === "right" && "text-right tabular-nums",
                      column.key === columns[0].key &&
                        "font-medium text-slate-900",
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-slate-400"
              >
                {loading ? "Loading…" : emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyPanelState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

function LeaderboardPanel({
  leaderboard,
  loading,
}: {
  leaderboard: SalesManagerDashboardReportResponse["leaderboard"] | undefined;
  loading: boolean;
}) {
  const groups: Array<{ id: "top" | "watch"; title: string }> = [
    { id: "top", title: "Top performers" },
    { id: "watch", title: "Needs review" },
  ];

  return (
    <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
      {groups.map((group) => {
        const items = LEADERBOARD_ITEMS.filter(
          (item) => item.group === group.id,
        );
        return (
          <div key={group.id} className="min-w-0">
            <p className="bg-slate-50/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group.title}
            </p>
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const agent = leaderboard?.[item.key];
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                        group.id === "top"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        {item.label}
                      </p>
                      {agent ? (
                        <>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {agent.agencyName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {agent.agentCode}
                            {agent.state ? ` · ${agent.state}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">
                          {loading ? "Loading…" : "No agent"}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-slate-900">
                        {agent ? item.metric(agent) : "—"}
                      </p>
                      {agent && item.subMetric ? (
                        <p className="text-[10px] text-slate-500">
                          {item.subMetric(agent)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

function SectionPanel({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
  actions,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b border-slate-100",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        <div className="min-w-0">
          <h2
            className={cn(
              "font-semibold text-slate-900",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className={cn(compact ? "p-3" : "p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: {
      wrap: "border-slate-200 bg-slate-50/70",
      value: "text-slate-900",
    },
    success: {
      wrap: "border-emerald-200 bg-emerald-50/80",
      value: "text-emerald-900",
    },
    warning: {
      wrap: "border-amber-200 bg-amber-50/80",
      value: "text-amber-900",
    },
    danger: {
      wrap: "border-rose-200 bg-rose-50/80",
      value: "text-rose-900",
    },
    info: {
      wrap: "border-sky-200 bg-sky-50/80",
      value: "text-sky-900",
    },
  }[tone];

  return (
    <div className={cn("rounded-md border px-2 py-1.5", tones.wrap)}>
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className={cn("h-2.5 w-2.5 shrink-0 opacity-60", tones.value)} />
      </div>
      <p
        className={cn(
          "mt-0.5 font-bold tabular-nums leading-tight",
          typeof value === "string" && value.length > 12
            ? "text-xs"
            : "text-sm",
          tones.value,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function MetricWithChange({
  label,
  metric,
  formatValue,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  metric?: SalesManagerPeriodMetric | SalesManagerPeriodMoneyMetric;
  formatValue: (value: number) => string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const current =
    metric && "current" in metric
      ? typeof metric.current === "object"
        ? metric.current.amount
        : metric.current
      : 0;
  const change =
    metric && "changePercent" in metric ? metric.changePercent : null;
  const changeText = formatChangePercent(change);
  const changePositive =
    typeof change === "number" ? change > 0 : changeText.startsWith("+");
  const changeNegative =
    typeof change === "number" ? change < 0 : changeText.startsWith("-");

  return (
    <StatTile
      label={label}
      value={formatValue(current ?? 0)}
      icon={Icon}
      tone={tone}
      hint={
        change == null
          ? "vs previous: —"
          : `vs previous: ${changeText}${
              changePositive ? " ↑" : changeNegative ? " ↓" : ""
            }`
      }
    />
  );
}

function AgentCard({ agent }: { agent: SalesManagerAgentSnapshot }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">
            {agent.agencyName}
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {agent.agentCode}
            {agent.state ? ` · ${agent.state}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset",
            agentStatusTone(null, agent.status),
          )}
        >
          {formatStatusLabel(agent.status)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-200/80 pt-2 text-center text-[10px]">
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
          <p className="text-slate-500">OTA Net</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {formatReportMoney(agent.otaNetRevenue)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Agency Comm.</p>
          <p className="font-semibold tabular-nums text-slate-800">
            {formatReportMoney(agent.agencyCommission)}
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
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [inboxTab, setInboxTab] = useState<SalesManagerInboxType | "ALL">(
    "ALL",
  );
  const [inboxSearch, setInboxSearch] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("portfolio");
  const analyticsCaptureRef = useRef<HTMLDivElement>(null);
  const [capturingAnalytics, setCapturingAnalytics] = useState(false);

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

  const customRangeInvalid = datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

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
    setDateAxis(nextDraft.dateAxis);
    setBookingType(nextDraft.bookingType);
    setStateId(nextDraft.stateId);
    setAgencyTier(nextDraft.agencyTier);
    setSalesManagerId(nextDraft.salesManagerId);
    setFilterOpen(false);
    void loadReport(nextDraft);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
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

  const downloadAnalyticsPng = async () => {
    const node = analyticsCaptureRef.current;
    if (!node) {
      showToast("Analytics view is not ready to capture", "error");
      return;
    }
    if (!report) {
      showToast("Load the dashboard before downloading", "error");
      return;
    }
    setCapturingAnalytics(true);
    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(undefined)),
      );
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: "#f8fafc",
        filter: (element) => {
          if (!(element instanceof HTMLElement)) return true;
          return !element.dataset.excludeFromCapture;
        },
      });
      const from = report.dateRange.fromDate || "from";
      const to = report.dateRange.toDate || "to";
      const link = document.createElement("a");
      link.download = `sales-manager-analytics-${from}-to-${to}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Analytics image downloaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to capture analytics page", "error");
    } finally {
      setCapturingAnalytics(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={LayoutDashboard}
        iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Sales Manager Dashboard"
        description={
          report?.dateRange?.fromDate && report?.dateRange?.toDate
            ? `${formatReportDate(report.dateRange.fromDate)} – ${formatReportDate(report.dateRange.toDate)}${
                report.scope ? ` · ${formatStatusLabel(report.scope)}` : ""
              } · ${formatStatusLabel(report.dateAxis || "BOOKING")} period`
            : undefined
        }
        descriptionClassName="truncate text-xs font-bold text-slate-800"
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
                setCustomFromText(isoToReportDateText(fromDate));
                setCustomToText(isoToReportDateText(toDate));
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
            {activeTab === "analytics" ? (
              <button
                type="button"
                onClick={() => void downloadAnalyticsPng()}
                disabled={capturingAnalytics || loading || !report}
                aria-label={
                  capturingAnalytics
                    ? "Capturing analytics page"
                    : "Download analytics page"
                }
                title={
                  capturingAnalytics ? "Capturing…" : "Download analytics page"
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {capturingAnalytics ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            ) : null}
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

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm">
        <div className="flex min-w-max gap-1">
          {DASHBOARD_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                activeTab === item.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "portfolio" ? (
        <div className="mb-4">
          <SectionPanel
            compact
            title="Portfolio"
            subtitle="Agent status and productivity"
            bodyClassName="space-y-2.5"
          >
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Agent status
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                <StatTile
                  label="Assigned"
                  icon={Users}
                  value={
                    report?.portfolioKpis.assignedAgents ?? (loading ? "…" : 0)
                  }
                />
                <StatTile
                  label="Active"
                  icon={UserCheck}
                  tone="success"
                  value={
                    report?.portfolioKpis.activeAgents ?? (loading ? "…" : 0)
                  }
                />
                <StatTile
                  label="Inactive"
                  icon={Users}
                  value={
                    report?.portfolioKpis.inactiveAgents ?? (loading ? "…" : 0)
                  }
                />
                <StatTile
                  label="Pending"
                  icon={UserPlus}
                  tone="warning"
                  value={
                    report?.portfolioKpis.pendingApprovals ??
                    (loading ? "…" : 0)
                  }
                />
                <StatTile
                  label="New Agents"
                  icon={BadgeCheck}
                  tone="info"
                  value={report?.portfolioKpis.newAgents ?? (loading ? "…" : 0)}
                />
                <StatTile
                  label="Suspended"
                  icon={Ban}
                  tone="danger"
                  value={
                    report?.portfolioKpis.suspendedAgents ?? (loading ? "…" : 0)
                  }
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Productivity
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <StatTile
                  label="Avg Bookings / Agent"
                  icon={BookOpen}
                  value={
                    report?.portfolioKpis.averageBookingsPerAgent ??
                    (loading ? "…" : 0)
                  }
                />
                <StatTile
                  label="Avg Revenue / Agent"
                  icon={Banknote}
                  value={
                    report
                      ? formatReportMoney(
                          report.portfolioKpis.averageRevenuePerAgent,
                        )
                      : loading
                        ? "…"
                        : "—"
                  }
                />
                <StatTile
                  label="Approved → Active"
                  icon={TrendingUp}
                  tone="success"
                  value={
                    report
                      ? `${report.portfolioKpis.approvedToActiveConversionPercent.toFixed(1)}%`
                      : loading
                        ? "…"
                        : "—"
                  }
                />
                <StatTile
                  label="Active Sub-agents"
                  icon={Handshake}
                  value={
                    report?.portfolioKpis.totalActiveSubAgents ??
                    (loading ? "…" : 0)
                  }
                />
              </div>
            </div>
          </SectionPanel>
        </div>
      ) : null}

      {activeTab === "bookings" ? (
        <div className="mb-4">
          <SectionPanel
            compact
            title="Bookings"
            subtitle="Volume in selected period"
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              <MetricWithChange
                label="Total"
                icon={BookOpen}
                tone="info"
                metric={report?.bookingKpis.totalBookings}
                formatValue={(value) => String(value)}
              />
              <MetricWithChange
                label="Hotel"
                icon={LayoutDashboard}
                metric={report?.bookingKpis.hotelBookings}
                formatValue={(value) => String(value)}
              />
              <MetricWithChange
                label="Package"
                icon={Package}
                metric={report?.bookingKpis.packageBookings}
                formatValue={(value) => String(value)}
              />
              <MetricWithChange
                label="Confirmed"
                icon={BadgeCheck}
                tone="success"
                metric={report?.bookingKpis.confirmedBookings}
                formatValue={(value) => String(value)}
              />
              <MetricWithChange
                label="Cancelled"
                icon={Ban}
                tone="danger"
                metric={report?.bookingKpis.cancelledBookings}
                formatValue={(value) => String(value)}
              />
            </div>
          </SectionPanel>
        </div>
      ) : null}

      {activeTab === "revenue" ? (
        <div className="mb-4">
          <SectionPanel
            compact
            title="Revenue"
            subtitle="Collections, OTA earnings, and outstanding"
            bodyClassName="space-y-2.5"
          >
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Core metrics
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
                <MetricWithChange
                  label="Gross Value"
                  icon={CircleDollarSign}
                  tone="info"
                  metric={report?.revenueKpis.grossBookingValue}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <MetricWithChange
                  label="Collected"
                  icon={Wallet}
                  tone="success"
                  metric={report?.revenueKpis.collectedRevenue}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <MetricWithChange
                  label="OTA Revenue"
                  icon={TrendingUp}
                  tone="info"
                  metric={report?.revenueKpis.otaRevenue}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <MetricWithChange
                  label="Agency Comm."
                  icon={Handshake}
                  tone="success"
                  metric={report?.revenueKpis.agencyCommission}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <MetricWithChange
                  label="Outstanding"
                  icon={AlertTriangle}
                  tone="warning"
                  metric={report?.revenueKpis.outstandingBalance}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <StatTile
                  label="Collection Rate"
                  icon={Percent}
                  tone="success"
                  value={
                    report
                      ? `${report.revenueKpis.collectionRate.current.toFixed(1)}%`
                      : loading
                        ? "…"
                        : "—"
                  }
                  hint={
                    report
                      ? `Efficiency ${report.revenueKpis.collectionEfficiencyPercent.toFixed(1)}%`
                      : undefined
                  }
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Additional
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
                <MetricWithChange
                  label="Overdue"
                  icon={AlertCircle}
                  tone="danger"
                  metric={report?.revenueKpis.overdueBalance}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <MetricWithChange
                  label="Refunds"
                  icon={RefreshCw}
                  metric={report?.revenueKpis.refundAmount}
                  formatValue={(value) => formatReportMoney({ amount: value })}
                />
                <StatTile
                  label="Avg Booking"
                  icon={Banknote}
                  value={
                    report
                      ? formatReportMoney(
                          report.revenueKpis.averageBookingValue,
                        )
                      : loading
                        ? "…"
                        : "—"
                  }
                />
                <StatTile
                  label="Hotel Revenue"
                  icon={LayoutDashboard}
                  value={
                    report
                      ? formatReportMoney(report.revenueKpis.hotelRevenue)
                      : loading
                        ? "…"
                        : "—"
                  }
                />
                <StatTile
                  label="Package Revenue"
                  icon={Package}
                  value={
                    report
                      ? formatReportMoney(report.revenueKpis.packageRevenue)
                      : loading
                        ? "…"
                        : "—"
                  }
                />
                <StatTile
                  label="Outstanding Days"
                  icon={CalendarDays}
                  value={
                    report
                      ? `${report.revenueKpis.averageOutstandingDays.toFixed(0)}d`
                      : loading
                        ? "…"
                        : "—"
                  }
                  hint={
                    report
                      ? `Overdue ${report.revenueKpis.overduePercent.toFixed(1)}%`
                      : undefined
                  }
                />
              </div>
            </div>
          </SectionPanel>
        </div>
      ) : null}

      {activeTab === "pipeline" ? (
        <div className="mb-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <SectionPanel
              compact
              title="Agent Funnel"
              subtitle="Onboarding pipeline conversion"
              bodyClassName="space-y-3"
            >
              <div className="space-y-2">
                {funnelCounts.map((step) => {
                  const count = (report?.agentFunnel[step.key] as number) ?? 0;
                  const pct =
                    funnelTotal > 0
                      ? Math.round((count / funnelTotal) * 100)
                      : 0;
                  return (
                    <div key={step.key} className="flex items-center gap-2">
                      <div className="w-20 shrink-0">
                        <p
                          className={cn("text-[11px] font-semibold", step.tone)}
                        >
                          {step.label}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn("h-full rounded-full", step.bar)}
                            style={{
                              width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-slate-900">
                        {loading && !report ? "…" : count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2.5">
                {[
                  {
                    label: "Applied → Approved",
                    value: report?.agentFunnel.appliedToApprovedPercent,
                  },
                  {
                    label: "Approved → Active",
                    value: report?.agentFunnel.approvedToActivatedPercent,
                  },
                  {
                    label: "Active → First booking",
                    value: report?.agentFunnel.activatedToFirstBookingPercent,
                  },
                  {
                    label: "First booking → Retained",
                    value: report?.agentFunnel.firstBookingToRetainedPercent,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md bg-slate-50 px-2 py-1.5"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-900">
                      {item.value != null ? `${item.value.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </SectionPanel>

            <SectionPanel
              compact
              title="Agent Health"
              subtitle="Risk and activity signals"
              bodyClassName="grid grid-cols-2 gap-1.5"
            >
              {HEALTH_ITEMS.map((item) => {
                const value = report?.agentHealth[item.key] ?? 0;
                const Icon = item.icon;
                const active = value > 0;
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1.5",
                      active && item.tone === "danger"
                        ? "border-rose-200 bg-rose-50/80"
                        : active && item.tone === "warning"
                          ? "border-amber-200 bg-amber-50/80"
                          : "border-slate-200 bg-slate-50/60",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-2.5 w-2.5 shrink-0",
                        active && item.tone === "danger"
                          ? "text-rose-700"
                          : active && item.tone === "warning"
                            ? "text-amber-700"
                            : "text-slate-400",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-medium text-slate-500">
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          active && item.tone === "danger"
                            ? "text-rose-800"
                            : active && item.tone === "warning"
                              ? "text-amber-800"
                              : "text-slate-900",
                        )}
                      >
                        {loading && !report ? "…" : value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </SectionPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "leaderboard" ? (
        <div className="mb-4">
          <SectionPanel
            compact
            title="Leaderboard"
            subtitle="Top agent by category"
            bodyClassName="p-0"
            actions={
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            }
          >
            <LeaderboardPanel
              leaderboard={report?.leaderboard}
              loading={loading}
            />
          </SectionPanel>
        </div>
      ) : null}

      {activeTab === "rankings" ? (
        <div className="mb-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <SectionPanel
              compact
              title="Top Performing Agents"
              subtitle="Best agents in this period"
              bodyClassName="space-y-1.5"
            >
              {(report?.topPerformingAgents ?? []).length ? (
                report?.topPerformingAgents.map((agent) => (
                  <AgentCard key={agent.agentUserId} agent={agent} />
                ))
              ) : (
                <EmptyPanelState message="No top performers in this period" />
              )}
            </SectionPanel>

            <SectionPanel
              compact
              title="Needs Attention"
              subtitle="Agents flagged for follow-up"
              bodyClassName="space-y-1.5"
            >
              {(report?.lowPerformingAgents ?? []).length ? (
                report?.lowPerformingAgents.map((agent) => (
                  <AgentCard key={agent.agentUserId} agent={agent} />
                ))
              ) : (
                <EmptyPanelState message="No low performers flagged" />
              )}
            </SectionPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="mb-4 space-y-4">
          <div
            ref={analyticsCaptureRef}
            className="space-y-4 rounded-xl bg-slate-50 p-1"
          >
            <div className="grid gap-4 lg:grid-cols-3">
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
                  color: "#0f766e",
                  prefix: "₹",
                },
              ].map((chart) => (
                <SectionPanel
                  key={chart.title}
                  title={chart.title}
                  bodyClassName="pt-2"
                >
                  <SalesManagerTrendChart
                    title={chart.title}
                    points={chart.points}
                    color={chart.color}
                    valuePrefix={chart.prefix}
                  />
                </SectionPanel>
              ))}
            </div>

            {report?.charts.newAgentTrend.length ||
            report?.charts.agentActivationTrend.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {report?.charts.newAgentTrend.length ? (
                  <SectionPanel title="New Agent Trend" bodyClassName="pt-2">
                    <SalesManagerTrendChart
                      title="New Agent Trend"
                      points={report.charts.newAgentTrend.map((point) => ({
                        date: point.date,
                        value: point.count,
                      }))}
                      color="#7c3aed"
                      valuePrefix=""
                    />
                  </SectionPanel>
                ) : null}
                {report?.charts.agentActivationTrend.length ? (
                  <SectionPanel
                    title="Agent Activation Trend"
                    bodyClassName="pt-2"
                  >
                    <SalesManagerTrendChart
                      title="Agent Activation Trend"
                      points={report.charts.agentActivationTrend.map(
                        (point) => ({
                          date: point.date,
                          value: point.count,
                        }),
                      )}
                      color="#0891b2"
                      valuePrefix=""
                    />
                  </SectionPanel>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionPanel title="Product Mix">
                <div className="space-y-3 text-sm">
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
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>
                        <span className="tabular-nums text-slate-900">
                          {item.count ?? 0} ({item.pct?.toFixed(1) ?? 0}%)
                        </span>
                      </div>
                      <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-100">
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
              </SectionPanel>

              <SectionPanel title="Payment Mix">
                <div className="space-y-3 text-sm">
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
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>
                        <span className="tabular-nums text-slate-900">
                          {item.count ?? 0} ({item.pct?.toFixed(1) ?? 0}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", item.tone)}
                          style={{ width: `${item.pct ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionPanel>

              <SectionPanel title="Tier Distribution">
                <div className="space-y-2">
                  {(report?.agentTierDistribution ?? []).length ? (
                    (report?.agentTierDistribution ?? []).map((tier) => (
                      <div key={tier.tier}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {formatStatusLabel(tier.tier)}
                          </span>
                          <span className="tabular-nums text-slate-900">
                            {tier.agents} ({tier.percent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${tier.percent}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-400">
                      {loading ? "Loading…" : "No tier data"}
                    </p>
                  )}
                </div>
              </SectionPanel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel title="Geographic Performance" bodyClassName="p-0">
                <ReportDataTable
                  loading={loading}
                  emptyMessage="No geographic data"
                  columns={[
                    { key: "state", label: "State" },
                    { key: "agents", label: "Agents", align: "right" },
                    { key: "bookings", label: "Bookings", align: "right" },
                    { key: "revenue", label: "Revenue", align: "right" },
                  ]}
                  rows={(report?.geographicPerformance ?? []).map((row) => ({
                    id: row.stateId,
                    state: formatDisplayName(row.state),
                    agents: row.agents,
                    bookings: row.bookings,
                    revenue: formatReportMoney(row.grossBookingValue),
                  }))}
                />
              </SectionPanel>

              <SectionPanel title="Top Destinations" bodyClassName="p-0">
                <ReportDataTable
                  loading={loading}
                  emptyMessage="No destination data"
                  columns={[
                    { key: "destination", label: "Destination" },
                    { key: "product", label: "Product" },
                    { key: "bookings", label: "Bookings", align: "right" },
                    { key: "revenue", label: "Revenue", align: "right" },
                  ]}
                  rows={(report?.topDestinations ?? []).map((row, index) => ({
                    id: `${row.destination}-${row.product}-${index}`,
                    destination: formatDisplayName(row.destination),
                    product: formatStatusLabel(row.product),
                    bookings: row.bookings,
                    revenue: formatReportMoney(row.revenue),
                  }))}
                />
              </SectionPanel>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
      ) : null}

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
                <ReportCustomDateFields
                  fromText={customFromText}
                  toText={customToText}
                  onFromTextChange={setCustomFromText}
                  onToTextChange={setCustomToText}
                />
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
  return (
    <div className="flex items-start gap-3 px-4 py-3">
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
    </div>
  );
}
