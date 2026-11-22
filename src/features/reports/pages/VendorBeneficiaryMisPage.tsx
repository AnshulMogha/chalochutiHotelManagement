import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import type {
  GridColDef,
  GridColumnVisibilityModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Download,
  FileText,
  Hash,
  History,
  Landmark,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { DataTable, formatListCount } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  canActionSbiRejectedBeneficiary,
  canGenerateVendorBeneficiaryFile,
  canViewVendorBeneficiaryMis,
  canRebuildVendorBeneficiaryMis,
} from "@/constants/roles";
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
import { VendorBeneficiaryStatusPill } from "@/features/reports/components/vendorBeneficiaryUi";
import { vendorBeneficiaryMisService } from "@/features/reports/services/vendorBeneficiaryMisService";
import type {
  BeneficiaryRegistrationStatus,
  InternalBankVerificationStatus,
  VendorBeneficiaryDetail,
  VendorBeneficiaryMisRow,
  VendorBeneficiaryMisSummary,
  VendorBeneficiaryTypeFilter,
} from "@/features/reports/services/vendorBeneficiaryMisTypes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const VENDOR_TYPE_OPTIONS: { value: VendorBeneficiaryTypeFilter; label: string }[] = [
  { value: "ALL", label: "All vendors" },
  { value: "HOTEL", label: "Hotel" },
  { value: "TRANSPORT", label: "Transport" },
];

const BENEFICIARY_STATUS_OPTIONS: BeneficiaryRegistrationStatus[] = [
  "NOT_SUBMITTED",
  "FILE_GENERATED",
  "SUBMITTED_TO_BANK",
  "PENDING_APPROVAL",
  "VERIFIED",
  "REJECTED",
  "UPDATE_REQUIRED",
];

const INTERNAL_STATUS_OPTIONS: InternalBankVerificationStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

type FilterDraft = {
  vendorType: VendorBeneficiaryTypeFilter;
  beneficiaryStatus: BeneficiaryRegistrationStatus | "";
  internalBankVerificationStatus: InternalBankVerificationStatus | "";
  search: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  vendorType: "ALL",
  beneficiaryStatus: "",
  internalBankVerificationStatus: "",
  search: "",
};

function StatusPill({ value }: { value?: string | null }) {
  return <VendorBeneficiaryStatusPill value={value} />;
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
  highlight,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
  onCopied?: (label: string) => void;
  icon?: typeof Phone;
  highlight?: boolean;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5",
        highlight
          ? "border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-violet-50/60"
          : "bg-slate-50/90",
      )}
    >
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
  tone = "slate",
}: {
  title: string;
  icon: typeof Phone;
  children: ReactNode;
  tone?: "slate" | "indigo" | "emerald";
}) {
  const toneClass =
    tone === "indigo"
      ? "border-indigo-100 bg-indigo-50/40"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50/40"
        : "border-slate-200 bg-white";
  return (
    <section className={cn("rounded-xl border p-3.5", toneClass)}>
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

const EMPTY_SELECTION: GridRowSelectionModel = {
  type: "include",
  ids: new Set(),
};

export default function VendorBeneficiaryMisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRebuild = canRebuildVendorBeneficiaryMis(user?.roles);
  const canGenerate = canGenerateVendorBeneficiaryFile(user?.roles);
  const canViewHistory = canViewVendorBeneficiaryMis(user?.roles);
  const canRejectedAction = canActionSbiRejectedBeneficiary(user?.roles);
  const { toast, showToast, hideToast } = useToast();
  const isSmUp = useMediaQuery("(min-width:640px)");
  const isMdUp = useMediaQuery("(min-width:768px)");

  const [applied, setApplied] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildConfirmOpen, setRebuildConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [rows, setRows] = useState<VendorBeneficiaryMisRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<VendorBeneficiaryMisSummary>({
    totalBeneficiaries: 0,
    verifiedBeneficiaries: 0,
    fileGenerated: 0,
    pendingApproval: 0,
    notSubmitted: 0,
    rejected: 0,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<VendorBeneficiaryDetail | null>(null);
  const [rowDownloadingId, setRowDownloadingId] = useState<number | null>(null);
  const [rejectedAction, setRejectedAction] = useState<
    "correction" | "retry" | null
  >(null);
  const [rejectedRemarks, setRejectedRemarks] = useState("");
  const [sbiIssueResolvedConfirmed, setSbiIssueResolvedConfirmed] =
    useState(false);
  const [rejectedActionSubmitting, setRejectedActionSubmitting] =
    useState(false);

  const selectedIds = useMemo(() => {
    if (rowSelectionModel.type !== "include") return [] as number[];
    return Array.from(rowSelectionModel.ids)
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }, [rowSelectionModel]);

  const activeFilterCount = useMemo(
    () =>
      (applied.vendorType !== "ALL" ? 1 : 0) +
      (applied.beneficiaryStatus ? 1 : 0) +
      (applied.internalBankVerificationStatus ? 1 : 0) +
      (applied.search.trim() ? 1 : 0),
    [applied],
  );

  const notifyCopied = useCallback(
    (label: string) => showToast(`${label} copied`, "success"),
    [showToast],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorBeneficiaryMisService.getDashboard({
        page,
        size: PAGE_SIZE,
        vendorType: applied.vendorType,
        beneficiaryStatus: applied.beneficiaryStatus || undefined,
        internalBankVerificationStatus:
          applied.internalBankVerificationStatus || undefined,
        search: applied.search.trim() || undefined,
        sort: "updatedAt",
        sortDir: "desc",
      });
      setRows(response.beneficiaries);
      setSummary(response.summary);
      setTotalPages(response.page.totalPages);
      setTotalElements(response.page.totalElements);
      setRowSelectionModel(EMPTY_SELECTION);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied, page, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openFilterDrawer = () => {
    setDraft(applied);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setApplied(draft);
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(0);
    setFilterOpen(false);
  };

  const openDetail = useCallback(
    async (beneficiaryId: number) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const data = await vendorBeneficiaryMisService.getDetail(beneficiaryId);
        setDetail(data);
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
        setDetailOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  const downloadRowFile = useCallback(
    async (row: VendorBeneficiaryMisRow) => {
      setRowDownloadingId(row.beneficiaryId);
      try {
        await vendorBeneficiaryMisService.downloadBeneficiaryFile(
          row.beneficiaryId,
          row.beneficiaryCode,
        );
        showToast(`Downloaded ${row.beneficiaryCode || "beneficiary"} file`, "success");
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      } finally {
        setRowDownloadingId(null);
      }
    },
    [showToast],
  );

  const openRejectedAction = (action: "correction" | "retry") => {
    setRejectedAction(action);
    setRejectedRemarks("");
    setSbiIssueResolvedConfirmed(false);
  };

  const closeRejectedAction = () => {
    if (rejectedActionSubmitting) return;
    setRejectedAction(null);
    setRejectedRemarks("");
    setSbiIssueResolvedConfirmed(false);
  };

  const submitRejectedAction = async () => {
    if (!detail || !rejectedAction) return;
    const remarks = rejectedRemarks.trim();
    if (!remarks) {
      showToast("Remarks are required", "error");
      return;
    }
    if (rejectedAction === "retry" && !sbiIssueResolvedConfirmed) {
      showToast("Confirm that the bank-side issue has been resolved", "error");
      return;
    }
    setRejectedActionSubmitting(true);
    try {
      const result =
        rejectedAction === "correction"
          ? await vendorBeneficiaryMisService.markVendorCorrectionRequired(
              detail.beneficiaryId,
              { remarks },
            )
          : await vendorBeneficiaryMisService.retrySbiRegistration(
              detail.beneficiaryId,
              { remarks, sbiIssueResolvedConfirmed: true },
            );
      showToast(
        result.message ||
          (rejectedAction === "correction"
            ? "Vendor correction required"
            : "Bank registration retry queued"),
        "success",
      );
      setRejectedAction(null);
      setRejectedRemarks("");
      setSbiIssueResolvedConfirmed(false);
      const refreshed = await vendorBeneficiaryMisService.getDetail(
        detail.beneficiaryId,
      );
      setDetail(refreshed);
      void load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setRejectedActionSubmitting(false);
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const result = await vendorBeneficiaryMisService.rebuild();
      showToast(
        `Synced ${result.hotelUpserted} hotel + ${result.transportUpserted} transport beneficiaries`,
        "success",
      );
      setRebuildConfirmOpen(false);
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setRebuilding(false);
    }
  };

  const applyStatusKpi = (status: BeneficiaryRegistrationStatus | "") => {
    setApplied((prev) => ({ ...prev, beneficiaryStatus: status }));
    setDraft((prev) => ({ ...prev, beneficiaryStatus: status }));
    setPage(0);
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      showToast("Select at least one eligible beneficiary", "error");
      return;
    }
    setGenerating(true);
    try {
      const result =
        await vendorBeneficiaryMisService.generateBatch(selectedIds);
      showToast(
        `Generated ${result.batchNumber} (${result.totalRecords} records)`,
        "success",
      );
      setGenerateConfirmOpen(false);
      setRowSelectionModel(EMPTY_SELECTION);
      await vendorBeneficiaryMisService.downloadBatch(
        result.batchId,
        result.fileName,
      );
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setGenerating(false);
    }
  };

  const columns = useMemo<GridColDef<VendorBeneficiaryMisRow>[]>(
    () => [
      {
        field: "beneficiaryCode",
        headerName: "Code",
        width: 148,
        renderCell: ({ row }) => (
          <span
            className="font-mono text-[12px] font-semibold text-slate-800"
            title={row.beneficiaryCode || undefined}
          >
            {row.beneficiaryCode || "—"}
          </span>
        ),
      },
      {
        field: "vendorName",
        headerName: "Vendor",
        minWidth: 160,
        flex: 1,
        renderCell: ({ row }) => (
          <p
            className="truncate text-[13px] font-medium text-slate-800"
            title={row.vendorName || undefined}
          >
            {row.vendorName || "—"}
          </p>
        ),
      },
      {
        field: "vendorType",
        headerName: "Type",
        width: 108,
        renderCell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
            {row.vendorType === "TRANSPORT" ? (
              <Bus className="h-3.5 w-3.5 text-sky-600" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            )}
            {formatStatusLabel(row.vendorType)}
          </span>
        ),
      },
      {
        field: "contact",
        headerName: "Contact",
        minWidth: 220,
        flex: 1.2,
        renderCell: ({ row }) => (
          <div className="w-full min-w-0 space-y-1 py-1 pr-1">
            <div className="flex min-w-0 items-center gap-1">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              <span
                className="min-w-0 flex-1 truncate text-[12px] text-slate-700"
                title={row.contactMobile || undefined}
              >
                {row.contactMobile || "—"}
              </span>
              <CopyIconButton
                value={row.contactMobile}
                label="Mobile"
                onCopied={notifyCopied}
              />
            </div>
            {isSmUp ? (
              <div className="flex min-w-0 items-center gap-1">
                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                <span
                  className="min-w-0 flex-1 truncate text-[12px] text-slate-700"
                  title={row.contactEmail || undefined}
                >
                  {row.contactEmail || "—"}
                </span>
                <CopyIconButton
                  value={row.contactEmail}
                  label="Email"
                  onCopied={notifyCopied}
                />
              </div>
            ) : null}
          </div>
        ),
      },
      {
        field: "bankName",
        headerName: "Bank",
        minWidth: 140,
        flex: 0.9,
        renderCell: ({ row }) => (
          <div className="min-w-0 py-1">
            <p
              className="truncate text-[13px] text-slate-800"
              title={row.bankName || undefined}
            >
              {row.bankName || "—"}
            </p>
            {isMdUp ? (
              <p
                className="truncate font-mono text-[11px] text-slate-500"
                title={row.ifscCode || undefined}
              >
                {row.ifscCode || "—"}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        field: "internalBankVerificationStatus",
        headerName: "Internal verify",
        minWidth: 140,
        flex: 0.8,
        renderCell: ({ row }) => (
          <StatusPill value={row.internalBankVerificationStatus} />
        ),
      },
      {
        field: "beneficiaryStatus",
        headerName: "Beneficiary Status",
        minWidth: 140,
        flex: 0.8,
        renderCell: ({ row }) => <StatusPill value={row.beneficiaryStatus} />,
      },
      {
        field: "actions",
        headerName: "",
        width: 128,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => {
          const canDownloadRow = row.beneficiaryStatus !== "NOT_SUBMITTED";
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void openDetail(row.beneficiaryId)}
                title="View beneficiary details"
                aria-label={`View details for ${row.vendorName || row.beneficiaryCode}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-semibold text-[#2f3d95] transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f3d95]/40"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                View
              </button>
              <button
                type="button"
                disabled={
                  !canDownloadRow || rowDownloadingId === row.beneficiaryId
                }
                onClick={() => void downloadRowFile(row)}
                title={
                  canDownloadRow
                    ? "Download generated beneficiary file for this vendor"
                    : "No generated file yet — generate a beneficiary file first"
                }
                aria-label={`Download file for ${row.vendorName || row.beneficiaryCode}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-white text-[#2f3d95] transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {rowDownloadingId === row.beneficiaryId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [downloadRowFile, isMdUp, isSmUp, notifyCopied, openDetail, rowDownloadingId],
  );

  const columnVisibilityModel = useMemo<GridColumnVisibilityModel>(
    () => ({
      bankName: isSmUp,
      internalBankVerificationStatus: isMdUp,
    }),
    [isMdUp, isSmUp],
  );

  return (
    <>
      <div className="min-h-full bg-[#f7f8fa]">
        <div className="mx-auto max-w-350 space-y-3 px-3 py-2 sm:px-4">
          <ReportPageHeader
            title="Vendor Beneficiary MIS"
            description="Hotel + transport bank beneficiaries for Finance"
            icon={Wallet}
            iconClassName="bg-gradient-to-br from-indigo-500 to-violet-600"
            borderClassName="border-indigo-100"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <ReportAppliedRange
                  from={null}
                  to={null}
                  detail={
                    [
                      applied.vendorType !== "ALL"
                        ? formatStatusLabel(applied.vendorType)
                        : "All vendors",
                      applied.beneficiaryStatus
                        ? formatStatusLabel(applied.beneficiaryStatus)
                        : null,
                      applied.internalBankVerificationStatus
                        ? `Bank ${formatStatusLabel(applied.internalBankVerificationStatus)}`
                        : null,
                      applied.search.trim() || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "All beneficiaries"
                  }
                />
                <ReportFilterButton
                  onClick={openFilterDrawer}
                  activeCount={activeFilterCount}
                />
                {canGenerate ? (
                  <button
                    type="button"
                    onClick={() => setGenerateConfirmOpen(true)}
                    disabled={
                      generating || loading || selectedIds.length === 0
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2f3d95] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#26317a] disabled:opacity-60"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Generate Beneficiary File
                    {selectedIds.length > 0 ? (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                        {selectedIds.length}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                {canViewHistory ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(ROUTES.REPORTS.VENDOR_BENEFICIARY_FILE_HISTORY)
                    }
                    disabled={loading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[12px] font-semibold text-[#2f3d95] transition hover:bg-indigo-100 disabled:opacity-60"
                  >
                    <History className="h-3.5 w-3.5" />
                    File History
                  </button>
                ) : null}
                {canViewHistory ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(ROUTES.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT)
                    }
                    disabled={loading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Bank Import
                  </button>
                ) : null}
                {canRebuild ? (
                  <button
                    type="button"
                    onClick={() => setRebuildConfirmOpen(true)}
                    disabled={rebuilding || loading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {rebuilding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Rebuild
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  title="Refresh"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              label="Total Beneficiaries"
              value={
                loading ? "…" : summary.totalBeneficiaries.toLocaleString("en-IN")
              }
              icon={Users}
              tone="indigo"
              active={!applied.beneficiaryStatus}
              onClick={() => applyStatusKpi("")}
            />
            <SummaryCard
              label="Verified"
              value={
                loading
                  ? "…"
                  : summary.verifiedBeneficiaries.toLocaleString("en-IN")
              }
              icon={CheckCircle2}
              tone="emerald"
              active={applied.beneficiaryStatus === "VERIFIED"}
              onClick={() => applyStatusKpi("VERIFIED")}
            />
            <SummaryCard
              label="File Generated"
              value={
                loading ? "…" : summary.fileGenerated.toLocaleString("en-IN")
              }
              icon={FileText}
              tone="blue"
              active={applied.beneficiaryStatus === "FILE_GENERATED"}
              onClick={() => applyStatusKpi("FILE_GENERATED")}
            />
            <SummaryCard
              label="Not Submitted"
              value={
                loading ? "…" : summary.notSubmitted.toLocaleString("en-IN")
              }
              icon={Wallet}
              tone="sky"
              active={applied.beneficiaryStatus === "NOT_SUBMITTED"}
              onClick={() => applyStatusKpi("NOT_SUBMITTED")}
            />
            <SummaryCard
              label="Pending Approval"
              value={
                loading ? "…" : summary.pendingApproval.toLocaleString("en-IN")
              }
              icon={Clock}
              tone="amber"
              active={applied.beneficiaryStatus === "PENDING_APPROVAL"}
              onClick={() => applyStatusKpi("PENDING_APPROVAL")}
            />
            <SummaryCard
              label="Rejected"
              value={loading ? "…" : summary.rejected.toLocaleString("en-IN")}
              icon={ShieldAlert}
              tone="danger"
              active={applied.beneficiaryStatus === "REJECTED"}
              onClick={() => applyStatusKpi("REJECTED")}
            />
          </div>

          <DataTable
            title="Beneficiaries"
            subtitle={
              <>
                <span className="font-medium text-slate-600">
                  {formatListCount(totalElements, "beneficiary")}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
                {canGenerate && selectedIds.length > 0 ? (
                  <span className="ml-1 font-semibold text-[#2f3d95]">
                    · {selectedIds.length} selected for file
                  </span>
                ) : null}
              </>
            }
            rows={rows}
            columns={columns}
            getRowId={(row) => row.beneficiaryId}
            loading={loading}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize: PAGE_SIZE }}
            onPaginationModelChange={(model) => {
              if (model.page !== page) setPage(model.page);
            }}
            pageSizeOptions={[PAGE_SIZE]}
            checkboxSelection={canGenerate}
            keepNonExistentRowsSelected
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(model) => setRowSelectionModel(model)}
            isRowSelectable={(params) =>
              Boolean(
                (params.row as VendorBeneficiaryMisRow)
                  .eligibleForFileGeneration,
              )
            }
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            allowHorizontalScroll
            dense={false}
            rowHeight={isSmUp ? 64 : 52}
            columnVisibilityModel={columnVisibilityModel}
            localeText={{
              noRowsLabel:
                "No beneficiaries found. Try Rebuild or adjust filters.",
            }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "center",
                display: "flex",
                overflow: "visible",
              },
              "& .MuiDataGrid-columnHeader": {
                overflow: "visible",
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
                Summary cards follow vendor type only
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Vendor type
                </span>
                <select
                  value={draft.vendorType}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      vendorType: e.target.value as VendorBeneficiaryTypeFilter,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                >
                  {VENDOR_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Beneficiary status
                </span>
                <select
                  value={draft.beneficiaryStatus}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      beneficiaryStatus: e.target
                        .value as BeneficiaryRegistrationStatus | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                >
                  <option value="">All</option>
                  {BENEFICIARY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Internal bank verification
                </span>
                <select
                  value={draft.internalBankVerificationStatus}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      internalBankVerificationStatus: e.target
                        .value as InternalBankVerificationStatus | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px]"
                >
                  <option value="">All</option>
                  {INTERNAL_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </span>
                <input
                  value={draft.search}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Vendor name, ID, or beneficiary code"
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
              <ReportFilterActions onReset={resetFilters} onApply={applyFilters} />
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
          <button
            type="button"
            className="flex-1"
            onClick={() => setDetailOpen(false)}
            aria-label="Close beneficiary details"
          />
          <div className="flex h-full w-full max-w-lg flex-col bg-[#f8f9fc] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-indigo-100 bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    Vendor beneficiary
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-bold text-slate-900">
                    {detail?.vendorName || "Beneficiary details"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2f3d95] ring-1 ring-inset ring-indigo-200">
                      <Hash className="h-3 w-3" />
                      {detail?.beneficiaryCode || "—"}
                    </span>
                    {detail ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        {detail.vendorType === "TRANSPORT" ? (
                          <Bus className="h-3 w-3 text-sky-600" />
                        ) : (
                          <Building2 className="h-3 w-3 text-indigo-600" />
                        )}
                        {formatStatusLabel(detail.vendorType)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {detailLoading || !detail ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin text-[#2f3d95]" />
                  <p className="text-[12px] font-medium">Loading details…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <DetailSection title="Contact" icon={Phone} tone="indigo">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <DetailField
                        label="Mobile"
                        value={detail.contactMobile}
                        icon={Phone}
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                      <DetailField
                        label="Email"
                        value={detail.contactEmail}
                        icon={Mail}
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection title="Authorized bank details" icon={Landmark}>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <DetailField
                        label="Bank"
                        value={detail.bankName}
                        icon={Landmark}
                      />
                      <DetailField
                        label="Branch"
                        value={detail.bankBranch}
                        icon={Building2}
                      />
                      <DetailField
                        label="IFSC"
                        value={detail.ifscCode}
                        icon={Hash}
                        mono
                        copyable
                        onCopied={notifyCopied}
                      />
                      <DetailField
                        label="Bank type"
                        value={
                          detail.bankType === "SB"
                            ? "Same bank (SB)"
                            : detail.bankType === "OB"
                              ? "Other bank (OB)"
                              : null
                        }
                        icon={CreditCard}
                      />
                      <DetailField
                        label="Account holder"
                        value={detail.accountHolderName}
                        icon={Users}
                      />
                      <DetailField
                        label="Account number"
                        value={detail.accountNumber}
                        icon={Wallet}
                        mono
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection title="Verification status" icon={ShieldAlert} tone="emerald">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/80">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Internal bank verification
                        </p>
                        <div className="mt-1.5">
                          <StatusPill
                            value={detail.internalBankVerificationStatus}
                          />
                        </div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/80">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Beneficiary status
                        </p>
                        <div className="mt-1.5">
                          <StatusPill value={detail.beneficiaryStatus} />
                        </div>
                      </div>
                    </div>
                    {detail.beneficiaryStatus === "VERIFIED" ? (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Verified at"
                          value={
                            detail.verifiedAt
                              ? new Date(detail.verifiedAt).toLocaleString(
                                  "en-IN",
                                )
                              : null
                          }
                          icon={Clock}
                        />
                        <DetailField
                          label="Verified by"
                          value={
                            detail.verifiedBy ||
                            (detail.verifiedByUserId
                              ? `User #${detail.verifiedByUserId}`
                              : null)
                          }
                          icon={Users}
                        />
                        <DetailField
                          label="Verified report file"
                          value={detail.verifiedReportFileName}
                          icon={FileText}
                        />
                      </dl>
                    ) : null}
                    {detail.sbiResponseStatus ||
                    detail.sbiValidationStatus ||
                    detail.sbiErrorDescription ? (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Beneficiary Status"
                          value={detail.sbiResponseStatus}
                          icon={Landmark}
                        />
                        <DetailField
                          label="Bank Validation"
                          value={detail.sbiValidationStatus}
                          icon={ShieldAlert}
                        />
                        <DetailField
                          label="Bank Error"
                          value={detail.sbiErrorDescription}
                        />
                        <DetailField
                          label="Bank response at"
                          value={
                            detail.sbiResponseReceivedAt
                              ? new Date(
                                  detail.sbiResponseReceivedAt,
                                ).toLocaleString("en-IN")
                              : null
                          }
                          icon={Clock}
                        />
                      </dl>
                    ) : null}
                    {detail.financeAction &&
                    detail.financeAction !== "NONE" ? (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Finance action"
                          value={
                            detail.financeAction === "SBI_RETRY"
                              ? "Bank Retry"
                              : formatStatusLabel(detail.financeAction)
                          }
                          icon={ShieldAlert}
                        />
                        <DetailField
                          label="Finance remarks"
                          value={detail.financeActionRemarks}
                        />
                        <DetailField
                          label="Action at"
                          value={
                            detail.financeActionAt
                              ? new Date(
                                  detail.financeActionAt,
                                ).toLocaleString("en-IN")
                              : null
                          }
                          icon={Clock}
                        />
                        <DetailField
                          label="Action by"
                          value={
                            detail.financeActionByUserId
                              ? `User #${detail.financeActionByUserId}`
                              : null
                          }
                          icon={Users}
                        />
                      </dl>
                    ) : null}
                    {detail.lastUpdated ? (
                      <p className="mt-3 text-[11px] text-slate-500">
                        Last updated{" "}
                        <span className="font-medium text-slate-700">
                          {new Date(detail.lastUpdated).toLocaleString("en-IN")}
                        </span>
                      </p>
                    ) : null}
                  </DetailSection>

                  {canRejectedAction &&
                  detail.beneficiaryStatus === "REJECTED" &&
                  (!detail.financeAction ||
                    detail.financeAction === "NONE") ? (
                    <DetailSection
                      title="Finance actions (bank rejected)"
                      icon={ShieldAlert}
                      tone="indigo"
                    >
                      <p className="mb-3 text-[12px] text-slate-600">
                        Choose one path. Vendor correction and bank retry cannot
                        both be applied for the same rejection. Payouts remain
                        blocked until bank approval.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => openRejectedAction("correction")}
                          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-[12px] font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                          Vendor Correction Required
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectedAction("retry")}
                          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-[12px] font-semibold text-[#2f3d95] transition hover:bg-indigo-100"
                        >
                          Retry Bank Registration
                        </button>
                      </div>
                    </DetailSection>
                  ) : null}

                  <DetailSection title="File generation" icon={FileText} tone="indigo">
                    {detail.lastFileGeneratedAt || detail.lastFileGeneratedBy ? (
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Generated at"
                          value={
                            detail.lastFileGeneratedAt
                              ? new Date(
                                  detail.lastFileGeneratedAt,
                                ).toLocaleString("en-IN")
                              : null
                          }
                          icon={Clock}
                        />
                        <DetailField
                          label="Generated by"
                          value={
                            detail.lastFileGeneratedBy ||
                            (detail.lastFileGeneratedByUserId
                              ? `User #${detail.lastFileGeneratedByUserId}`
                              : null)
                          }
                          icon={Users}
                        />
                        <DetailField
                          label="Batch number"
                          value={detail.lastFileBatchNumber}
                          mono
                          icon={Hash}
                        />
                        <DetailField
                          label="File name hint"
                          value={
                            detail.beneficiaryCode
                              ? `BENEFICIARY_${detail.beneficiaryCode}.txt`
                              : null
                          }
                          icon={FileText}
                        />
                      </dl>
                    ) : (
                      <p className="rounded-xl bg-white px-3 py-2.5 text-[13px] text-slate-500 ring-1 ring-slate-200/80">
                        No beneficiary file has been generated for this vendor
                        yet.
                      </p>
                    )}
                  </DetailSection>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {generateConfirmOpen ? (
        <>
          <button
            type="button"
            aria-label="Close confirmation"
            className="fixed inset-0 z-40 bg-slate-900/50"
            onClick={() => !generating && setGenerateConfirmOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Generate beneficiary file?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Create a pipe-delimited .txt for{" "}
              <span className="font-semibold text-slate-900">
                {selectedIds.length}
              </span>{" "}
              selected beneficiar{selectedIds.length === 1 ? "y" : "ies"}.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
              <li>Selected rows move to FILE_GENERATED</li>
              <li>File is validated against bank field rules</li>
              <li>Download starts after generation</li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={generating}
                onClick={() => setGenerateConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generating || selectedIds.length === 0}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#26317a] disabled:opacity-60"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Generate & download
              </button>
            </div>
          </div>
        </>
      ) : null}

      {rejectedAction ? (
        <>
          <button
            type="button"
            aria-label="Close confirmation"
            className="fixed inset-0 z-[60] bg-slate-900/50"
            onClick={closeRejectedAction}
          />
          <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              {rejectedAction === "correction"
                ? "Vendor Correction Required?"
                : "Retry Bank Registration?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {rejectedAction === "correction"
                ? "Marks this beneficiary UPDATE_REQUIRED, notifies the owner, and blocks TXT generation until corrected bank details are approved."
                : "Keeps approved bank details unchanged, reuses the beneficiary code, and sets status NOT_SUBMITTED for the next TXT generation."}
            </p>
            {detail?.sbiErrorDescription ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600 ring-1 ring-slate-200">
                <span className="font-semibold text-slate-800">
                  Bank rejection:{" "}
                </span>
                {detail.sbiErrorDescription}
              </p>
            ) : null}
            <label className="mt-3 block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {rejectedAction === "correction"
                  ? "Rejection remarks"
                  : "Resolution remarks"}{" "}
                <span className="text-rose-600">*</span>
              </span>
              <textarea
                value={rejectedRemarks}
                onChange={(e) => setRejectedRemarks(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={
                  rejectedAction === "correction"
                    ? "Explain what the vendor must correct…"
                    : "Describe how the bank-side issue was resolved…"
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none ring-[#2f3d95]/20 focus:ring-2"
              />
            </label>
            {rejectedAction === "retry" ? (
              <label className="mt-3 flex items-start gap-2 text-[12px] text-slate-700">
                <input
                  type="checkbox"
                  checked={sbiIssueResolvedConfirmed}
                  onChange={(e) =>
                    setSbiIssueResolvedConfirmed(e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2f3d95]"
                />
                <span>
                  I confirm the bank-side issue has been resolved and this
                  beneficiary can be retried with the same bank details.
                </span>
              </label>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rejectedActionSubmitting}
                onClick={closeRejectedAction}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  rejectedActionSubmitting ||
                  !rejectedRemarks.trim() ||
                  (rejectedAction === "retry" && !sbiIssueResolvedConfirmed)
                }
                onClick={() => void submitRejectedAction()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#26317a] disabled:opacity-60"
              >
                {rejectedActionSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Confirm
              </button>
            </div>
          </div>
        </>
      ) : null}

      {rebuildConfirmOpen ? (
        <>
          <button
            type="button"
            aria-label="Close confirmation"
            className="fixed inset-0 z-40 bg-slate-900/50"
            onClick={() => !rebuilding && setRebuildConfirmOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Sync vendor beneficiaries?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This refreshes bank snapshots and internal verification from live
              hotel / transport sources.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
              <li>Does not overwrite beneficiary codes</li>
              <li>Does not overwrite beneficiary status</li>
              <li>Audit history is preserved (Envers)</li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rebuilding}
                onClick={() => setRebuildConfirmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rebuilding}
                onClick={() => void handleRebuild()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#26317a] disabled:opacity-60"
              >
                {rebuilding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Confirm sync
              </button>
            </div>
          </div>
        </>
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
