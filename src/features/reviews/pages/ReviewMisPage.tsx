import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import {
  canManageHotelReviews,
  canModerateReviews,
} from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";
import { getStoredSelectedHotelId } from "@/lib/selectedHotelStorage";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportRefreshButton,
  ReportFilterDrawer,
} from "@/features/reports/components/ReportFilterDrawer";
import {
  exportStatusLabel,
  formatReportDateTime,
  formatStatusLabel,
  isoToReportDateText,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { reviewMisService } from "../services/reviewMisService";
import { hotelReviewService } from "../services/hotelReviewService";
import { resolveReviewMediaUrl } from "../services/reviewMediaUrl";
import type {
  ReviewMisItem,
  ReviewMisParams,
  ReviewMisSummary,
} from "../services/reviewMisTypes";
import {
  BOOKING_TYPES,
  REVIEW_STATUSES,
} from "../services/reviewModerationTypes";
import {
  ReviewFilterField,
  ReviewStatusBadge,
  ReviewSubjectLookupField,
  OwnerScopedHotelSelect,
} from "../components/reviewModerationUi";
import {
  BarChart3,
  BedDouble,
  Building2,
  Bus,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  ImageIcon,
  Flag,
  Hotel,
  IndianRupee,
  Loader2,
  MapPin,
  MessageSquare,
  Mountain,
  Route,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type OwnerReviewDialogMode = "reply" | "report" | null;

const RATING_MIX_TONES: Record<
  1 | 2 | 3 | 4 | 5,
  { bar: string; label: string; chip: string }
> = {
  5: {
    bar: "bg-emerald-500",
    label: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700",
  },
  4: {
    bar: "bg-lime-500",
    label: "text-lime-700",
    chip: "bg-lime-50 text-lime-700",
  },
  3: {
    bar: "bg-amber-400",
    label: "text-amber-700",
    chip: "bg-amber-50 text-amber-700",
  },
  2: {
    bar: "bg-orange-500",
    label: "text-orange-700",
    chip: "bg-orange-50 text-orange-700",
  },
  1: {
    bar: "bg-rose-500",
    label: "text-rose-700",
    chip: "bg-rose-50 text-rose-700",
  },
};

const CATEGORY_META: Record<
  string,
  { icon: LucideIcon; tone: string; iconTone: string }
> = {
  Cleanliness: {
    icon: Sparkles,
    tone: "border-cyan-100 bg-cyan-50/60",
    iconTone: "bg-cyan-600 text-white",
  },
  Staff: {
    icon: Users,
    tone: "border-violet-100 bg-violet-50/60",
    iconTone: "bg-violet-600 text-white",
  },
  Location: {
    icon: MapPin,
    tone: "border-rose-100 bg-rose-50/60",
    iconTone: "bg-rose-500 text-white",
  },
  "Room comfort": {
    icon: BedDouble,
    tone: "border-sky-100 bg-sky-50/60",
    iconTone: "bg-sky-600 text-white",
  },
  Value: {
    icon: IndianRupee,
    tone: "border-emerald-100 bg-emerald-50/60",
    iconTone: "bg-emerald-600 text-white",
  },
  Hotel: {
    icon: Hotel,
    tone: "border-indigo-100 bg-indigo-50/60",
    iconTone: "bg-indigo-600 text-white",
  },
  Transport: {
    icon: Bus,
    tone: "border-amber-100 bg-amber-50/60",
    iconTone: "bg-amber-500 text-white",
  },
  Activity: {
    icon: Mountain,
    tone: "border-teal-100 bg-teal-50/60",
    iconTone: "bg-teal-600 text-white",
  },
  "Tour guide": {
    icon: UserRound,
    tone: "border-fuchsia-100 bg-fuchsia-50/60",
    iconTone: "bg-fuchsia-600 text-white",
  },
  Itinerary: {
    icon: Route,
    tone: "border-orange-100 bg-orange-50/60",
    iconTone: "bg-orange-500 text-white",
  },
};

type FilterDraft = {
  bookingType: string;
  status: string;
  bookingRef: string;
  subjectId: string;
  subjectLabel: string;
  fromDateText: string;
  toDateText: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  bookingType: "",
  status: "",
  bookingRef: "",
  subjectId: "",
  subjectLabel: "",
  fromDateText: "",
  toDateText: "",
};

type AppliedFilters = {
  bookingType?: string;
  status?: string;
  bookingRef?: string;
  subjectId?: string;
  fromDate?: string;
  toDate?: string;
};

const EMPTY_SUMMARY: ReviewMisSummary = {
  totalReviews: 0,
  pendingCount: 0,
  publishedCount: 0,
  flaggedCount: 0,
  rejectedCount: 0,
  publishedAverageRating: null,
  publishedAggregate: null,
};

function buildHotelScopedFilters(hotelId: string | null): AppliedFilters {
  return {
    bookingType: "HOTEL",
    ...(hotelId ? { subjectId: hotelId } : {}),
  };
}

function buildHotelScopedDraft(hotelId: string | null): FilterDraft {
  return {
    ...DEFAULT_FILTERS,
    bookingType: "HOTEL",
    subjectId: hotelId || "",
  };
}

function initialMisFilters(
  isHotelScopedMis: boolean,
  hotelId: string | null,
): AppliedFilters {
  if (isHotelScopedMis) return buildHotelScopedFilters(hotelId);
  if (hotelId) return { subjectId: hotelId };
  return {};
}

function initialMisDraft(
  isHotelScopedMis: boolean,
  hotelId: string | null,
): FilterDraft {
  if (isHotelScopedMis) return buildHotelScopedDraft(hotelId);
  if (hotelId) return { ...DEFAULT_FILTERS, subjectId: hotelId };
  return DEFAULT_FILTERS;
}

function appliedFiltersEqual(a: AppliedFilters, b: AppliedFilters): boolean {
  return (
    a.bookingType === b.bookingType &&
    a.status === b.status &&
    a.bookingRef === b.bookingRef &&
    a.subjectId === b.subjectId &&
    a.fromDate === b.fromDate &&
    a.toDate === b.toDate
  );
}

function shouldApplyTopBarHotelSubject(
  bookingType: string | undefined,
): boolean {
  return !bookingType || bookingType === "HOTEL";
}

function resolveMisSubjectId(options: {
  isHotelScopedMis: boolean;
  hotelId: string | null;
  bookingType?: string;
  filterSubjectId?: string;
}): string | undefined {
  const { isHotelScopedMis, hotelId, bookingType, filterSubjectId } = options;
  if (isHotelScopedMis && hotelId) return hotelId;
  if (bookingType === "HOTEL" && hotelId) return hotelId;
  if (hotelId && shouldApplyTopBarHotelSubject(bookingType)) return hotelId;
  return filterSubjectId?.trim() || undefined;
}

function buildMisRequestParams(options: {
  isHotelScopedMis: boolean;
  hotelId: string | null;
  page: number;
  filters: AppliedFilters;
}): ReviewMisParams | null {
  const { isHotelScopedMis, hotelId, page, filters } = options;

  if (isHotelScopedMis && !hotelId) return null;

  const bookingType = isHotelScopedMis
    ? "HOTEL"
    : filters.bookingType || undefined;

  return {
    page,
    size: PAGE_SIZE,
    bookingType,
    status: filters.status,
    bookingRef: filters.bookingRef,
    subjectId: resolveMisSubjectId({
      isHotelScopedMis,
      hotelId,
      bookingType,
      filterSubjectId: filters.subjectId,
    }),
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  };
}

const KPI_TONES = {
  slate: {
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    icon: "bg-sky-500 text-white",
    label: "text-sky-700",
  },
  emerald: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-600 text-white",
    label: "text-emerald-700",
  },
  amber: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-500 text-white",
    label: "text-amber-700",
  },
  gold: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-500 text-white",
    label: "text-amber-700",
  },
  rose: {
    card: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    icon: "bg-rose-500 text-white",
    label: "text-rose-700",
  },
  sky: {
    card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
    icon: "bg-indigo-600 text-white",
    label: "text-indigo-700",
  },
} as const;

function formatAvg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function MisKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: (typeof KPI_TONES)[keyof typeof KPI_TONES];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        tone.card,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.04em]",
            tone.label,
          )}
        >
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      ) : null}
    </div>
  );
}

export default function ReviewMisPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId") ?? getStoredSelectedHotelId();
  const isModeratorView = canModerateReviews(user?.roles);
  const isHotelScopedMis = canManageHotelReviews(user?.roles) && !isModeratorView;
  const showOwnerActions = isHotelScopedMis && !!hotelId;
  const showActionColumn = isModeratorView || showOwnerActions;

  const { toast, showToast, hideToast } = useToast();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [rows, setRows] = useState<ReviewMisItem[]>([]);
  const [summary, setSummary] = useState<ReviewMisSummary>(EMPTY_SUMMARY);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<AppliedFilters>(() =>
    initialMisFilters(isHotelScopedMis, hotelId),
  );
  const [draft, setDraft] = useState<FilterDraft>(() =>
    initialMisDraft(isHotelScopedMis, hotelId),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ownerDialogMode, setOwnerDialogMode] =
    useState<OwnerReviewDialogMode>(null);
  const [ownerActiveReview, setOwnerActiveReview] =
    useState<ReviewMisItem | null>(null);
  const [ownerDialogText, setOwnerDialogText] = useState("");
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.bookingType) count += 1;
    if (filters.status) count += 1;
    if (filters.bookingRef) count += 1;
    const topBarSubjectApplied =
      !isHotelScopedMis &&
      !!hotelId &&
      shouldApplyTopBarHotelSubject(filters.bookingType);
    if (filters.subjectId && !topBarSubjectApplied) count += 1;
    if (filters.fromDate || filters.toDate) count += 1;
    return count;
  }, [filters, isHotelScopedMis, hotelId]);

  useEffect(() => {
    if (!user) return;
    if (isHotelScopedMis) {
      const nextFilters = buildHotelScopedFilters(hotelId);
      const nextDraft = buildHotelScopedDraft(hotelId);
      setFilters((prev) =>
        appliedFiltersEqual(prev, nextFilters) ? prev : nextFilters,
      );
      setDraft((prev) =>
        prev.bookingType === nextDraft.bookingType &&
        prev.subjectId === nextDraft.subjectId
          ? prev
          : nextDraft,
      );
      setPage((prev) => (prev === 0 ? prev : 0));
      return;
    }
    if (!hotelId) return;
    setFilters((prev) => {
      if (!shouldApplyTopBarHotelSubject(prev.bookingType)) return prev;
      return prev.subjectId === hotelId ? prev : { ...prev, subjectId: hotelId };
    });
    setDraft((prev) => {
      if (!shouldApplyTopBarHotelSubject(prev.bookingType)) return prev;
      return prev.subjectId === hotelId ? prev : { ...prev, subjectId: hotelId };
    });
    setPage((prev) => (prev === 0 ? prev : 0));
  }, [user, isHotelScopedMis, hotelId]);

  const loadMis = useCallback(async () => {
    if (isHotelScopedMis && !user) return;

    const requestParams = buildMisRequestParams({
      isHotelScopedMis,
      hotelId,
      page,
      filters,
    });

    if (!requestParams) {
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotalElements(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await reviewMisService.getMis(requestParams);
      setRows(data.items);
      setSummary(data.summary);
      setTotalElements(data.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showToast, isHotelScopedMis, hotelId, user]);

  useEffect(() => {
    let cancelled = false;
    if (isHotelScopedMis && !user) return undefined;

    const requestParams = buildMisRequestParams({
      isHotelScopedMis,
      hotelId,
      page,
      filters,
    });

    if (!requestParams) {
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotalElements(0);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    void reviewMisService
      .getMis(requestParams)
      .then((data) => {
        if (cancelled) return;
        setRows(data.items);
        setSummary(data.summary);
        setTotalElements(data.totalElements);
      })
      .catch((error) => {
        if (cancelled) return;
        showToast(extractErrorMessage(error), "error");
        setRows([]);
        setSummary(EMPTY_SUMMARY);
        setTotalElements(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, showToast, isHotelScopedMis, hotelId, user]);

  const applyFilters = () => {
    const range = validateOptionalDateRange(
      draft.fromDateText,
      draft.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    const bookingType = isHotelScopedMis ? "HOTEL" : draft.bookingType || undefined;
    setFilters({
      bookingType,
      status: draft.status || undefined,
      bookingRef: draft.bookingRef.trim() || undefined,
      subjectId: resolveMisSubjectId({
        isHotelScopedMis,
        hotelId,
        bookingType,
        filterSubjectId: draft.subjectId,
      }),
      fromDate: range.fromDate || undefined,
      toDate: range.toDate || undefined,
    });
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    if (isHotelScopedMis) {
      setDraft(buildHotelScopedDraft(hotelId));
      setFilters(buildHotelScopedFilters(hotelId));
    } else {
      setDraft(DEFAULT_FILTERS);
      setFilters({});
    }
    setPage(0);
    setFilterOpen(false);
  };

  const handleExport = async (format: ReportExportFormat) => {
    const requestParams = buildMisRequestParams({
      isHotelScopedMis,
      hotelId,
      page: 0,
      filters,
    });
    if (!requestParams) return;

    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await reviewMisService.exportMis(requestParams, format, setExportStatus);
      showToast("Review MIS downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const openOwnerDialog = (mode: Exclude<OwnerReviewDialogMode, null>, row: ReviewMisItem) => {
    setOwnerActiveReview(row);
    setOwnerDialogMode(mode);
    setOwnerDialogText("");
  };

  const closeOwnerDialog = () => {
    if (ownerSubmitting) return;
    setOwnerDialogMode(null);
    setOwnerActiveReview(null);
    setOwnerDialogText("");
  };

  const submitOwnerDialog = async () => {
    if (!hotelId || !ownerActiveReview || !ownerDialogMode) return;
    const text = ownerDialogText.trim();
    if (!text) {
      showToast(
        ownerDialogMode === "reply"
          ? "Please enter a reply"
          : "Please enter a report reason",
        "error",
      );
      return;
    }
    setOwnerSubmitting(true);
    try {
      if (ownerDialogMode === "reply") {
        const updated = await hotelReviewService.reply(
          ownerActiveReview.id,
          hotelId,
          { replyText: text },
        );
        setRows((prev) =>
          prev.map((row) =>
            row.id === updated.id
              ? {
                  ...row,
                  reply: updated.reply,
                }
              : row,
          ),
        );
        showToast("Reply posted", "success");
      } else {
        await hotelReviewService.report(ownerActiveReview.id, hotelId, {
          reason: text,
        });
        showToast("Review reported", "success");
        await loadMis();
      }
      setOwnerDialogMode(null);
      setOwnerActiveReview(null);
      setOwnerDialogText("");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setOwnerSubmitting(false);
    }
  };

  const handleOwnerHotelChange = (nextHotelId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextHotelId) next.set("hotelId", nextHotelId);
      else next.delete("hotelId");
      return next;
    });
    setDraft((prev) => ({ ...prev, subjectId: nextHotelId }));
    setFilters((prev) => ({
      ...prev,
      bookingType: "HOTEL",
      subjectId: nextHotelId || undefined,
    }));
    setPage(0);
  };

  const handleBookingTypeChange = (nextBookingType: string) => {
    const applyTopBarHotel =
      !!hotelId && shouldApplyTopBarHotelSubject(nextBookingType);

    setDraft((prev) => ({
      ...prev,
      bookingType: nextBookingType,
      subjectId: applyTopBarHotel ? hotelId! : "",
      subjectLabel: applyTopBarHotel ? prev.subjectLabel : "",
    }));

    if (isHotelScopedMis) return;

    setFilters((prev) => ({
      ...prev,
      bookingType: nextBookingType || undefined,
      subjectId: applyTopBarHotel ? hotelId! : undefined,
    }));
    setPage(0);
  };

  const aggregate = summary.publishedAggregate;
  const categoryScores = (
    [
      ["Cleanliness", aggregate?.cleanlinessAverage],
      ["Staff", aggregate?.staffAverage],
      ["Location", aggregate?.locationAverage],
      ["Room comfort", aggregate?.roomComfortAverage],
      ["Value", aggregate?.valueForMoneyAverage],
      ["Hotel", aggregate?.hotelRatingAverage],
      ["Transport", aggregate?.transportRatingAverage],
      ["Activity", aggregate?.activityRatingAverage],
      ["Tour guide", aggregate?.tourGuideRatingAverage],
      ["Itinerary", aggregate?.itineraryRatingAverage],
    ] as const
  ).filter(([, value]) => value != null);

  const expandedRow = rows.find((row) => row.id === expandedId) ?? null;

  const columns = useMemo<GridColDef<ReviewMisItem>[]>(() => {
    const base: GridColDef<ReviewMisItem>[] = [
      {
        field: "expand",
        headerName: "",
        width: 52,
        sortable: false,
        renderCell: (params) => (
          <button
            type="button"
            onClick={() =>
              setExpandedId((prev) =>
                prev === params.row.id ? null : params.row.id,
              )
            }
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={expandedId === params.row.id ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedId === params.row.id && "rotate-180",
              )}
            />
          </button>
        ),
      },
      {
        field: "bookingRef",
        headerName: "Booking",
        width: 170,
        sortable: false,
        renderCell: (params) => (
          <span className="font-mono text-xs font-semibold text-[#2f3d95]">
            {params.row.bookingRef || "—"}
          </span>
        ),
      },
      {
        field: "bookingType",
        headerName: "Type",
        width: 120,
        sortable: false,
        renderCell: (params) => (
          <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200">
            {formatStatusLabel(
              params.row.subjectType || params.row.bookingType || "—",
            )}
          </span>
        ),
      },
      {
        field: "subjectName",
        headerName: "Hotel name",
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <p className="truncate font-medium text-slate-900">
              {params.row.subjectName || "—"}
            </p>
          </div>
        ),
      },
      {
        field: "overallRating",
        headerName: "Rating",
        width: 100,
        sortable: false,
        renderCell: (params) => (
          <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            {params.row.overallRating != null
              ? params.row.overallRating.toFixed(1)
              : "—"}
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          </div>
        ),
      },
      {
        field: "reviewText",
        headerName: "Review",
        flex: 1,
        minWidth: 240,
        sortable: false,
        renderCell: (params) => (
          <MisReviewCell
            row={params.row}
            onOpenMedia={(preview) => setMediaPreview(preview)}
          />
        ),
      },
      {
        field: "travellerType",
        headerName: "Traveller",
        width: 140,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0">
            {params.row.travellerType ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                <Users className="h-3 w-3" />
                {formatStatusLabel(params.row.travellerType)}
              </span>
            ) : (
              <span className="text-sm text-slate-400">—</span>
            )}
            {params.row.wouldRecommend != null ? (
              <p
                className={cn(
                  "mt-1 text-[11px] font-medium",
                  params.row.wouldRecommend
                    ? "text-emerald-600"
                    : "text-rose-500",
                )}
              >
                Recommend {params.row.wouldRecommend ? "yes" : "no"}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <div>
            <ReviewStatusBadge status={params.row.status} />
            {params.row.autoModerated ? (
              <p className="mt-1 text-[11px] font-medium text-rose-500">Auto</p>
            ) : null}
          </div>
        ),
      },
      {
        field: "publishedAt",
        headerName: "Published",
        width: 170,
        sortable: false,
        renderCell: (params) =>
          params.row.publishedAt || params.row.createdAt ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatReportDateTime(
                params.row.publishedAt || params.row.createdAt,
              )}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
    ];

    if (showActionColumn) {
      base.push({
        field: "actions",
        headerName: "Action",
        width: 150,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) =>
          showOwnerActions ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {!params.row.reply?.replyText ? (
                <button
                  type="button"
                  onClick={() => openOwnerDialog("reply", params.row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openOwnerDialog("report", params.row)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.RATINGS_REVIEWS.DETAIL(params.row.id)}
              state={{ review: params.row }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <Eye className="h-3.5 w-3.5" />
              Open
            </Link>
          ),
      });
    }

    return base;
  }, [expandedId, showActionColumn, showOwnerActions]);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Review MIS
                </p>
                {isHotelScopedMis && !hotelId ? (
                  <p className="text-xs text-slate-500">
                    Select a hotel from the top bar to load review MIS
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={filters.fromDate}
                  to={filters.toDate}
                  detail={
                    filters.bookingType
                      ? formatStatusLabel(filters.bookingType)
                      : filters.fromDate || filters.toDate
                        ? null
                        : "All dates"
                  }
                />
                <ReportFilterButton
                  onClick={() => {
                    setDraft(filtersToDraft(filters));
                    setFilterOpen(true);
                  }}
                  activeCount={activeFilterCount}
                />
                <ExportButton
                  iconOnly
                  disabled={loading || (isHotelScopedMis && !hotelId)}
                  exporting={exporting}
                  exportingLabel={
                    exportStatusLabel(exportStatus) || "Exporting…"
                  }
                  onExportExcel={() => void handleExport("EXCEL")}
                  onExportCSV={() => void handleExport("CSV")}
                  onExportPDF={() => void handleExport("PDF")}
                />
                <ReportRefreshButton
                  onClick={() => void loadMis()}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MisKpiCard
            label="Total"
            value={loading ? "…" : summary.totalReviews.toLocaleString("en-IN")}
            icon={BarChart3}
            tone={KPI_TONES.slate}
          />
          <MisKpiCard
            label="Published"
            value={
              loading ? "…" : summary.publishedCount.toLocaleString("en-IN")
            }
            icon={CheckCircle2}
            tone={KPI_TONES.emerald}
          />
          <MisKpiCard
            label="Avg rating"
            value={
              loading
                ? "…"
                : formatAvg(
                    aggregate?.averageRating ?? summary.publishedAverageRating,
                  )
            }
            sub={
              aggregate
                ? `${aggregate.ratingCount.toLocaleString("en-IN")} ratings`
                : undefined
            }
            icon={Star}
            tone={KPI_TONES.gold}
          />
          <MisKpiCard
            label="Pending"
            value={loading ? "…" : summary.pendingCount.toLocaleString("en-IN")}
            icon={Clock3}
            tone={KPI_TONES.amber}
          />
          <MisKpiCard
            label="Flagged"
            value={loading ? "…" : summary.flaggedCount.toLocaleString("en-IN")}
            icon={Flag}
            tone={KPI_TONES.rose}
          />
          <MisKpiCard
            label="Rejected"
            value={
              loading ? "…" : summary.rejectedCount.toLocaleString("en-IN")
            }
            icon={XCircle}
            tone={KPI_TONES.sky}
          />
        </div>

        {aggregate ? (
          <div className="mb-3 grid gap-2 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 text-white">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-800/80">
                  Rating mix
                </p>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {(
                  [
                    [5, aggregate.rating5Count],
                    [4, aggregate.rating4Count],
                    [3, aggregate.rating3Count],
                    [2, aggregate.rating2Count],
                    [1, aggregate.rating1Count],
                  ] as const
                ).map(([stars, count]) => {
                  const total = Math.max(1, aggregate.ratingCount);
                  const pct = Math.round((count / total) * 100);
                  const tone = RATING_MIX_TONES[stars];
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex w-8 items-center justify-end gap-0.5 text-[11px] font-semibold",
                          tone.label,
                        )}
                      >
                        {stars}
                        <Star className="h-2.5 w-2.5 fill-current" />
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", tone.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "min-w-14 rounded-md px-1.5 py-0.5 text-right text-[10px] font-medium tabular-nums",
                          tone.chip,
                        )}
                      >
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-3.5 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-indigo-800/80">
                    Category averages
                  </p>
                </div>
                {aggregate.lastReviewAt ? (
                  <p className="truncate text-[10px] text-slate-400">
                    Last {formatReportDateTime(aggregate.lastReviewAt)}
                  </p>
                ) : null}
              </div>
              {categoryScores.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No category data.</p>
              ) : (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  {categoryScores.map(([label, value]) => {
                    const meta = CATEGORY_META[label] ?? {
                      icon: Star,
                      tone: "border-slate-100 bg-slate-50/80",
                      iconTone: "bg-slate-100 text-slate-600",
                    };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={label}
                        className={cn(
                          "flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5",
                          meta.tone,
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            meta.iconTone,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] text-slate-500">
                            {label}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatAvg(value)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

          <DataTable
            subtitle={
              loading ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(totalElements, "review")}
                  </span>
                  <span className="text-slate-400">
                    {activeFilterCount > 0 ? " · filtered" : ""} · Page {page + 1} of{" "}
                    {Math.max(totalPages, 1)}
                  </span>
                </>
              )
            }
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize: PAGE_SIZE }}
            onPaginationModelChange={(model) => {
              if (model.page !== page) setPage(Math.max(0, model.page));
            }}
            pageSizeOptions={[PAGE_SIZE]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            getRowHeight={() => "auto"}
            localeText={{
              noRowsLabel:
                isHotelScopedMis && !hotelId
                  ? "Select a hotel from the top bar to view review MIS."
                  : "No reviews match the selected filters.",
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "flex-start",
                whiteSpace: "normal",
                py: "8px",
                overflow: "visible",
              },
            }}
          />
          {expandedRow ? (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {expandedRow.bookingRef || expandedRow.subjectName || "Review"} details
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white"
                >
                  Close
                </button>
              </div>
              <ReviewMisExpandedPanel
                row={expandedRow}
                onOpenMedia={(preview) => setMediaPreview(preview)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        title="Filters"
        resetLabel="Reset"
        applyLabel="Apply"
      >
        <ReviewFilterField label="Booking type">
          {isHotelScopedMis ? (
            <select
              value="HOTEL"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <option value="HOTEL">Hotel booking</option>
            </select>
          ) : (
            <select
              value={draft.bookingType}
              onChange={(e) => handleBookingTypeChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All types</option>
              {BOOKING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatStatusLabel(type)}
                </option>
              ))}
            </select>
          )}
        </ReviewFilterField>
        {isHotelScopedMis ? (
          <ReviewFilterField label="Hotel">
            <OwnerScopedHotelSelect
              value={hotelId || draft.subjectId || ""}
              onChange={handleOwnerHotelChange}
            />
          </ReviewFilterField>
        ) : null}
        <ReviewFilterField label="Status">
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All statuses</option>
            {REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status.replace(/^REVIEW_/, ""))}
              </option>
            ))}
          </select>
        </ReviewFilterField>
        <ReviewFilterField label="Booking reference">
          <input
            type="text"
            value={draft.bookingRef}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, bookingRef: e.target.value }))
            }
            placeholder="BRKD2813CF0EC8B"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </ReviewFilterField>
        {!isHotelScopedMis &&
        !(hotelId && shouldApplyTopBarHotelSubject(draft.bookingType)) ? (
          <ReviewSubjectLookupField
            bookingType={draft.bookingType}
            value={draft.subjectId}
            selectedLabel={draft.subjectLabel}
            onChange={({ subjectId, subjectLabel }) =>
              setDraft((prev) => ({ ...prev, subjectId, subjectLabel }))
            }
          />
        ) : !isHotelScopedMis &&
          hotelId &&
          shouldApplyTopBarHotelSubject(draft.bookingType) ? (
          <ReviewFilterField label="Hotel">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Using the hotel selected in the top bar
            </div>
          </ReviewFilterField>
        ) : null}
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">
            Date range (dd/mm/yyyy)
          </p>
          <ReportCustomDateFields
            fromText={draft.fromDateText}
            toText={draft.toDateText}
            onFromTextChange={(value) =>
              setDraft((prev) => ({ ...prev, fromDateText: value }))
            }
            onToTextChange={(value) =>
              setDraft((prev) => ({ ...prev, toDateText: value }))
            }
            inputClassName="rounded-xl"
          />
        </div>
      </ReportFilterDrawer>

      {ownerDialogMode && ownerActiveReview ? (
        <>
          <button
            type="button"
            aria-label="Close dialog"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={closeOwnerDialog}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  ownerDialogMode === "reply"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {ownerDialogMode === "reply" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                {ownerDialogMode === "reply"
                  ? "Reply to review"
                  : "Report review"}
              </h3>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              {ownerActiveReview.bookingRef || ownerActiveReview.id}
            </p>
            <textarea
              value={ownerDialogText}
              onChange={(e) => setOwnerDialogText(e.target.value)}
              rows={4}
              placeholder={
                ownerDialogMode === "reply"
                  ? "Write your public reply…"
                  : "Reason for reporting…"
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={ownerSubmitting}
                onClick={closeOwnerDialog}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ownerSubmitting || !ownerDialogText.trim()}
                onClick={() => void submitOwnerDialog()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
                  ownerDialogMode === "reply"
                    ? "bg-sky-600 hover:bg-sky-700"
                    : "bg-rose-600 hover:bg-rose-700",
                )}
              >
                {ownerSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {ownerDialogMode === "reply" ? "Post reply" : "Submit report"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {mediaPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-[1px]"
            onClick={() => setMediaPreview(null)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {mediaPreview.label}
                </p>
                <p className="text-[11px] text-slate-500">Review media</p>
              </div>
              <button
                type="button"
                onClick={() => setMediaPreview(null)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950/95 p-3 sm:p-5">
              <img
                src={mediaPreview.url}
                alt={mediaPreview.label}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MisReviewCell({
  row,
  onOpenMedia,
}: {
  row: ReviewMisItem;
  onOpenMedia: (preview: { url: string; label: string }) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const replyRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!replyOpen && !mediaOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (replyOpen && replyRef.current && !replyRef.current.contains(target)) {
        setReplyOpen(false);
      }
      if (mediaOpen && mediaRef.current && !mediaRef.current.contains(target)) {
        setMediaOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReplyOpen(false);
        setMediaOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [replyOpen, mediaOpen]);

  const sortedMedia = useMemo(
    () =>
      [...row.media].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      ),
    [row.media],
  );

  const openFirstMedia = () => {
    if (sortedMedia.length === 1) {
      const media = sortedMedia[0];
      const href = resolveReviewMediaUrl(media);
      if (href) {
        onOpenMedia({
          url: href,
          label: media.fileName || media.storageKey || "Image",
        });
      }
      return;
    }
    setReplyOpen(false);
    setMediaOpen((prev) => !prev);
  };

  return (
    <div className="min-w-0">
{row.title ? (
  <p className="line-clamp-1 font-medium text-slate-900">{row.title}</p>
) : null}
<p
  className={cn(
    "line-clamp-2 text-slate-600",
    row.title ? "mt-0.5" : "",
  )}
>
  {row.reviewText || "—"}
</p>
<div className="mt-1.5 flex flex-wrap gap-1.5">
  {row.media.length > 0 ? (
    <div ref={mediaRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openFirstMedia();
        }}
        className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
      >
        {row.media.length} media
      </button>
      {mediaOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500">
            Media
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {sortedMedia.map((media, index) => {
              const label =
                media.fileName || media.storageKey || "Image";
              const href = resolveReviewMediaUrl(media);
              if (!href) {
                return (
                  <div
                    key={`${media.storageKey || label}-${index}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-400"
                  >
                    {label}
                  </div>
                );
              }
              return (
                <button
                  key={`${media.storageKey || label}-${index}`}
                  type="button"
                  onClick={() => {
                    setMediaOpen(false);
                    onOpenMedia({ url: href, label });
                  }}
                  className="overflow-hidden rounded-lg border border-slate-200 transition hover:border-[#2f3d95]/40"
                >
                  <img
                    src={href}
                    alt={label}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  ) : null}
  {row.reply?.replyText ? (
    <div ref={replyRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMediaOpen(false);
          setReplyOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 transition hover:bg-sky-100"
      >
        <MessageSquare className="h-3 w-3" />
        Reply
      </button>
      {replyOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-72 max-w-[min(18rem,70vw)] rounded-xl border border-sky-100 bg-white p-3 shadow-lg">
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-sky-800">
            Hotel reply
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {row.reply.replyText}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            {row.reply.repliedByName || "—"}
            {row.reply.repliedAt
              ? ` · ${formatReportDateTime(row.reply.repliedAt)}`
              : ""}
          </p>
        </div>
      ) : null}
    </div>
  ) : null}
</div>
    </div>
  );
}

function ReviewMisExpandedPanel({
  row,
  onOpenMedia,
}: {
  row: ReviewMisItem;
  onOpenMedia: (preview: { url: string; label: string }) => void;
}) {
  const sortedMedia = useMemo(
    () =>
      [...row.media].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      ),
    [row.media],
  );

  return (
<div className="grid gap-3 lg:grid-cols-2">
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
      Moderation
    </p>
    <p className="mt-2 text-sm leading-relaxed text-slate-700">
      {row.moderationReason || "—"}
    </p>
    {row.reply ? (
      <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
        <p className="text-xs font-semibold text-sky-800">
          Hotel reply
        </p>
        <p className="mt-1 text-sm text-slate-800">
          {row.reply.replyText}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {row.reply.repliedByName || "—"}
          {row.reply.repliedAt
            ? ` · ${formatReportDateTime(row.reply.repliedAt)}`
            : ""}
        </p>
      </div>
    ) : null}
    {row.media.length > 0 ? (
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
          Media ({row.media.length})
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sortedMedia.map((media, index) => {
              const label =
                media.fileName || media.storageKey || "File";
              const href = resolveReviewMediaUrl(media);
              if (!href) {
                return (
                  <div
                    key={`${media.storageKey || media.fileName}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 text-center text-[11px] text-slate-500"
                  >
                    {label}
                  </div>
                );
              }
              return (
                <button
                  key={`${media.storageKey || media.fileName}-${index}`}
                  type="button"
                  onClick={() =>
                    onOpenMedia({ url: href, label })
                  }
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-[#2f3d95]/40 hover:shadow-sm"
                  title="Preview image"
                >
                  <div className="relative aspect-video bg-slate-200">
                    <img
                      src={href}
                      alt={label}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/25">
                      <ImageIcon className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                    </span>
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] text-slate-600">
                    {label}
                  </p>
                </button>
              );
            })}
        </div>
      </div>
    ) : null}
  </div>
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
      Audit history ({row.auditHistory.length})
    </p>
    {row.auditHistory.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">No audit entries.</p>
    ) : (
      <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto">
        {row.auditHistory.map((entry) => (
          <li
            key={String(entry.id)}
            className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                {formatStatusLabel(entry.action)}
              </span>
              <span className="text-[11px] text-slate-500">
                {entry.fromStatus
                  ? formatStatusLabel(entry.fromStatus)
                  : "—"}
                {" → "}
                {entry.toStatus
                  ? formatStatusLabel(entry.toStatus)
                  : "—"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {entry.reason || entry.reasonCode || "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {entry.moderatorName || entry.moderatorRole || "—"}
              {entry.actedAt
                ? ` · ${formatReportDateTime(entry.actedAt)}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>
  );
}


function filtersToDraft(filters: AppliedFilters): FilterDraft {
  return {
    bookingType: filters.bookingType || "",
    status: filters.status || "",
    bookingRef: filters.bookingRef || "",
    subjectId: filters.subjectId || "",
    subjectLabel: "",
    fromDateText: filters.fromDate ? isoToReportDateText(filters.fromDate) : "",
    toDateText: filters.toDate ? isoToReportDateText(filters.toDate) : "",
  };
}
