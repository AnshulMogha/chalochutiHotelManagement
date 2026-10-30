import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  canFilterHotelBdReportsByUser,
  isSuperAdmin,
} from "@/constants/roles";
import {
  formatStatusLabel,
  getHotelOnboardingLink,
  getHotelOnboardingReadOnlyLink,
  hotelStatusTone,
  isHotelOnboardingEditable,
  isoToReportDateText,
  isValidCustomDateRange,
  ReportPageHeader,
  severityTone,
  SummaryCard,
  validateCustomDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportRefreshButton,
} from "../components/ReportFilterDrawer";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  hotelBdDashboardReportService,
  matchesHotelBdInboxTab,
  type HotelBdActionInboxItem,
  type HotelBdDashboardDatePreset,
  type HotelBdDashboardReportResponse,
  type HotelBdInboxCategory,
} from "../services/hotelBdDashboardReportService";
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Ban,
  Building2,
  ChevronRight,
  CircleX,
  ClipboardCheck,
  FilePen,
  GitBranch,
  Scale,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";

const DEFAULT_DATE_PRESET: HotelBdDashboardDatePreset = "THIS_MONTH";
const DEFAULT_STUCK_THRESHOLD = 7;
const MAX_STUCK_THRESHOLD = 90;

const DATE_PRESET_OPTIONS: {
  value: HotelBdDashboardDatePreset;
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

const INBOX_TABS: { value: HotelBdInboxCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "QC_REJECTED", label: "QC Rejected" },
  { value: "ZONAL_REJECTED", label: "Zonal Rejected" },
  { value: "ONBOARDING_STUCK", label: "Stuck" },
  { value: "INCOMPLETE_STEPS", label: "Incomplete Steps" },
  { value: "UNDER_QC", label: "Under QC" },
  { value: "UNDER_ZONAL_REVIEW", label: "Under Zonal Review" },
];

const FUNNEL_STEPS: {
  key: keyof HotelBdDashboardReportResponse["onboardingFunnel"];
  label: string;
  tone: string;
  card: string;
  labelTone: string;
  icon: LucideIcon;
  iconWrap: string;
}[] = [
  {
    key: "draft",
    label: "Draft",
    tone: "bg-sky-500",
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    labelTone: "text-sky-700",
    icon: FilePen,
    iconWrap: "bg-sky-500",
  },
  {
    key: "underQc",
    label: "Under QC",
    tone: "bg-amber-500",
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    labelTone: "text-amber-700",
    icon: ClipboardCheck,
    iconWrap: "bg-amber-500",
  },
  {
    key: "qcRejected",
    label: "QC Rejected",
    tone: "bg-rose-500",
    card: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    labelTone: "text-rose-700",
    icon: CircleX,
    iconWrap: "bg-rose-500",
  },
  {
    key: "underZonalReview",
    label: "Under Zonal Review",
    tone: "bg-violet-500",
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    labelTone: "text-violet-700",
    icon: Scale,
    iconWrap: "bg-violet-600",
  },
  {
    key: "zonalRejected",
    label: "Zonal Rejected",
    tone: "bg-orange-500",
    card: "border-orange-100 bg-gradient-to-br from-orange-50 to-white",
    labelTone: "text-orange-700",
    icon: Ban,
    iconWrap: "bg-orange-500",
  },
  {
    key: "live",
    label: "Live",
    tone: "bg-emerald-500",
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    labelTone: "text-emerald-700",
    icon: BadgeCheck,
    iconWrap: "bg-emerald-600",
  },
];

type FilterDraft = {
  datePreset: HotelBdDashboardDatePreset;
  fromDate: string;
  toDate: string;
  stuckDaysThreshold: number;
  bdUserId: string[];
  inboxSearch: string;
  inboxCity: string;
  inboxState: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  stuckDaysThreshold: DEFAULT_STUCK_THRESHOLD,
  bdUserId: [],
  inboxSearch: "",
  inboxCity: "",
  inboxState: "",
};

function getHotelLink(
  item: HotelBdActionInboxItem,
  isAdmin: boolean,
): string | null {
  if (!item.hotelId) return null;
  // Super admin: same read-only onboarding wizard as hotel-owner Active → View
  if (isAdmin) {
    return getHotelOnboardingReadOnlyLink(item.hotelId);
  }
  return getHotelOnboardingLink(item.hotelId, item.status);
}

export default function HotelBdDashboardPage() {
  const { user } = useAuth();
  const userRoles = user?.roles;
  const canFilterByBd = canFilterHotelBdReportsByUser(userRoles);
  const isAdmin = isSuperAdmin(userRoles);
  const { toast, showToast, hideToast } = useToast();

  const [applied, setApplied] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [stuckThresholdInput, setStuckThresholdInput] = useState(
    String(DEFAULT_STUCK_THRESHOLD),
  );
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [inboxTab, setInboxTab] = useState<HotelBdInboxCategory | "ALL">("ALL");

  const [report, setReport] =
    useState<HotelBdDashboardReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bdUsers, setBdUsers] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const requestIdRef = useRef(0);

  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

  const stuckThresholdInvalid = useMemo(() => {
    const trimmed = stuckThresholdInput.trim();
    if (!trimmed) return true;
    const value = Number(trimmed);
    return (
      !Number.isInteger(value) ||
      value < 1 ||
      value > MAX_STUCK_THRESHOLD
    );
  }, [stuckThresholdInput]);

  const activeFilterCount =
    (applied.datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (applied.stuckDaysThreshold !== DEFAULT_STUCK_THRESHOLD ? 1 : 0) +
    (applied.bdUserId.length ? 1 : 0) +
    (applied.datePreset === "CUSTOM" && (applied.fromDate || applied.toDate)
      ? 1
      : 0) +
    (applied.inboxSearch.trim() ? 1 : 0) +
    (applied.inboxCity.trim() ? 1 : 0) +
    (applied.inboxState.trim() ? 1 : 0);

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
    async (filters: FilterDraft) => {
      if (
        filters.datePreset === "CUSTOM" &&
        (!filters.fromDate || !filters.toDate)
      ) {
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await hotelBdDashboardReportService.getReport({
          datePreset: filters.datePreset,
          fromDate:
            filters.datePreset === "CUSTOM" ? filters.fromDate : undefined,
          toDate: filters.datePreset === "CUSTOM" ? filters.toDate : undefined,
          stuckDaysThreshold: filters.stuckDaysThreshold,
          bdUserId: filters.bdUserId.length
            ? filters.bdUserId.join(",")
            : undefined,
          search: filters.inboxSearch.trim() || undefined,
          city: filters.inboxCity.trim() || undefined,
          state: filters.inboxState.trim() || undefined,
        });
        if (requestId !== requestIdRef.current) return;
        setReport(data);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const message = extractErrorMessage(err);
        setError(message);
        showToast(message, "error");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [showToast],
  );

  useEffect(() => {
    void loadReport(DEFAULT_DRAFT);
  }, [loadReport]);

  const inboxColumns: GridColDef<HotelBdActionInboxItem & { id: string }>[] = [
    {
      field: "hotelName",
      headerName: "Hotel",
      flex: 1.3,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <div className="min-w-0 py-1 leading-tight">
          <div className="truncate font-medium text-slate-900">
            {params.row.hotelName}
          </div>
          <div className="truncate text-xs text-slate-500">
            {params.row.hotelCode}
            {params.row.city ? ` · ${params.row.city}` : ""}
          </div>
        </div>
      ),
    },
    {
      field: "category",
      headerName: "Type",
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <span
          className={cn(
            "inline-flex h-auto items-center self-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight",
            severityTone(params.row.severity || "INFO"),
          )}
        >
          {formatStatusLabel(params.row.category)}
        </span>
      ),
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
      renderCell: (params) => (
        <span>
          {params.row.currentStep
            ? formatStatusLabel(params.row.currentStep)
            : "—"}
        </span>
      ),
    },
    {
      field: "incompleteSteps",
      headerName: "Incomplete",
      width: 110,
      sortable: false,
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
      field: "message",
      headerName: "Message / Reason",
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <div className="min-w-0 py-1 text-xs leading-tight text-slate-600">
          <div className="line-clamp-2">
            {params.row.message || params.row.rejectionReason || "—"}
          </div>
          {params.row.message && params.row.rejectionReason ? (
            <div className="mt-0.5 line-clamp-1 text-slate-500">
              {params.row.rejectionReason}
            </div>
          ) : null}
        </div>
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

  const filteredInbox = useMemo(() => {
    const items = report?.actionInbox ?? [];
    const hotelQuery = applied.inboxSearch.trim().toLowerCase();
    const cityQuery = applied.inboxCity.trim().toLowerCase();

    return items.filter((item) => {
      if (inboxTab !== "ALL" && !matchesHotelBdInboxTab(item, inboxTab)) {
        return false;
      }
      if (hotelQuery) {
        const haystack = `${item.hotelCode} ${item.hotelName}`.toLowerCase();
        if (!haystack.includes(hotelQuery)) return false;
      }
      if (cityQuery) {
        if (!(item.city || "").toLowerCase().includes(cityQuery)) return false;
      }
      return true;
    });
  }, [applied.inboxCity, applied.inboxSearch, inboxTab, report?.actionInbox]);

  const funnelTotal = useMemo(() => {
    if (!report?.onboardingFunnel) return 0;
    const funnel = report.onboardingFunnel;
    return FUNNEL_STEPS.reduce((sum, step) => sum + (funnel[step.key] || 0), 0);
  }, [report?.onboardingFunnel]);

  const applyFilters = () => {
    if (draftCustomInvalid || stuckThresholdInvalid) return;
    const threshold = Number(stuckThresholdInput.trim());
    let nextDraft = { ...draft, stuckDaysThreshold: threshold };
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextDraft = {
        ...nextDraft,
        fromDate: parsed.fromDate,
        toDate: parsed.toDate,
      };
    }
    setApplied(nextDraft);
    setDraft(nextDraft);
    setStuckThresholdInput(String(threshold));
    setFilterOpen(false);
    void loadReport(nextDraft);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setApplied(DEFAULT_DRAFT);
    setStuckThresholdInput(String(DEFAULT_STUCK_THRESHOLD));
    setCustomFromText("");
    setCustomToText("");
    setFilterOpen(false);
    void loadReport(DEFAULT_DRAFT);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <ReportPageHeader
        icon={Building2}
        iconClassName="bg-[#2f3d95]"
        title="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportAppliedRange
              from={report?.dateRange?.fromDate}
              to={report?.dateRange?.toDate}
              detail={`Go-live · Stuck ${applied.stuckDaysThreshold} day${
                applied.stuckDaysThreshold === 1 ? "" : "s"
              }`}
            />
            <ReportFilterButton
              onClick={() => {
                setDraft(applied);
                setStuckThresholdInput(String(applied.stuckDaysThreshold));
                setCustomFromText(isoToReportDateText(applied.fromDate));
                setCustomToText(isoToReportDateText(applied.toDate));
                setFilterOpen(true);
              }}
              activeCount={activeFilterCount}
            />
            <ReportRefreshButton
              onClick={() => void loadReport(applied)}
              loading={loading}
              disabled={
                applied.datePreset === "CUSTOM" &&
                (!applied.fromDate || !applied.toDate)
              }
            />
            <Link
              to={ROUTES.REPORTS.HOTEL_BD_PIPELINE}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#263578]"
            >
              <GitBranch className="h-4 w-4" />
              Onboarding Pipeline
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="Assigned Hotels"
          tone="sky"
          icon={Building2}
          value={report?.portfolioKpis.assignedHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Live Hotels"
          tone="success"
          icon={BadgeCheck}
          value={report?.portfolioKpis.liveHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="In Pipeline"
          tone="warning"
          icon={GitBranch}
          value={report?.portfolioKpis.hotelsInPipeline ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Rejected"
          tone="danger"
          icon={CircleX}
          value={report?.portfolioKpis.rejectedHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Go Lives in Period"
          tone="teal"
          icon={Award}
          value={report?.portfolioKpis.goLivesInPeriod ?? (loading ? "…" : 0)}
        />
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Onboarding Funnel
          </h2>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {FUNNEL_STEPS.map((step) => {
            const count = report?.onboardingFunnel[step.key] ?? 0;
            const pct =
              funnelTotal > 0 ? Math.round((count / funnelTotal) * 100) : 0;
            const StepIcon = step.icon;
            return (
              <div
                key={step.key}
                className={cn(
                  "rounded-lg border px-3 py-2 shadow-sm",
                  step.card,
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      step.iconWrap,
                    )}
                  >
                    <StepIcon
                      className="h-3.5 w-3.5 text-white"
                      strokeWidth={2.25}
                    />
                  </span>
                  <p
                    className={cn(
                      "min-w-0 truncate text-xs font-medium uppercase tracking-wide",
                      step.labelTone,
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
                  {loading && !report ? "…" : count}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn("h-full rounded-full", step.tone)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DataTable
        title="Action Inbox"
        subtitle={
          loading && !report
            ? "Loading…"
            : formatListCount(filteredInbox.length, "item")
        }
        afterHeader={
          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2">
            {INBOX_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setInboxTab(tab.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  inboxTab === tab.value
                    ? "bg-[#2f3d95] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
        rows={filteredInbox.map((item, index) => ({
          ...item,
          id: `${item.hotelId ?? item.hotelCode}-${index}`,
        }))}
        columns={inboxColumns}
        loading={loading && !report}
        getRowId={(row) => row.id}
        disableRowSelectionOnClick
        disableColumnFilter
        showToolbar
        showExport={false}
        rowHeight={64}
        pageSizeOptions={[10, 20, 50, 100]}
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 20 } },
        }}
        localeText={{ noRowsLabel: "No inbox items for this filter." }}
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
                  Go-live date preset
                </label>
                <select
                  value={draft.datePreset}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      datePreset: event.target
                        .value as HotelBdDashboardDatePreset,
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
              </div>
              {draft.datePreset === "CUSTOM" ? (
                <ReportCustomDateFields
                  fromText={customFromText}
                  toText={customToText}
                  onFromTextChange={setCustomFromText}
                  onToTextChange={setCustomToText}
                />
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Stuck days threshold
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_STUCK_THRESHOLD}
                  step={1}
                  value={stuckThresholdInput}
                  onChange={(event) => setStuckThresholdInput(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                {stuckThresholdInvalid ? (
                  <p className="mt-1 text-xs text-rose-600">
                    Enter a whole number from 1 to {MAX_STUCK_THRESHOLD}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Hotel code / property name
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={draft.inboxSearch}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        inboxSearch: event.target.value,
                      }))
                    }
                    placeholder="Search hotel code or property name"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  City
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={draft.inboxCity}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        inboxCity: event.target.value,
                      }))
                    }
                    placeholder="Search by city"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  State
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={draft.inboxState}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        inboxState: event.target.value,
                      }))
                    }
                    placeholder="Search by state"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
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
                                    ? prev.bdUserId.filter(
                                        (id) => id !== entry.id,
                                      )
                                    : [...prev.bdUserId, entry.id],
                                }))
                              }
                            />
                            <span className="min-w-0 truncate">
                              {entry.label}
                            </span>
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
                disabled={draftCustomInvalid || stuckThresholdInvalid}
                className="flex-1 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-medium text-white hover:bg-[#263578] disabled:opacity-60"
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
