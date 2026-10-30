import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
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
  parseOptionalReportDate,
} from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { reviewModerationService } from "../services/reviewModerationService";
import {
  BOOKING_TYPES,
  type ReviewQueueItem,
} from "../services/reviewModerationTypes";
import {
  ReviewModerationFlowStrip,
  ReviewModerationStatCard,
  ReviewRatingStars,
  ReviewStatusBadge,
  ReviewSubjectLookupField,
} from "../components/reviewModerationUi";
import {
  Building2,
  CalendarDays,
  Clock3,
  Eye,
  Flag,
  ListOrdered,
  Users,
} from "lucide-react";

const PAGE_SIZE = 20;

const RATING_OPTIONS = [
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
] as const;

type FilterDraft = {
  bookingType: string;
  bookingRef: string;
  customerEmail: string;
  subjectId: string;
  subjectLabel: string;
  rating: string;
  dateText: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  bookingType: "",
  bookingRef: "",
  customerEmail: "",
  subjectId: "",
  subjectLabel: "",
  rating: "",
  dateText: "",
};

type AppliedFilters = {
  bookingType?: string;
  bookingRef?: string;
  customerEmail?: string;
  subjectId?: string;
  rating?: number;
  date?: string;
};

function buildAppliedFilters(draft: FilterDraft): AppliedFilters | null {
  const date = parseOptionalReportDate(draft.dateText);
  if (draft.dateText.trim() && !date) {
    return null;
  }

  const rating =
    draft.rating.trim() !== "" ? Number(draft.rating) : undefined;
  if (rating != null && !Number.isFinite(rating)) {
    return null;
  }

  return {
    bookingType: draft.bookingType || undefined,
    bookingRef: draft.bookingRef.trim() || undefined,
    customerEmail: draft.customerEmail.trim() || undefined,
    subjectId: draft.subjectId.trim() || undefined,
    rating,
    date: date || undefined,
  };
}

function validateDraftFilters(
  draft: FilterDraft,
): { ok: true; filters: AppliedFilters } | { ok: false; message: string } {
  const date = parseOptionalReportDate(draft.dateText);
  if (draft.dateText.trim() && !date) {
    return { ok: false, message: "Enter submitted date as dd/mm/yyyy" };
  }

  if (draft.rating.trim() !== "") {
    const rating = Number(draft.rating);
    if (!Number.isFinite(rating)) {
      return { ok: false, message: "Enter a valid rating" };
    }
  }

  const filters = buildAppliedFilters(draft);
  if (!filters) {
    return { ok: false, message: "Invalid filter values" };
  }

  return { ok: true, filters };
}

export default function ReviewModerationQueuePage() {
  const { toast, showToast, hideToast } = useToast();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [rows, setRows] = useState<ReviewQueueItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState<AppliedFilters>({});
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
    [totalElements],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.bookingType) count += 1;
    if (filters.bookingRef) count += 1;
    if (filters.customerEmail) count += 1;
    if (filters.subjectId) count += 1;
    if (filters.rating != null) count += 1;
    if (filters.date) count += 1;
    return count;
  }, [filters]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewModerationService.getFlagQueue({
        page,
        size: PAGE_SIZE,
        ...filters,
      });
      setRows(data.items);
      setTotalElements(data.totalElements);
      setQueueStatus(data.queueStatus);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, showToast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const applyFilters = () => {
    const result = validateDraftFilters(draft);
    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }
    setFilters(result.filters);
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters({});
    setPage(0);
    setFilterOpen(false);
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await reviewModerationService.exportFlagQueue(
        filters,
        format,
        setExportStatus,
      );
      showToast("Flag queue downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const flaggedCount = rows.filter(
    (row) => row.status.toUpperCase() === "REVIEW_FLAGGED",
  ).length;
  const pendingCount = rows.filter(
    (row) => row.status.toUpperCase() === "REVIEW_PENDING",
  ).length;

  const columns = useMemo<GridColDef<ReviewQueueItem>[]>(
    () => [
      {
        field: "bookingRef",
        headerName: "Booking",
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-xs font-semibold text-[#2f3d95]">
              {params.row.bookingRef || "—"}
            </p>
            <span className="mt-1 inline-flex rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
              {formatStatusLabel(params.row.bookingType)}
            </span>
            {params.row.customerEmail ? (
              <p className="mt-1 break-all text-[11px] text-slate-400">
                {params.row.customerEmail}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "subjectName",
        headerName: "Hotel",
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {params.row.subjectName || "—"}
              </p>
              {params.row.subjectType ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatStatusLabel(params.row.subjectType)}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        field: "overallRating",
        headerName: "Rating",
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 ring-1 ring-amber-200">
            <ReviewRatingStars rating={params.row.overallRating} />
          </span>
        ),
      },
      {
        field: "reviewText",
        headerName: "Review",
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0">
            {params.row.title ? (
              <p className="mb-0.5 font-medium text-slate-800">
                {params.row.title}
              </p>
            ) : null}
            <p className="line-clamp-2 text-sm text-slate-700">
              {params.row.reviewText || "—"}
            </p>
            {params.row.media.length > 0 ? (
              <p className="mt-1 text-[11px] font-medium text-violet-600">
                {params.row.media.length} media
              </p>
            ) : null}
            {params.row.reply?.replyText ? (
              <p className="mt-1 text-[11px] font-semibold text-sky-600">
                Hotel replied
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "travellerType",
        headerName: "Traveller",
        width: 130,
        sortable: false,
        renderCell: (params) =>
          params.row.travellerType ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
              <Users className="h-3 w-3" />
              {formatStatusLabel(params.row.travellerType)}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        sortable: false,
        renderCell: (params) => <ReviewStatusBadge status={params.row.status} />,
      },
      {
        field: "autoModerated",
        headerName: "Moderation",
        width: 170,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0">
            {params.row.autoModerated ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                <Flag className="h-3 w-3" />
                Auto
              </span>
            ) : (
              <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                Manual
              </span>
            )}
            {params.row.moderationReason ? (
              <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                {params.row.moderationReason}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "createdAt",
        headerName: "Submitted",
        width: 170,
        sortable: false,
        renderCell: (params) =>
          params.row.createdAt ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatReportDateTime(params.row.createdAt)}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        field: "actions",
        headerName: "Action",
        width: 120,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Link
            to={ROUTES.RATINGS_REVIEWS.DETAIL(params.row.id)}
            state={{ review: params.row }}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </Link>
        ),
      },
    ],
    [],
  );

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
              <ReviewModerationFlowStrip embedded />
              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={filters.date}
                  detail={[
                    queueStatus
                      ? formatStatusLabel(queueStatus)
                      : "All statuses",
                    filters.bookingType
                      ? formatStatusLabel(filters.bookingType)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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
                  disabled={loading}
                  exporting={exporting}
                  exportingLabel={
                    exportStatusLabel(exportStatus) || "Exporting…"
                  }
                  onExportExcel={() => void handleExport("EXCEL")}
                  onExportCSV={() => void handleExport("CSV")}
                  onExportPDF={() => void handleExport("PDF")}
                />
                <ReportRefreshButton
                  onClick={() => void loadQueue()}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReviewModerationStatCard
              label="Queue total"
              value={loading ? "…" : totalElements.toLocaleString("en-IN")}
              sub={
                queueStatus ? formatStatusLabel(queueStatus) : "All statuses"
              }
              icon={ListOrdered}
              tone="navy"
            />
            <ReviewModerationStatCard
              label="On this page"
              value={loading ? "…" : rows.length}
              sub={`Page ${page + 1} of ${totalPages}`}
              icon={Eye}
              tone="slate"
            />
            <ReviewModerationStatCard
              label="Flagged"
              value={loading ? "…" : flaggedCount}
              sub="On current page"
              icon={Flag}
              tone="rose"
            />
            <ReviewModerationStatCard
              label="Pending"
              value={loading ? "…" : pendingCount}
              sub="Awaiting review"
              icon={Clock3}
              tone="amber"
            />
          </div>

          <DataTable
            subtitle={
              loading ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(totalElements, "review")} in queue
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
                activeFilterCount > 0
                  ? "No matching reviews. Try adjusting filters."
                  : "Queue is clear — no reviews waiting for moderation.",
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "flex-start",
                whiteSpace: "normal",
                py: "8px",
              },
            }}
          />
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
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Booking type
          </label>
          <select
            value={draft.bookingType}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                bookingType: e.target.value,
                subjectId: "",
                subjectLabel: "",
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {BOOKING_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatStatusLabel(type)}
              </option>
            ))}
          </select>
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Booking reference
          </label>
          <input
            type="text"
            value={draft.bookingRef}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                bookingRef: e.target.value,
              }))
            }
            placeholder="BRKFFE8"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Partial match, case-insensitive
          </p>
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Customer email
          </label>
          <input
            type="text"
            value={draft.customerEmail}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                customerEmail: e.target.value,
              }))
            }
            placeholder="guest@email.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </section>
        <ReviewSubjectLookupField
          bookingType={draft.bookingType}
          value={draft.subjectId}
          selectedLabel={draft.subjectLabel}
          onChange={({ subjectId, subjectLabel }) =>
            setDraft((prev) => ({ ...prev, subjectId, subjectLabel }))
          }
        />
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Overall rating
          </label>
          <select
            value={draft.rating}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, rating: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {RATING_OPTIONS.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </section>
        <section>
          <p className="mb-1 text-xs font-medium text-slate-600">
            Submitted on (IST day, dd/mm/yyyy)
          </p>
          <ReportCustomDateFields
            singleDate
            singleLabel="Date"
            fromText={draft.dateText}
            onFromTextChange={(value) =>
              setDraft((prev) => ({ ...prev, dateText: value }))
            }
          />
        </section>
      </ReportFilterDrawer>
    </>
  );
}

function filtersToDraft(filters: AppliedFilters): FilterDraft {
  return {
    bookingType: filters.bookingType || "",
    bookingRef: filters.bookingRef || "",
    customerEmail: filters.customerEmail || "",
    subjectId: filters.subjectId || "",
    subjectLabel: "",
    rating:
      filters.rating != null && Number.isFinite(filters.rating)
        ? String(filters.rating)
        : "",
    dateText: filters.date ? isoToReportDateText(filters.date) : "",
  };
}
