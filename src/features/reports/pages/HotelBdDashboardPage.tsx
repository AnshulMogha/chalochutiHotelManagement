import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formatReportDate,
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
  Building2,
  ChevronRight,
  Filter,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  X,
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
}[] = [
  { key: "draft", label: "Draft", tone: "bg-sky-500" },
  { key: "underQc", label: "Under QC", tone: "bg-amber-500" },
  { key: "qcRejected", label: "QC Rejected", tone: "bg-rose-500" },
  { key: "underZonalReview", label: "Under Zonal Review", tone: "bg-violet-500" },
  { key: "zonalRejected", label: "Zonal Rejected", tone: "bg-rose-400" },
  { key: "live", label: "Live", tone: "bg-emerald-500" },
];

type FilterDraft = {
  datePreset: HotelBdDashboardDatePreset;
  fromDate: string;
  toDate: string;
  stuckDaysThreshold: number;
  bdUserId: string;
  inboxSearch: string;
  inboxCity: string;
};

const DEFAULT_DRAFT: FilterDraft = {
  datePreset: DEFAULT_DATE_PRESET,
  fromDate: "",
  toDate: "",
  stuckDaysThreshold: DEFAULT_STUCK_THRESHOLD,
  bdUserId: "",
  inboxSearch: "",
  inboxCity: "",
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
    (applied.bdUserId ? 1 : 0) +
    (applied.datePreset === "CUSTOM" && (applied.fromDate || applied.toDate)
      ? 1
      : 0) +
    (applied.inboxSearch.trim() ? 1 : 0) +
    (applied.inboxCity.trim() ? 1 : 0);

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
          bdUserId: filters.bdUserId || undefined,
          search: filters.inboxSearch.trim() || undefined,
          city: filters.inboxCity.trim() || undefined,
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
        iconClassName="bg-gradient-to-br from-blue-500 to-indigo-600"
        title="Dashboard"
        descriptionClassName="mt-0.5"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-800">
            {report?.dateRange?.fromDate && report?.dateRange?.toDate ? (
              <span>
                Go-live period:{" "}
                <span className="text-[#2f3d95]">
                  {formatReportDate(report.dateRange.fromDate)} –{" "}
                  {formatReportDate(report.dateRange.toDate)}
                </span>
              </span>
            ) : (
              <span className="text-slate-500">Go-live period: —</span>
            )}
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              ·
            </span>
            <span>
              Stuck threshold:{" "}
              <span className="text-[#2f3d95]">
                {applied.stuckDaysThreshold} day
                {applied.stuckDaysThreshold === 1 ? "" : "s"}
              </span>
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(applied);
                setStuckThresholdInput(String(applied.stuckDaysThreshold));
                setCustomFromText(isoToReportDateText(applied.fromDate));
                setCustomToText(isoToReportDateText(applied.toDate));
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
              onClick={() => void loadReport(applied)}
              disabled={
                loading ||
                (applied.datePreset === "CUSTOM" &&
                  (!applied.fromDate || !applied.toDate))
              }
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
              to={ROUTES.REPORTS.HOTEL_BD_PIPELINE}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
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
          value={report?.portfolioKpis.assignedHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Live Hotels"
          tone="success"
          value={report?.portfolioKpis.liveHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="In Pipeline"
          tone="warning"
          value={report?.portfolioKpis.hotelsInPipeline ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Rejected"
          tone="danger"
          value={report?.portfolioKpis.rejectedHotels ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Go Lives in Period"
          tone="success"
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
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Action Inbox</h2>
          <span className="text-xs text-slate-500">
            {filteredInbox.length} item{filteredInbox.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2">
          {INBOX_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setInboxTab(tab.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                inboxTab === tab.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hotel
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Step
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Incomplete
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Days Stuck
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message / Reason
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && !report ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-600" />
                  </td>
                </tr>
              ) : filteredInbox.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No inbox items for this filter.
                  </td>
                </tr>
              ) : (
                filteredInbox.map((item, index) => {
                  const link = getHotelLink(item, isAdmin);
                  return (
                    <tr
                      key={`${item.hotelId ?? item.hotelCode}-${index}`}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">
                          {item.hotelName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.hotelCode}
                          {item.city ? ` · ${item.city}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            severityTone(item.severity || "INFO"),
                          )}
                        >
                          {formatStatusLabel(item.category)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            hotelStatusTone(item.status),
                          )}
                        >
                          {formatStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.currentStep
                          ? formatStatusLabel(item.currentStep)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {item.incompleteSteps}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">
                        {item.daysStuck != null ? item.daysStuck : "—"}
                      </td>
                      <td className="max-w-56 px-3 py-2 text-xs text-slate-600">
                        <div className="line-clamp-2">
                          {item.message || item.rejectionReason || "—"}
                        </div>
                        {item.message && item.rejectionReason ? (
                          <div className="mt-0.5 line-clamp-1 text-slate-500">
                            {item.rejectionReason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {link ? (
                          <Link
                            to={link}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {isAdmin || !isHotelOnboardingEditable(item.status)
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
                disabled={draftCustomInvalid || stuckThresholdInvalid}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
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
