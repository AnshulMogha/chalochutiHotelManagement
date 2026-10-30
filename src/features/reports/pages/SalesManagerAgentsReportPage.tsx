import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { appendReturnToQuery } from "@/lib/navigationReturn";
import { adminService } from "@/features/admin/services/adminService";
import { extractErrorMessage } from "../components/ReportJsonPanel";
import {
  ReportPageHeader,
  SummaryCard,
  agentStatusTone,
  exportStatusLabel,
  formatReportDateTime,
  formatReportMoney,
  formatStatusLabel,
  isoToReportDateText,
  isValidCustomDateRange,
  validateCustomDateRange,
  validateOptionalDateRange,
} from "../components/reportUiHelpers";
import { ReportCustomDateFields } from "../components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
} from "../components/ReportFilterDrawer";
import {
  salesManagerAgentsReportService,
  type SalesManagerAgentPortfolioRow,
  type SalesManagerAgentsReportResponse,
} from "../services/salesManagerAgentsReportService";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "../services/reportExportService";
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
  Award,
  Ban,
  BookX,
  Gem,
  LayoutDashboard,
  Medal,
  RefreshCw,
  UserCheck,
  UserRoundCog,
  UserX,
  Users,
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
  const [customFromText, setCustomFromText] = useState("");
  const [customToText, setCustomToText] = useState("");
  const [onboardedFromText, setOnboardedFromText] = useState("");
  const [onboardedToText, setOnboardedToText] = useState("");
  const [lastBookingFromText, setLastBookingFromText] = useState("");
  const [lastBookingToText, setLastBookingToText] = useState("");

  const [report, setReport] = useState<SalesManagerAgentsReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<
    Array<{ id: string; label: string; name: string }>
  >([]);
  const [loadingStates, setLoadingStates] = useState(false);

  const customRangeInvalid = datePreset === "CUSTOM" && (!fromDate || !toDate);
  const draftCustomInvalid =
    draft.datePreset === "CUSTOM" &&
    !isValidCustomDateRange(customFromText, customToText);

  const activeFilterCount =
    (datePreset !== DEFAULT_DATE_PRESET ? 1 : 0) +
    (dateAxis !== DEFAULT_DATE_AXIS ? 1 : 0) +
    (bookingType !== DEFAULT_BOOKING_TYPE ? 1 : 0) +
    (agentStatus !== DEFAULT_STATUS ? 1 : 0) +
    (sort !== DEFAULT_SORT || sortDir !== "DESC" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    (stateId ? 1 : 0) +
    (agencyTier ? 1 : 0) +
    (onboardedFrom || onboardedTo ? 1 : 0) +
    (lastBookingFrom || lastBookingTo ? 1 : 0) +
    (datePreset === "CUSTOM" && (fromDate || toDate) ? 1 : 0);

  useEffect(() => {
    let cancelled = false;
    setLoadingStates(true);
    adminService
      .getStates()
      .then((stateList) => {
        if (cancelled) return;
        setStates(
          (stateList || [])
            .filter((item) => item.active)
            .map((item) => ({
              id: String(item.id),
              label: item.name,
              name: item.name,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
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
          search: (overrides?.search ?? search).trim() || undefined,
          agentStatus: overrides?.agentStatus ?? agentStatus,
          sort: overrides?.sort ?? sort,
          sortDir: overrides?.sortDir ?? sortDir,
          onboardedFrom:
            (overrides?.onboardedFrom ?? onboardedFrom) || undefined,
          onboardedTo: (overrides?.onboardedTo ?? onboardedTo) || undefined,
          lastBookingFrom:
            (overrides?.lastBookingFrom ?? lastBookingFrom) || undefined,
          lastBookingTo:
            (overrides?.lastBookingTo ?? lastBookingTo) || undefined,
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

    const nextDraft = { ...draft };
    if (draft.datePreset === "CUSTOM") {
      const parsed = validateCustomDateRange(customFromText, customToText);
      if (!parsed.ok) {
        showToast(parsed.message, "error");
        return;
      }
      nextDraft.fromDate = parsed.fromDate;
      nextDraft.toDate = parsed.toDate;
    }

    const onboarded = validateOptionalDateRange(
      onboardedFromText,
      onboardedToText,
    );
    if (!onboarded.ok) {
      showToast(onboarded.message, "error");
      return;
    }
    nextDraft.onboardedFrom = onboarded.fromDate ?? "";
    nextDraft.onboardedTo = onboarded.toDate ?? "";

    const lastBooking = validateOptionalDateRange(
      lastBookingFromText,
      lastBookingToText,
    );
    if (!lastBooking.ok) {
      showToast(lastBooking.message, "error");
      return;
    }
    nextDraft.lastBookingFrom = lastBooking.fromDate ?? "";
    nextDraft.lastBookingTo = lastBooking.toDate ?? "";

    setDatePreset(nextDraft.datePreset);
    setFromDate(nextDraft.fromDate);
    setToDate(nextDraft.toDate);
    setDateAxis(nextDraft.dateAxis);
    setBookingType(nextDraft.bookingType);
    setStateId(nextDraft.stateId);
    setState(nextDraft.state);
    setAgencyTier(nextDraft.agencyTier);
    setSearch(nextDraft.search);
    setAgentStatus(nextDraft.agentStatus);
    setSort(nextDraft.sort);
    setSortDir(nextDraft.sortDir);
    setOnboardedFrom(nextDraft.onboardedFrom);
    setOnboardedTo(nextDraft.onboardedTo);
    setLastBookingFrom(nextDraft.lastBookingFrom);
    setLastBookingTo(nextDraft.lastBookingTo);
    setPage(0);
    setFilterOpen(false);
    void loadReport({ ...nextDraft, page: 0 });
  };

  const applyStatusCardFilter = (
    nextStatus: SalesManagerAgentStatus | "ALL",
  ) => {
    const value = agentStatus === nextStatus ? "ALL" : nextStatus;
    setAgentStatus(value);
    setPage(0);
    void loadReport({ agentStatus: value, page: 0 });
  };

  const applyTierCardFilter = (nextTier: SalesManagerAgencyTier) => {
    const value = agencyTier === nextTier ? "" : nextTier;
    setAgencyTier(value);
    setPage(0);
    void loadReport({ agencyTier: value, page: 0 });
  };

  const resetFilters = () => {
    setDraft(DEFAULT_DRAFT);
    setCustomFromText("");
    setCustomToText("");
    setOnboardedFromText("");
    setOnboardedToText("");
    setLastBookingFromText("");
    setLastBookingToText("");
    setDatePreset(DEFAULT_DRAFT.datePreset);
    setFromDate("");
    setToDate("");
    setDateAxis(DEFAULT_DRAFT.dateAxis);
    setBookingType(DEFAULT_DRAFT.bookingType);
    setStateId("");
    setState("");
    setAgencyTier("");
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

  const exportParams = useMemo(
    () => ({
      datePreset,
      fromDate: datePreset === "CUSTOM" ? fromDate : undefined,
      toDate: datePreset === "CUSTOM" ? toDate : undefined,
      dateAxis,
      bookingType,
      stateId: stateId || undefined,
      state: state.trim() || undefined,
      agencyTier: (agencyTier as SalesManagerAgencyTier) || undefined,
      search: search.trim() || undefined,
      agentStatus,
      sort,
      sortDir,
      onboardedFrom: onboardedFrom || undefined,
      onboardedTo: onboardedTo || undefined,
      lastBookingFrom: lastBookingFrom || undefined,
      lastBookingTo: lastBookingTo || undefined,
    }),
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
      search,
      sort,
      sortDir,
      state,
      stateId,
      toDate,
    ],
  );

  const handleExport = async (format: ReportExportFormat) => {
    if (customRangeInvalid) return;
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await salesManagerAgentsReportService.exportReport(
        exportParams,
        format,
        setExportStatus,
      );
      showToast("Agent portfolio export downloaded.", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const agentColumns: GridColDef<SalesManagerAgentPortfolioRow>[] = [
    {
      field: "agency",
      headerName: "Agency",
      flex: 1.3,
      minWidth: 200,
      sortable: false,
      valueGetter: (_value, row) => row.agency.name,
      renderCell: (params) => (
        <div className="min-w-0 py-1 leading-tight">
          <p className="truncate font-medium text-slate-900">
            {params.row.agency.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {params.row.agentCode}
            {params.row.agency.contactPerson
              ? ` · ${params.row.agency.contactPerson}`
              : ""}
          </p>
          {params.row.agency.email ? (
            <p className="truncate text-xs text-slate-500">
              {params.row.agency.email}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      field: "location",
      headerName: "Location",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <div className="py-1 leading-tight text-slate-700">
          <p>{params.row.location.state || "—"}</p>
          <p className="text-xs text-slate-500">
            {params.row.location.city || "—"}
          </p>
        </div>
      ),
    },
    {
      field: "tier",
      headerName: "Tier",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <span className="inline-flex h-auto items-center self-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium leading-tight text-slate-700">
          {params.row.tier.label}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <span
          className={cn(
            "inline-flex h-auto items-center self-center rounded-full px-2 py-0.5 text-xs font-semibold leading-tight ring-1 ring-inset",
            agentStatusTone(params.row.status.color, params.row.status.code),
          )}
        >
          {params.row.status.label}
        </span>
      ),
    },
    {
      field: "bookings",
      headerName: "Bookings",
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => (
        <div className="min-w-0 py-1 leading-tight tabular-nums text-slate-800">
          <p className="font-semibold">{params.row.bookings.total} bookings</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link
              to={agentHotelMisUrl(String(params.row.agentId))}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Hotel {params.row.bookings.hotel}
            </Link>
            <a
              href={`${ROUTES.ADMIN.PACKAGE_BOOKING_FINANCIAL_MIS}?agencyId=${params.row.agentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
            >
              Package {params.row.bookings.package}
            </a>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {params.row.bookings.confirmed} confirmed ·{" "}
            {params.row.bookings.cancelled} cancelled
          </p>
        </div>
      ),
    },
    {
      field: "revenue",
      headerName: "Revenue",
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <div className="py-1 leading-tight tabular-nums text-slate-800">
          <p className="font-semibold">
            {formatReportMoney(params.row.revenue.grossBookingValue)}
          </p>
          <p className="text-xs text-slate-500">
            Collected {formatReportMoney(params.row.revenue.collected)}
          </p>
          <p className="text-xs text-slate-500">
            Outstanding {formatReportMoney(params.row.revenue.outstanding)}
          </p>
        </div>
      ),
    },
    {
      field: "collection",
      headerName: "Collection",
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <div className="py-1 leading-tight tabular-nums text-slate-800">
          <p className="font-semibold">
            {params.row.revenue.collectionPercent.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">
            ABV {formatReportMoney(params.row.revenue.averageBookingValue)}
          </p>
        </div>
      ),
    },
    {
      field: "activity",
      headerName: "Activity",
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <div className="py-1 leading-tight text-slate-700">
          <p className="text-xs">
            Last booking:{" "}
            {formatReportDateTime(params.row.activity.lastBookingAt)}
          </p>
        </div>
      ),
    },
    {
      field: "quality",
      headerName: "Quality",
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <div className="py-1 leading-tight tabular-nums text-slate-700">
          <p className="text-xs">
            Cancel {params.row.quality.cancellationPercent.toFixed(1)}%
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4">
      <Toast toast={toast} onClose={hideToast} />

      <ReportPageHeader
        icon={UserRoundCog}
        iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Agent Portfolio"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportAppliedRange
              from={report?.dateRange?.fromDate}
              to={report?.dateRange?.toDate}
              detail={
                report?.metricWindow
                  ? `${formatStatusLabel(report.metricWindow)} metrics`
                  : null
              }
            />
            <ReportFilterButton
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
                  search,
                  agentStatus,
                  sort,
                  sortDir,
                  onboardedFrom,
                  onboardedTo,
                  lastBookingFrom,
                  lastBookingTo,
                });
                setCustomFromText(isoToReportDateText(fromDate));
                setCustomToText(isoToReportDateText(toDate));
                setOnboardedFromText(isoToReportDateText(onboardedFrom));
                setOnboardedToText(isoToReportDateText(onboardedTo));
                setLastBookingFromText(isoToReportDateText(lastBookingFrom));
                setLastBookingToText(isoToReportDateText(lastBookingTo));
                setFilterOpen(true);
              }}
              activeCount={activeFilterCount}
            />
            <ExportButton
              iconOnly
              disabled={loading || customRangeInvalid}
              exporting={exporting}
              exportingLabel={exportStatusLabel(exportStatus) || "Exporting…"}
              onExportExcel={() => void handleExport("EXCEL")}
              onExportCSV={() => void handleExport("CSV")}
              onExportPDF={() => void handleExport("PDF")}
            />
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || customRangeInvalid}
              aria-label="Refresh"
              title="Refresh"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
              />
            </button>
            <Link
              to={ROUTES.REPORTS.SALES_MANAGER_DASHBOARD}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:from-emerald-600 hover:to-teal-700"
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Total Agents"
          tone="sky"
          icon={Users}
          value={report?.summary.totalAgents ?? (loading ? "…" : 0)}
        />
        <SummaryCard
          label="Active"
          tone="success"
          icon={UserCheck}
          value={report?.summary.activeAgents ?? (loading ? "…" : 0)}
          active={agentStatus === "ACTIVE"}
          onClick={() => applyStatusCardFilter("ACTIVE")}
        />
        <SummaryCard
          label="Inactive"
          tone="violet"
          icon={UserX}
          value={report?.summary.inactiveAgents ?? (loading ? "…" : 0)}
          active={agentStatus === "INACTIVE"}
          onClick={() => applyStatusCardFilter("INACTIVE")}
        />
        <SummaryCard
          label="Zero Booking"
          tone="warning"
          icon={BookX}
          value={report?.summary.zeroBookingAgents ?? (loading ? "…" : 0)}
          active={agentStatus === "ZERO_BOOKING"}
          onClick={() => applyStatusCardFilter("ZERO_BOOKING")}
        />
        <SummaryCard
          label="Suspended"
          tone="danger"
          icon={Ban}
          value={report?.summary.suspendedAgents ?? (loading ? "…" : 0)}
          active={agentStatus === "SUSPENDED"}
          onClick={() => applyStatusCardFilter("SUSPENDED")}
        />
      </div>

      {tierSummary ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(
            [
              ["Bronze", "BRONZE", tierSummary.bronze, "orange", Medal],
              ["Silver", "SILVER", tierSummary.silver, "cyan", Award],
              ["Gold", "GOLD", tierSummary.gold, "amber", Award],
              ["Platinum", "PLATINUM", tierSummary.platinum, "indigo", Gem],
              ["Diamond", "DIAMOND", tierSummary.diamond, "violet", Gem],
            ] as const
          ).map(([label, tier, value, tone, Icon]) => (
            <SummaryCard
              key={tier}
              label={label}
              tone={tone}
              icon={Icon}
              value={loading && !report ? "…" : value}
              active={agencyTier === tier}
              onClick={() => applyTierCardFilter(tier)}
            />
          ))}
        </div>
      ) : null}

      <DataTable
        subtitle={
          loading && !report ? (
            "Loading…"
          ) : (
            <>
              <span className="font-medium text-slate-600">
                {formatListCount(totalElements, "agent")}
              </span>
              {report?.agents.page.sort ? (
                <span>
                  {" "}
                  · sorted by {formatStatusLabel(report.agents.page.sort)} (
                  {report.agents.page.direction})
                </span>
              ) : null}
              <span className="text-slate-400">
                {" "}
                · Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
            </>
          )
        }
        rows={report?.agents.content ?? []}
        columns={agentColumns}
        getRowId={(row) => row.agentId}
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
        localeText={{ noRowsLabel: "No agents match the current filters" }}
      />

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
              <FilterField label="Agent status">
                <select
                  value={draft.agentStatus}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      agentStatus: event.target.value as
                        | SalesManagerAgentStatus
                        | "ALL",
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {(
                    report?.filters?.status ?? [
                      "ALL",
                      "ACTIVE",
                      "INACTIVE",
                      "ZERO_BOOKING",
                      "LOW_COLLECTION",
                      "HIGH_OUTSTANDING",
                      "SUSPENDED",
                    ]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="State">
                <select
                  value={draft.stateId}
                  disabled={loadingStates}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const selected = states.find((item) => item.id === nextId);
                    setDraft((prev) => ({
                      ...prev,
                      stateId: nextId,
                      // Same masters list as agent onboarding; send name too for API compatibility.
                      state: selected?.name ?? "",
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">
                    {loadingStates
                      ? "Loading states..."
                      : states.length
                        ? "All states"
                        : "No states available"}
                  </option>
                  {states.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
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
                  {(
                    report?.filters?.tier ?? [
                      "BRONZE",
                      "SILVER",
                      "GOLD",
                      "PLATINUM",
                      "DIAMOND",
                    ]
                  ).map((tier) => (
                    <option key={tier} value={tier}>
                      {formatStatusLabel(tier)}
                    </option>
                  ))}
                </select>
              </FilterField>
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
              <ReportCustomDateFields
                fromLabel="Onboarded from"
                toLabel="Onboarded to"
                fromText={onboardedFromText}
                toText={onboardedToText}
                onFromTextChange={setOnboardedFromText}
                onToTextChange={setOnboardedToText}
              />
              <ReportCustomDateFields
                fromLabel="Last booking from"
                toLabel="Last booking to"
                fromText={lastBookingFromText}
                toText={lastBookingToText}
                onFromTextChange={setLastBookingFromText}
                onToTextChange={setLastBookingToText}
              />
            </div>
            <ReportFilterActions
              onReset={resetFilters}
              onApply={applyFilters}
              applyDisabled={draftCustomInvalid}
            />
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

function agentHotelMisUrl(agentId: string): string {
  const params = new URLSearchParams({ agencyId: String(agentId) });
  appendReturnToQuery(params, ROUTES.REPORTS.SALES_MANAGER_AGENTS);
  return `${ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS}?${params.toString()}`;
}
