import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import type { GridColDef } from "@mui/x-data-grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileUp,
  Hash,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
  Users,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants";
import {
  canGenerateVendorBeneficiaryFile,
  canViewVendorBeneficiaryMis,
} from "@/constants/roles";
import { DataTable, formatListCount } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
} from "@/features/reports/components/ReportFilterDrawer";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatStatusLabel,
  ReportPageHeader,
  SummaryCard,
} from "@/features/reports/components/reportUiHelpers";
import {
  formatVendorBeneficiaryDateTime,
  VendorBeneficiaryStatusPill,
} from "@/features/reports/components/vendorBeneficiaryUi";
import { vendorBeneficiarySbiImportService } from "@/features/reports/services/vendorBeneficiarySbiImportService";
import type {
  SbiImportHistoryItem,
  SbiImportPreview,
  SbiImportRecord,
  SbiImportStatus,
  SbiReconciliationResult,
} from "@/features/reports/services/vendorBeneficiarySbiImportTypes";
import { cn } from "@/lib/utils";

const HISTORY_PAGE_SIZE = 20;

const RESULT_LABELS: Record<SbiReconciliationResult, string> = {
  VERIFIED: "Verified",
  VALIDATION_FAILED_REVIEW_REQUIRED: "Validation Failed – Review Required",
  REJECTED: "Rejected",
  UNMATCHED: "Unmatched",
  DUPLICATE: "Duplicate",
  MISMATCH: "Mismatched",
  REVIEW_REQUIRED: "Review Required",
};

const RESULT_OPTIONS: { value: SbiReconciliationResult | ""; label: string }[] =
  [
    { value: "", label: "All results" },
    { value: "VERIFIED", label: "Verified" },
    {
      value: "VALIDATION_FAILED_REVIEW_REQUIRED",
      label: "Validation Failed – Review Required",
    },
    { value: "REJECTED", label: "Rejected" },
    { value: "REVIEW_REQUIRED", label: "Review Required" },
    { value: "UNMATCHED", label: "Unmatched" },
    { value: "DUPLICATE", label: "Duplicate" },
    { value: "MISMATCH", label: "Mismatched" },
  ];

function formatSbiStatusDisplay(row: SbiImportRecord): string {
  if (row.sbiResponseStatus === "APPROVED") return "Approved";
  if (row.sbiResponseStatus === "REJECTED") return "Rejected";
  if (row.sbiResponseStatus === "UNKNOWN" || !row.sbiStatus?.trim()) {
    return "Not Provided";
  }
  return row.sbiStatus.trim();
}

function formatSbiValidationDisplay(row: SbiImportRecord): string {
  if (row.sbiValidationStatus === "SUCCESS") return "Success";
  if (row.sbiValidationStatus === "FAILURE") return "Failure";
  if (row.validationStatus?.trim()) return row.validationStatus.trim();
  return "Not Provided";
}

const HISTORY_STATUS_OPTIONS: {
  value: SbiImportStatus | "";
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "PREVIEWED", label: "Previewed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "FAILED", label: "Failed" },
];

type FilterDraft = {
  reconciliationResult: SbiReconciliationResult | "";
  historyStatus: SbiImportStatus | "";
  search: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  reconciliationResult: "",
  historyStatus: "",
  search: "",
};

function ResultPill({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const label =
    RESULT_LABELS[value as SbiReconciliationResult] ??
    formatStatusLabel(value);
  const tone =
    value === "VERIFIED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === "REJECTED" || value === "MISMATCH"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : value === "VALIDATION_FAILED_REVIEW_REQUIRED" ||
            value === "REVIEW_REQUIRED" ||
            value === "UNMATCHED" ||
            value === "DUPLICATE"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function CopyIconButton({
  value,
  label,
  onCopied,
}: {
  value?: string | null;
  label: string;
  onCopied: (label: string) => void;
}) {
  if (!value) return null;
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-[#2f3d95]"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(value).then(() => onCopied(label));
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

function DetailField({
  label,
  value,
  mono,
  copyable,
  onCopied,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
  onCopied?: (label: string) => void;
  icon?: typeof Hash;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="rounded-xl bg-slate-50/90 px-3 py-2.5">
      <dt className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3 w-3 text-slate-400" /> : null}
        {label}
      </dt>
      <dd className="mt-1 flex items-start gap-1.5">
        <span
          className={cn(
            "min-w-0 flex-1 break-all text-[13px] font-semibold text-slate-900",
            mono && "font-mono tracking-wide",
          )}
        >
          {display}
        </span>
        {copyable && value?.trim() && onCopied ? (
          <CopyIconButton value={value} label={label} onCopied={onCopied} />
        ) : null}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Hash;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h4 className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-700">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[#2f3d95] shadow-sm ring-1 ring-slate-200/80">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export default function VendorBeneficiarySbiImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canView = canViewVendorBeneficiaryMis(user?.roles);
  const canImport = canGenerateVendorBeneficiaryFile(user?.roles);
  const { toast, showToast, hideToast } = useToast();
  const isSmUp = useMediaQuery("(min-width:640px)");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [applied, setApplied] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [history, setHistory] = useState<SbiImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<SbiImportPreview | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SbiImportRecord | null>(
    null,
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (applied.reconciliationResult) count += 1;
    if (applied.historyStatus) count += 1;
    if (applied.search.trim()) count += 1;
    return count;
  }, [applied]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const page = await vendorBeneficiarySbiImportService.listHistory(
        historyPage,
        HISTORY_PAGE_SIZE,
        applied.historyStatus,
      );
      setHistory(page.items);
      setHistoryTotalPages(page.page.totalPages);
      setHistoryTotalElements(page.page.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [applied.historyStatus, historyPage, showToast]);

  useEffect(() => {
    if (canView) {
      void loadHistory();
    }
  }, [canView, loadHistory]);

  const openFilterDrawer = () => {
    setDraft(applied);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setHistoryPage(0);
    setApplied(draft);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setHistoryPage(0);
    setFilterOpen(false);
  };

  const applyResultKpi = (result: SbiReconciliationResult | "") => {
    setApplied((prev) => ({ ...prev, reconciliationResult: result }));
    setDraft((prev) => ({ ...prev, reconciliationResult: result }));
  };

  const visibleRecords = useMemo(() => {
    if (!preview) return [];
    const q = applied.search.trim().toLowerCase();
    return preview.records.filter((row) => {
      if (
        applied.reconciliationResult &&
        row.reconciliationResult !== applied.reconciliationResult
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.beneficiaryCode,
        row.beneficiaryName,
        row.ifscCode,
        row.sbiStatus,
        row.validationStatus,
        row.errorDescription,
        row.mismatchFields,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [preview, applied.reconciliationResult, applied.search]);

  const notifyCopied = useCallback(
    (label: string) => showToast(`${label} copied`, "success"),
    [showToast],
  );

  const downloadReport = useCallback(
    async (importId: number, fileName?: string | null) => {
      setDownloadingId(importId);
      try {
        await vendorBeneficiarySbiImportService.downloadUploadedReport(
          importId,
          fileName,
        );
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      } finally {
        setDownloadingId(null);
      }
    },
    [showToast],
  );

  const openHistoryItem = useCallback(
    async (item: SbiImportHistoryItem) => {
      try {
        const detail = await vendorBeneficiarySbiImportService.getPreview(
          item.importId,
        );
        setPreview(detail);
        setUploadError(null);
        setApplied((prev) => ({
          ...prev,
          reconciliationResult: "",
          search: "",
        }));
        setDraft((prev) => ({
          ...prev,
          reconciliationResult: "",
          search: "",
        }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        const message = extractErrorMessage(error);
        setUploadError(message);
        showToast(message, "error");
      }
    },
    [showToast],
  );

  const previewColumns: GridColDef[] = useMemo(
    () => [
      {
        field: "beneficiaryCode",
        headerName: "Beneficiary Code",
        flex: 0.9,
        minWidth: 140,
        renderCell: (params) => {
          const code = (params.row as SbiImportRecord).beneficiaryCode;
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-[12px] font-semibold text-[#2f3d95]">
                {code || "—"}
              </span>
              {code ? (
                <CopyIconButton
                  value={code}
                  label="Beneficiary code"
                  onCopied={notifyCopied}
                />
              ) : null}
            </div>
          );
        },
      },
      {
        field: "beneficiaryName",
        headerName: "Beneficiary Name",
        flex: 1.1,
        minWidth: 160,
        renderCell: (params) => (
          <span className="truncate text-[13px] font-medium text-slate-900">
            {(params.row as SbiImportRecord).beneficiaryName || "—"}
          </span>
        ),
      },
      {
        field: "vendorType",
        headerName: "Vendor Type",
        width: 110,
        renderCell: (params) => {
          const type = (params.row as SbiImportRecord).vendorType;
          return (
            <span className="text-[12px] font-semibold text-slate-700">
              {type ? formatStatusLabel(type) : "—"}
            </span>
          );
        },
      },
      {
        field: "sbiStatus",
        headerName: "Bank Status",
        width: 120,
        renderCell: (params) => (
          <span className="text-[12px] font-medium text-slate-800">
            {formatSbiStatusDisplay(params.row as SbiImportRecord)}
          </span>
        ),
      },
      {
        field: "validationStatus",
        headerName: "Bank Validation Status",
        width: 150,
        renderCell: (params) => (
          <span className="text-[12px] font-medium text-slate-800">
            {formatSbiValidationDisplay(params.row as SbiImportRecord)}
          </span>
        ),
      },
      {
        field: "reconciliationResult",
        headerName: "Reconciliation Result",
        width: 200,
        renderCell: (params) => (
          <ResultPill
            value={(params.row as SbiImportRecord).reconciliationResult}
          />
        ),
      },
      {
        field: "errorDescription",
        headerName: "Error Description",
        flex: 1.3,
        minWidth: 200,
        renderCell: (params) => {
          const row = params.row as SbiImportRecord;
          const sbiError = row.errorDescription?.trim() || "";
          const mismatch = row.mismatchFields?.trim()
            ? `Mismatch: ${row.mismatchFields}`
            : "";
          const reason = sbiError || mismatch;
          if (!reason) {
            return <span className="text-slate-400">—</span>;
          }
          return (
            <span className="block truncate text-rose-700" title={reason}>
              {reason}
            </span>
          );
        },
      },
      {
        field: "staycoreBeneficiaryStatus",
        headerName: "StayCore Beneficiary Status",
        width: 170,
        renderCell: (params) => (
          <VendorBeneficiaryStatusPill
            value={(params.row as SbiImportRecord).staycoreBeneficiaryStatus}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Action",
        width: isSmUp ? 100 : 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const row = params.row as SbiImportRecord;
          const needsReview =
            row.reconciliationResult ===
              "VALIDATION_FAILED_REVIEW_REQUIRED" ||
            row.reconciliationResult === "REVIEW_REQUIRED";
          return (
            <button
              type="button"
              onClick={() => setSelectedRecord(row)}
              className={
                isSmUp
                  ? cn(
                      "inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition",
                      needsReview
                        ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-indigo-200 bg-indigo-50 text-[#2f3d95] hover:bg-indigo-100",
                    )
                  : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-[#2f3d95] transition hover:bg-indigo-50"
              }
              title={needsReview ? "Review record" : "View record"}
            >
              <Eye className="h-3.5 w-3.5" />
              {isSmUp ? (needsReview ? "Review" : "View") : null}
            </button>
          );
        },
      },
    ],
    [isSmUp, notifyCopied],
  );

  const historyColumns: GridColDef[] = useMemo(
    () => [
      {
        field: "originalFileName",
        headerName: "Uploaded filename",
        flex: 1.4,
        minWidth: 220,
        renderCell: (params) => {
          const row = params.row as SbiImportHistoryItem;
          return (
            <div className="min-w-0 w-full overflow-hidden leading-tight">
              <div
                className="truncate text-[13px] font-medium text-slate-800"
                title={row.originalFileName || undefined}
              >
                {row.originalFileName || "—"}
              </div>
              <div
                className="truncate font-mono text-[11px] text-[#2f3d95]"
                title={row.importNumber}
              >
                {row.importNumber}
              </div>
            </div>
          );
        },
      },
      {
        field: "uploadedBy",
        headerName: "Imported by",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => {
          const row = params.row as SbiImportHistoryItem;
          const label =
            row.uploadedBy ||
            (row.uploadedByUserId != null
              ? `User #${row.uploadedByUserId}`
              : "—");
          return (
            <span
              className="block w-full truncate text-[12px] text-slate-700"
              title={label === "—" ? undefined : label}
            >
              {label}
            </span>
          );
        },
      },
      {
        field: "uploadedAt",
        headerName: "Import date",
        width: 150,
        minWidth: 150,
        renderCell: (params) => {
          const label = formatVendorBeneficiaryDateTime(
            (params.row as SbiImportHistoryItem).uploadedAt,
          );
          return (
            <span
              className="block w-full truncate whitespace-nowrap text-[12px] text-slate-700"
              title={label === "—" ? undefined : label}
            >
              {label}
            </span>
          );
        },
      },
      {
        field: "totalRecords",
        headerName: "Total",
        width: 72,
        minWidth: 72,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row: SbiImportHistoryItem) =>
          row.summary.totalRecords,
      },
      {
        field: "verifiedCount",
        headerName: "Verified",
        description: "Verified",
        width: 88,
        minWidth: 88,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row: SbiImportHistoryItem) =>
          row.summary.verifiedCount,
      },
      {
        field: "rejectedCount",
        headerName: "Rejected",
        description: "Rejected",
        width: 88,
        minWidth: 88,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row: SbiImportHistoryItem) =>
          row.summary.rejectedCount,
      },
      {
        field: "validationFailedCount",
        headerName: "Val. fail",
        description: "Validation failed",
        width: 88,
        minWidth: 88,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row: SbiImportHistoryItem) =>
          row.summary.validationFailedCount,
      },
      {
        field: "reviewRequiredCount",
        headerName: "Review",
        description: "Review required",
        width: 80,
        minWidth: 80,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row: SbiImportHistoryItem) =>
          row.summary.reviewRequiredCount,
      },
      {
        field: "actions",
        headerName: "Action",
        width: isSmUp ? 140 : 96,
        minWidth: isSmUp ? 140 : 96,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const row = params.row as SbiImportHistoryItem;
          const downloading = downloadingId === row.importId;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                disabled={downloading}
                onClick={() =>
                  void downloadReport(row.importId, row.originalFileName)
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                title="Download report"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void openHistoryItem(row)}
                className={
                  isSmUp
                    ? "inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-semibold text-[#2f3d95] transition hover:bg-indigo-100"
                    : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-[#2f3d95] transition hover:bg-indigo-50"
                }
                title="Open import"
              >
                <Eye className="h-3.5 w-3.5" />
                {isSmUp ? "Open" : null}
              </button>
            </div>
          );
        },
      },
    ],
    [downloadingId, downloadReport, isSmUp, openHistoryItem],
  );

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canImport) return;
    setUploading(true);
    setUploadError(null);
    try {
      const next = await vendorBeneficiarySbiImportService.uploadAndPreview(
        file,
      );
      setPreview(next);
      setUploadError(null);
      setApplied((prev) => ({ ...prev, reconciliationResult: "", search: "" }));
      setDraft((prev) => ({ ...prev, reconciliationResult: "", search: "" }));
      showToast(
        next.summary.processedMessage || "Bank report preview ready",
        "success",
      );
      void loadHistory();
    } catch (error) {
      const message = extractErrorMessage(error);
      setUploadError(message);
      showToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const onConfirm = async () => {
    if (!preview || preview.importStatus !== "PREVIEWED" || !canImport) return;
    setConfirming(true);
    try {
      const result = await vendorBeneficiarySbiImportService.confirm(
        preview.importId,
      );
      showToast(
        result.processedMessage ||
          result.summary.processedMessage ||
          `Import confirmed — ${result.verifiedCount} verified`,
        "success",
      );
      const refreshed = await vendorBeneficiarySbiImportService.getPreview(
        preview.importId,
      );
      setPreview(refreshed);
      void loadHistory();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setConfirming(false);
    }
  };

  const summary = preview?.summary ?? null;
  const filterDetail = [
    applied.reconciliationResult
      ? RESULT_LABELS[applied.reconciliationResult]
      : null,
    applied.historyStatus
      ? formatStatusLabel(applied.historyStatus)
      : null,
    applied.search.trim() || null,
    preview ? preview.importNumber : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!canView) {
    return (
      <div className="p-6 text-sm text-slate-600">
        You do not have access to beneficiary bank imports.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-[#f7f8fa]">
        <div className="mx-auto max-w-350 space-y-3 px-3 py-2 sm:px-4">
          <ReportPageHeader
            title="Beneficiary Bank Report Import"
            description="Upload bank approval report, preview reconciliation, then confirm"
            icon={Landmark}
            iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
            borderClassName="border-emerald-100"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={null}
                  to={null}
                  detail={filterDetail || "All imports"}
                />
                <ReportFilterButton
                  onClick={openFilterDrawer}
                  activeCount={activeFilterCount}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigate(ROUTES.REPORTS.VENDOR_BENEFICIARIES)
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[12px] font-semibold text-[#2f3d95] transition hover:bg-indigo-100"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  MIS
                </button>
                {canImport ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2f3d95] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#26317a] disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Report
                  </button>
                ) : null}
                {preview ? (
                  <button
                    type="button"
                    disabled={downloadingId === preview.importId}
                    onClick={() =>
                      void downloadReport(
                        preview.importId,
                        preview.originalFileName,
                      )
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {downloadingId === preview.importId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                ) : null}
                {canImport && preview?.importStatus === "PREVIEWED" ? (
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => void onConfirm()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {confirming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Confirm Import
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  disabled={historyLoading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  title="Refresh"
                >
                  {historyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx,.txt,.tsv,text/plain,application/vnd.ms-excel"
                  className="hidden"
                  disabled={uploading || !canImport}
                  onChange={(e) => void onFileSelected(e)}
                />
              </div>
            }
          />

          {!canImport ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
              Auditor view only — upload/confirm requires Accountant or Finance
              Manager.
            </p>
          ) : null}

          {uploadError ? (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-[13px] font-medium text-rose-800">
                  {uploadError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="shrink-0 rounded-md p-1 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {preview && summary ? (
            <>
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-900">
                {summary.processedMessage}
              </p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
                <SummaryCard
                  label="Total Records"
                  value={summary.totalRecords.toLocaleString("en-IN")}
                  icon={Users}
                  tone="indigo"
                  active={!applied.reconciliationResult}
                  onClick={() => applyResultKpi("")}
                />
                <SummaryCard
                  label="Verified"
                  value={summary.verifiedCount.toLocaleString("en-IN")}
                  icon={CheckCircle2}
                  tone="emerald"
                  active={applied.reconciliationResult === "VERIFIED"}
                  onClick={() => applyResultKpi("VERIFIED")}
                />
                <SummaryCard
                  label="Rejected"
                  value={summary.rejectedCount.toLocaleString("en-IN")}
                  icon={X}
                  tone="danger"
                  active={applied.reconciliationResult === "REJECTED"}
                  onClick={() => applyResultKpi("REJECTED")}
                />
                <SummaryCard
                  label="Validation Failed"
                  value={summary.validationFailedCount.toLocaleString("en-IN")}
                  icon={ShieldAlert}
                  tone="amber"
                  active={
                    applied.reconciliationResult ===
                    "VALIDATION_FAILED_REVIEW_REQUIRED"
                  }
                  onClick={() =>
                    applyResultKpi("VALIDATION_FAILED_REVIEW_REQUIRED")
                  }
                />
                <SummaryCard
                  label="Review Required"
                  value={summary.reviewRequiredCount.toLocaleString("en-IN")}
                  icon={AlertTriangle}
                  tone="amber"
                  active={
                    applied.reconciliationResult === "REVIEW_REQUIRED" ||
                    applied.reconciliationResult ===
                      "VALIDATION_FAILED_REVIEW_REQUIRED"
                  }
                  onClick={() =>
                    applyResultKpi("VALIDATION_FAILED_REVIEW_REQUIRED")
                  }
                />
                <SummaryCard
                  label="Unmatched"
                  value={summary.unmatchedCount.toLocaleString("en-IN")}
                  icon={AlertTriangle}
                  tone="amber"
                  active={applied.reconciliationResult === "UNMATCHED"}
                  onClick={() => applyResultKpi("UNMATCHED")}
                />
                <SummaryCard
                  label="Mismatched"
                  value={summary.mismatchCount.toLocaleString("en-IN")}
                  icon={AlertTriangle}
                  tone="danger"
                  active={applied.reconciliationResult === "MISMATCH"}
                  onClick={() => applyResultKpi("MISMATCH")}
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              disabled={!canImport || uploading}
              onClick={() => {
                if (!canImport || uploading) return;
                fileInputRef.current?.click();
              }}
              className={cn(
                "w-full rounded-xl border border-dashed px-6 py-10 text-center transition",
                canImport
                  ? "border-slate-300 bg-white hover:border-[#2f3d95]/50 hover:bg-indigo-50/40"
                  : "cursor-not-allowed border-slate-200 bg-slate-50",
              )}
            >
              {uploading ? (
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#2f3d95]" />
              ) : (
                <FileUp className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              )}
              <p className="text-sm font-medium text-slate-700">
                {uploading
                  ? "Uploading bank report…"
                  : "No report loaded yet"}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {canImport
                  ? "Use Upload Report in the header, click here, or open an import from history below."
                  : "Open a previous import from history below."}
              </p>
            </button>
          )}

          {preview ? (
            <DataTable
              title={`Preview — ${preview.importNumber}`}
              subtitle={
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(visibleRecords.length, "record")}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · {preview.originalFileName} ·{" "}
                    {formatVendorBeneficiaryDateTime(preview.uploadedAt)} ·{" "}
                    {formatStatusLabel(preview.importStatus)}
                  </span>
                </>
              }
              rows={visibleRecords}
              columns={previewColumns}
              getRowId={(row) =>
                row.id != null && !Number.isNaN(row.id)
                  ? row.id
                  : `row-${row.rowNumber}`
              }
              height={440}
              disableRowSelectionOnClick
              disableColumnFilter
              showToolbar
              showExport={false}
              allowHorizontalScroll
              dense={false}
              rowHeight={isSmUp ? 56 : 48}
              localeText={{
                noRowsLabel: "No records match the current filters.",
              }}
              sx={{
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                  display: "flex",
                  overflow: "hidden",
                },
                "& .MuiDataGrid-cellContent": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                },
                "& .MuiDataGrid-virtualScroller": {
                  overflowX: "auto !important",
                },
              }}
            />
          ) : null}

          <DataTable
            title="Import History"
            subtitle={
              <>
                <span className="font-medium text-slate-600">
                  {formatListCount(historyTotalElements, "import")}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {historyPage + 1} of {Math.max(historyTotalPages, 1)}
                </span>
              </>
            }
            rows={history}
            columns={historyColumns}
            getRowId={(row) => row.importId}
            loading={historyLoading}
            paginationMode="server"
            rowCount={historyTotalElements}
            paginationModel={{
              page: historyPage,
              pageSize: HISTORY_PAGE_SIZE,
            }}
            onPaginationModelChange={(model) => {
              if (model.page !== historyPage) setHistoryPage(model.page);
            }}
            pageSizeOptions={[HISTORY_PAGE_SIZE]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            dense={false}
            rowHeight={isSmUp ? 56 : 48}
            localeText={{
              noRowsLabel: "No imports yet.",
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "center",
                display: "flex",
                overflow: "hidden",
              },
              "& .MuiDataGrid-cellContent": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "auto !important",
              },
            }}
          />
        </div>
      </div>

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Filters</h3>
              <p className="text-[12px] text-slate-500">
                Preview KPIs follow reconciliation result; history uses status
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Reconciliation result
                </span>
                <select
                  value={draft.reconciliationResult}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      reconciliationResult: e.target
                        .value as SbiReconciliationResult | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                >
                  {RESULT_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Import history status
                </span>
                <select
                  value={draft.historyStatus}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      historyStatus: e.target.value as SbiImportStatus | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                >
                  {HISTORY_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Search preview records
                </span>
                <input
                  value={draft.search}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Code, name, IFSC, or error text"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                />
              </label>
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="mb-2 text-[12px] font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
              <ReportFilterActions
                onReset={resetFilters}
                onApply={applyFilters}
              />
            </div>
          </div>
        </div>
      ) : null}

      {selectedRecord ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
          <button
            type="button"
            className="flex-1"
            onClick={() => setSelectedRecord(null)}
            aria-label="Close record details"
          />
          <div className="flex h-full w-full max-w-lg flex-col bg-[#f8f9fc] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-indigo-100 bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Bank report row
                  </p>
                  <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900">
                    Record #{selectedRecord.rowNumber}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ResultPill value={selectedRecord.reconciliationResult} />
                    {selectedRecord.staycoreBeneficiaryStatus ? (
                      <VendorBeneficiaryStatusPill
                        value={selectedRecord.staycoreBeneficiaryStatus}
                      />
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(selectedRecord.reconciliationResult ===
                "VALIDATION_FAILED_REVIEW_REQUIRED" ||
                selectedRecord.reconciliationResult === "REVIEW_REQUIRED") &&
              canImport ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
                  <p className="font-semibold">Finance review required</p>
                  <p className="mt-1">
                    Validation failure is not a bank rejection. Beneficiary
                    stays SUBMITTED_TO_BANK until a later Approved+Success
                    report is confirmed. There is no action to mark this as
                    Verified without bank confirmation.
                  </p>
                </div>
              ) : null}

              <DetailSection title="Beneficiary" icon={Users}>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <DetailField
                    label="Code"
                    value={selectedRecord.beneficiaryCode}
                    mono
                    copyable
                    onCopied={notifyCopied}
                    icon={Hash}
                  />
                  <DetailField
                    label="Name"
                    value={selectedRecord.beneficiaryName}
                  />
                  <DetailField
                    label="Vendor Type"
                    value={
                      selectedRecord.vendorType
                        ? formatStatusLabel(selectedRecord.vendorType)
                        : null
                    }
                  />
                  <DetailField
                    label="Vendor Name"
                    value={selectedRecord.staycoreVendorName}
                  />
                  <DetailField
                    label="Account (masked)"
                    value={selectedRecord.maskedAccountNumber}
                    mono
                  />
                  <DetailField
                    label="IFSC"
                    value={selectedRecord.ifscCode}
                    mono
                    copyable
                    onCopied={notifyCopied}
                  />
                </dl>
              </DetailSection>

              <DetailSection title="Bank Response" icon={Landmark}>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <DetailField
                    label="Bank Status"
                    value={formatSbiStatusDisplay(selectedRecord)}
                  />
                  <DetailField
                    label="Bank Validation Status"
                    value={formatSbiValidationDisplay(selectedRecord)}
                  />
                  <DetailField
                    label="Reconciliation Result"
                    value={
                      RESULT_LABELS[selectedRecord.reconciliationResult] ??
                      selectedRecord.reconciliationResult
                    }
                  />
                  <DetailField
                    label="StayCore Beneficiary Status"
                    value={selectedRecord.staycoreBeneficiaryStatus}
                  />
                  <DetailField
                    label="Error Description"
                    value={selectedRecord.errorDescription}
                  />
                  <DetailField
                    label="Mismatch Fields"
                    value={selectedRecord.mismatchFields}
                  />
                </dl>
              </DetailSection>

              <DetailSection title="Submitted batch snapshot" icon={FileUp}>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <DetailField
                    label="Batch number"
                    value={selectedRecord.staycoreBatchNumber}
                    mono
                  />
                  <DetailField
                    label="Batch ID"
                    value={
                      selectedRecord.staycoreBatchId != null
                        ? String(selectedRecord.staycoreBatchId)
                        : null
                    }
                    mono
                  />
                  <DetailField
                    label="Account holder"
                    value={selectedRecord.staycoreAccountHolderName}
                  />
                  <DetailField
                    label="Account (masked)"
                    value={selectedRecord.staycoreMaskedAccountNumber}
                    mono
                  />
                  <DetailField
                    label="IFSC"
                    value={selectedRecord.staycoreIfscCode}
                    mono
                  />
                  <DetailField
                    label="Applied on confirm"
                    value={selectedRecord.applied ? "Yes" : "No"}
                  />
                </dl>
              </DetailSection>
            </div>
            <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
              {canImport && selectedRecord.staycoreBeneficiaryId != null ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecord(null);
                    navigate(ROUTES.REPORTS.VENDOR_BENEFICIARIES);
                  }}
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-[13px] font-semibold text-[#2f3d95] transition hover:bg-indigo-100"
                >
                  Open Vendor Beneficiary MIS
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
