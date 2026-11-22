import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  GridColDef,
  GridColumnVisibilityModel,
} from "@mui/x-data-grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Hash,
  Landmark,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { DataTable, formatListCount } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  canApproveVendorBankChange,
  canViewVendorBankVerificationMis,
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
import { vendorBankChangeService } from "@/features/reports/services/vendorBankChangeService";
import type {
  BeneficiaryRegistrationStatus,
  InternalBankVerificationStatus,
  VendorBankChangeMisSummary,
  VendorBankChangeRequest,
  VendorBankChangeRequestStatus,
  VendorBankChangeVendorTypeFilter,
  VendorBankVerificationDetail,
  VendorBankVerificationMisRow,
} from "@/features/reports/services/vendorBankChangeTypes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const VENDOR_TYPE_OPTIONS: {
  value: VendorBankChangeVendorTypeFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All vendors" },
  { value: "HOTEL", label: "Hotel" },
  { value: "TRANSPORT", label: "Transport" },
];

const INTERNAL_STATUS_OPTIONS: InternalBankVerificationStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

type FilterDraft = {
  vendorType: VendorBankChangeVendorTypeFilter;
  internalBankVerificationStatus: InternalBankVerificationStatus | "";
  changeRequestStatus: VendorBankChangeRequestStatus | "";
  beneficiaryStatus: BeneficiaryRegistrationStatus | "";
  search: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  vendorType: "ALL",
  internalBankVerificationStatus: "",
  changeRequestStatus: "",
  beneficiaryStatus: "",
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
  icon?: LucideIcon;
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
  icon: LucideIcon;
  children: ReactNode;
  tone?: "slate" | "indigo" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "indigo"
      ? "border-indigo-100 bg-indigo-50/40"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50/40"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50/40"
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

export default function VendorBankVerificationMisPage() {
  const { user } = useAuth();
  const canView = canViewVendorBankVerificationMis(user?.roles);
  const canApprove = canApproveVendorBankChange(user?.roles);
  const { toast, showToast, hideToast } = useToast();
  const isSmUp = useMediaQuery("(min-width:640px)");
  const isMdUp = useMediaQuery("(min-width:768px)");

  const [applied, setApplied] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VendorBankVerificationMisRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<VendorBankChangeMisSummary>({
    totalVendorAccounts: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    changeRequestPending: 0,
    reVerificationRequired: 0,
    sbiRegistrationPending: 0,
    sbiVerified: 0,
    total: 0,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRow, setSelectedRow] =
    useState<VendorBankVerificationDetail | null>(null);
  const [changeRequest, setChangeRequest] =
    useState<VendorBankChangeRequest | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      (applied.vendorType !== "ALL" ? 1 : 0) +
      (applied.internalBankVerificationStatus ? 1 : 0) +
      (applied.changeRequestStatus ? 1 : 0) +
      (applied.beneficiaryStatus ? 1 : 0) +
      (applied.search.trim() ? 1 : 0),
    [applied],
  );

  const notifyCopied = useCallback(
    (label: string) => showToast(`${label} copied`, "success"),
    [showToast],
  );

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const response = await vendorBankChangeService.getDashboard({
        page,
        size: PAGE_SIZE,
        vendorType: applied.vendorType,
        internalBankVerificationStatus:
          applied.changeRequestStatus || applied.beneficiaryStatus
            ? undefined
            : applied.internalBankVerificationStatus || undefined,
        changeRequestStatus: applied.changeRequestStatus || undefined,
        beneficiaryStatus: applied.beneficiaryStatus || undefined,
        search: applied.search.trim() || undefined,
        sort: "updatedAt",
        sortDir: "desc",
      });
      setRows(response.items);
      setSummary(response.summary);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied, canView, page, showToast]);

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

  const applyStatusKpi = (status: InternalBankVerificationStatus | "") => {
    setApplied((prev) => ({
      ...prev,
      internalBankVerificationStatus: status,
      changeRequestStatus: "",
      beneficiaryStatus: "",
    }));
    setDraft((prev) => ({
      ...prev,
      internalBankVerificationStatus: status,
      changeRequestStatus: "",
      beneficiaryStatus: "",
    }));
    setPage(0);
  };

  const applyChangeRequestKpi = (
    status: VendorBankChangeRequestStatus | "",
  ) => {
    setApplied((prev) => ({
      ...prev,
      changeRequestStatus: status,
      internalBankVerificationStatus: "",
      beneficiaryStatus: "",
    }));
    setDraft((prev) => ({
      ...prev,
      changeRequestStatus: status,
      internalBankVerificationStatus: "",
      beneficiaryStatus: "",
    }));
    setPage(0);
  };

  const applyBeneficiaryStatusKpi = (
    status: BeneficiaryRegistrationStatus | "",
  ) => {
    setApplied((prev) => ({
      ...prev,
      beneficiaryStatus: status,
      internalBankVerificationStatus: "",
      changeRequestStatus: "",
    }));
    setDraft((prev) => ({
      ...prev,
      beneficiaryStatus: status,
      internalBankVerificationStatus: "",
      changeRequestStatus: "",
    }));
    setPage(0);
  };

  const openDetail = useCallback(
    async (row: VendorBankVerificationMisRow) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setSelectedRow({ ...row, accountNumber: null });
      setChangeRequest(null);
      setDecision(null);
      setRemarks("");
      try {
        const detail = await vendorBankChangeService.getVerificationDetail(
          row.beneficiaryId,
        );
        setSelectedRow(detail);
        const requestId =
          detail.changeRequestId ?? detail.latestChangeRequestId ?? null;
        if (requestId) {
          const change = await vendorBankChangeService.getById(requestId);
          setChangeRequest(change);
        }
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRow(null);
    setChangeRequest(null);
    setDecision(null);
    setRemarks("");
  };

  const canDecideChangeRequest =
    canApprove && changeRequest?.status === "PENDING_APPROVAL";
  const canDecideInternalPending =
    canApprove &&
    !selectedRow?.hasPendingChangeRequest &&
    selectedRow?.allowsInternalVerification === true &&
    (selectedRow?.internalBankVerificationStatus === "PENDING" ||
      selectedRow?.internalBankVerificationStatus === "REJECTED");
  const canShowDecisionActions =
    (canDecideChangeRequest || canDecideInternalPending) && !decision;

  const confirmDecision = async () => {
    if (!decision || !selectedRow) return;
    if (decision === "reject" && !remarks.trim()) {
      showToast("Rejection remarks are required", "error");
      return;
    }
    setActionLoading(true);
    try {
      if (changeRequest?.status === "PENDING_APPROVAL") {
        const updated =
          decision === "approve"
            ? await vendorBankChangeService.approve(
                changeRequest.id,
                remarks.trim() || undefined,
              )
            : await vendorBankChangeService.reject(
                changeRequest.id,
                remarks.trim(),
              );
        setChangeRequest(updated);
        showToast(
          decision === "approve"
            ? "Bank change approved"
            : "Bank change rejected",
          "success",
        );
      } else {
        decision === "approve"
          ? await vendorBankChangeService.approveInternalVerification(
              selectedRow.vendorType,
              selectedRow.vendorId,
              remarks.trim() || undefined,
            )
          : await vendorBankChangeService.rejectInternalVerification(
              selectedRow.vendorType,
              selectedRow.vendorId,
              remarks.trim(),
            );
        const refreshed = await vendorBankChangeService.getVerificationDetail(
          selectedRow.beneficiaryId,
        );
        setSelectedRow(refreshed);
        showToast(
          decision === "approve"
            ? "Bank account verified"
            : "Bank account rejected",
          "success",
        );
      }
      setDecision(null);
      setRemarks("");
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo<GridColDef<VendorBankVerificationMisRow>[]>(
    () => [
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
        field: "maskedAccountNumber",
        headerName: "Account",
        minWidth: 120,
        flex: 0.7,
        renderCell: ({ row }) => (
          <span className="font-mono text-[12px] text-slate-800">
            {row.maskedAccountNumber || "—"}
          </span>
        ),
      },
      {
        field: "internalBankVerificationStatus",
        headerName: "Bank status",
        minWidth: 130,
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
        field: "changeRequest",
        headerName: "Change req.",
        minWidth: 130,
        flex: 0.7,
        renderCell: ({ row }) =>
          row.hasPendingChangeRequest ? (
            <StatusPill value="PENDING_APPROVAL" />
          ) : (
            <span className="text-[12px] text-slate-400">—</span>
          ),
      },
      {
        field: "actions",
        headerName: "",
        width: 92,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => (
          <button
            type="button"
            onClick={() => void openDetail(row)}
            title="View bank verification details"
            aria-label={`View details for ${row.vendorName || row.vendorId}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-semibold text-[#2f3d95] transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f3d95]/40"
          >
            <Eye className="h-3.5 w-3.5 shrink-0" />
            View
          </button>
        ),
      },
    ],
    [isMdUp, isSmUp, notifyCopied, openDetail],
  );

  const columnVisibilityModel = useMemo<GridColumnVisibilityModel>(
    () => ({
      bankName: isSmUp,
      changeRequest: isMdUp,
      beneficiaryStatus: isMdUp,
    }),
    [isMdUp, isSmUp],
  );

  if (!canView) {
    return (
      <div className="p-6 text-sm text-slate-600">
        You do not have access to Vendor Bank Verification MIS.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-[#f7f8fa]">
        <div className="mx-auto max-w-350 space-y-3 px-3 py-2 sm:px-4">
          <ReportPageHeader
            title="Vendor Bank Verification"
            description="Hotel + transport bank accounts — pending, verified and rejected"
            icon={ShieldAlert}
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
                      applied.changeRequestStatus
                        ? "Change request pending"
                        : applied.beneficiaryStatus === "UPDATE_REQUIRED"
                          ? "Re-verification required"
                          : applied.internalBankVerificationStatus
                            ? `Bank ${formatStatusLabel(applied.internalBankVerificationStatus)}`
                            : null,
                      applied.search.trim() || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "All bank accounts"
                  }
                />
                <ReportFilterButton
                  onClick={openFilterDrawer}
                  activeCount={activeFilterCount}
                />
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

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard
              label="Total Accounts"
              value={
                loading
                  ? "…"
                  : summary.totalVendorAccounts.toLocaleString("en-IN")
              }
              icon={Users}
              tone="indigo"
              active={
                !applied.internalBankVerificationStatus &&
                !applied.changeRequestStatus &&
                !applied.beneficiaryStatus
              }
              onClick={() => applyStatusKpi("")}
            />
            <SummaryCard
              label="Pending"
              value={
                loading ? "…" : summary.pendingApproval.toLocaleString("en-IN")
              }
              icon={Clock}
              tone="amber"
              active={
                !applied.changeRequestStatus &&
                !applied.beneficiaryStatus &&
                applied.internalBankVerificationStatus === "PENDING"
              }
              onClick={() => applyStatusKpi("PENDING")}
            />
            <SummaryCard
              label="Verified"
              value={loading ? "…" : summary.approved.toLocaleString("en-IN")}
              icon={CheckCircle2}
              tone="emerald"
              active={
                !applied.changeRequestStatus &&
                !applied.beneficiaryStatus &&
                applied.internalBankVerificationStatus === "VERIFIED"
              }
              onClick={() => applyStatusKpi("VERIFIED")}
            />
            <SummaryCard
              label="Rejected"
              value={loading ? "…" : summary.rejected.toLocaleString("en-IN")}
              icon={XCircle}
              tone="danger"
              active={
                !applied.changeRequestStatus &&
                !applied.beneficiaryStatus &&
                applied.internalBankVerificationStatus === "REJECTED"
              }
              onClick={() => applyStatusKpi("REJECTED")}
            />
            <SummaryCard
              label="Change Req Pending"
              value={
                loading
                  ? "…"
                  : summary.changeRequestPending.toLocaleString("en-IN")
              }
              icon={FileText}
              tone="blue"
              active={applied.changeRequestStatus === "PENDING_APPROVAL"}
              onClick={() => applyChangeRequestKpi("PENDING_APPROVAL")}
            />
            <SummaryCard
              label="Re-verification"
              value={
                loading
                  ? "…"
                  : summary.reVerificationRequired.toLocaleString("en-IN")
              }
              icon={RefreshCw}
              tone="sky"
              active={applied.beneficiaryStatus === "UPDATE_REQUIRED"}
              onClick={() => applyBeneficiaryStatusKpi("UPDATE_REQUIRED")}
            />
          </div>

          <DataTable
            title="Vendor bank accounts"
            subtitle={
              <>
                <span className="font-medium text-slate-600">
                  {formatListCount(totalElements, "account")}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
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
                "No vendor bank accounts found. Adjust filters or rebuild beneficiary ledger.",
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
                Summary cards follow vendor type; status cards filter the grid
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
                      vendorType: e.target
                        .value as VendorBankChangeVendorTypeFilter,
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
                  placeholder="Vendor name"
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

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
          <button
            type="button"
            className="flex-1"
            onClick={closeDetail}
            aria-label="Close bank verification details"
          />
          <div className="flex h-full w-full max-w-lg flex-col bg-[#f8f9fc] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-indigo-100 bg-white/95 px-4 py-3 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                    Bank verification
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-bold text-slate-900">
                    {selectedRow?.vendorName || "Account details"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {selectedRow ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        {selectedRow.vendorType === "TRANSPORT" ? (
                          <Bus className="h-3 w-3 text-sky-600" />
                        ) : (
                          <Building2 className="h-3 w-3 text-indigo-600" />
                        )}
                        {formatStatusLabel(selectedRow.vendorType)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {detailLoading || !selectedRow ? (
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
                        value={selectedRow.contactMobile}
                        icon={Phone}
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                      <DetailField
                        label="Email"
                        value={selectedRow.contactEmail}
                        icon={Mail}
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection title="Current bank details" icon={Landmark}>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <DetailField
                        label="Bank"
                        value={selectedRow.bankName}
                        icon={Landmark}
                      />
                      <DetailField
                        label="Branch"
                        value={selectedRow.bankBranch}
                        icon={Building2}
                      />
                      <DetailField
                        label="IFSC"
                        value={selectedRow.ifscCode}
                        icon={Hash}
                        mono
                        copyable
                        onCopied={notifyCopied}
                      />
                      <DetailField
                        label="Account holder"
                        value={selectedRow.accountHolderName}
                        icon={Users}
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                      <DetailField
                        label="Account number"
                        value={
                          selectedRow.accountNumber ||
                          selectedRow.maskedAccountNumber
                        }
                        icon={Wallet}
                        mono
                        copyable
                        onCopied={notifyCopied}
                        highlight
                      />
                    </dl>
                  </DetailSection>

                  <DetailSection
                    title="Verification status"
                    icon={ShieldAlert}
                    tone="emerald"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/80">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Internal bank verification
                        </p>
                        <div className="mt-1.5">
                          <StatusPill
                            value={selectedRow.internalBankVerificationStatus}
                          />
                        </div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200/80">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Beneficiary status
                        </p>
                        <div className="mt-1.5">
                          <StatusPill value={selectedRow.beneficiaryStatus} />
                        </div>
                      </div>
                    </div>
                    {selectedRow.lastUpdated ? (
                      <p className="mt-3 text-[11px] text-slate-500">
                        Last updated{" "}
                        <span className="font-medium text-slate-700">
                          {new Date(selectedRow.lastUpdated).toLocaleString(
                            "en-IN",
                          )}
                        </span>
                      </p>
                    ) : null}
                  </DetailSection>

                  {changeRequest ? (
                    <DetailSection
                      title={`Bank change request #${changeRequest.id}`}
                      icon={FileText}
                      tone={
                        changeRequest.status === "REJECTED"
                          ? "amber"
                          : changeRequest.status === "APPROVED"
                            ? "emerald"
                            : "amber"
                      }
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusPill value={changeRequest.status} />
                        {changeRequest.status !== "PENDING_APPROVAL" ? (
                          <span className="text-[11px] font-medium text-slate-500">
                            Latest request (not open for approval)
                          </span>
                        ) : null}
                      </div>
                      {changeRequest.status === "REJECTED" ? (
                        <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-900 ring-1 ring-rose-100">
                          <p className="font-semibold">Rejection reason</p>
                          <p className="mt-1">
                            {changeRequest.rejectionRemarks || "No remarks provided."}
                          </p>
                          <p className="mt-2 text-[12px] text-rose-800">
                            Rejected
                            {changeRequest.rejectedByName
                              ? ` by ${changeRequest.rejectedByName}`
                              : ""}
                            {changeRequest.rejectedAt
                              ? ` on ${new Date(changeRequest.rejectedAt).toLocaleString("en-IN")}`
                              : ""}
                            . Live bank was not changed — owner must submit a new
                            change request.
                          </p>
                        </div>
                      ) : null}
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <DetailField
                          label="Requested by"
                          value={changeRequest.requestedByName}
                          icon={Users}
                        />
                        <DetailField
                          label="Requested at"
                          value={
                            changeRequest.requestedAt
                              ? new Date(
                                  changeRequest.requestedAt,
                                ).toLocaleString("en-IN")
                              : null
                          }
                          icon={Clock}
                        />
                        <DetailField
                          label="Proposed bank"
                          value={changeRequest.proposedBankName}
                          icon={Landmark}
                        />
                        <DetailField
                          label="Proposed IFSC"
                          value={changeRequest.proposedIfsc}
                          icon={Hash}
                          mono
                        />
                        <DetailField
                          label="Proposed account"
                          value={changeRequest.proposedAccountNumber}
                          icon={Wallet}
                          mono
                          highlight
                        />
                        <DetailField
                          label="Proposed holder"
                          value={changeRequest.proposedAccountHolderName}
                          icon={Users}
                        />
                      </dl>
                      {changeRequest.bankProofDocumentUrl ? (
                        <a
                          href={changeRequest.bankProofDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#2f3d95] hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          View / download bank proof
                        </a>
                      ) : null}
                      {changeRequest.status === "APPROVED" &&
                      changeRequest.approvalRemarks ? (
                        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 ring-1 ring-emerald-100">
                          Approval remarks: {changeRequest.approvalRemarks}
                        </p>
                      ) : null}
                    </DetailSection>
                  ) : (
                    <DetailSection title="Bank change request" icon={FileText}>
                      <p className="rounded-xl bg-white px-3 py-2.5 text-[13px] text-slate-500 ring-1 ring-slate-200/80">
                        No bank-change request history for this vendor.
                      </p>
                    </DetailSection>
                  )}

                  {!canDecideChangeRequest &&
                  selectedRow.liveBankVerificationStatus === "VERIFIED" &&
                  changeRequest?.status === "REJECTED" ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
                      Live bank is already verified. Do not use Approve here for the
                      current account — that would treat a rejected change as a new
                      verification. Wait for the owner to resubmit a bank change
                      request.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
              {canShowDecisionActions ? (
                <div className="space-y-2">
                  {canDecideChangeRequest ? (
                    <p className="text-[11px] font-medium text-amber-800">
                      Approving applies the proposed bank change request.
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-600">
                      First-time / failed bank verification (not a change request).
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("approve");
                        setRemarks("");
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {canDecideChangeRequest
                        ? "Approve change"
                        : "Approve verification"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("reject");
                        setRemarks("");
                      }}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-rose-600 text-[13px] font-semibold text-white transition hover:bg-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {decision && selectedRow ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {decision === "approve" ? "Confirm approval" : "Confirm rejection"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {changeRequest?.status === "PENDING_APPROVAL"
                ? `Request #${changeRequest.id} · ${
                    changeRequest.vendorName || changeRequest.vendorId
                  }`
                : `Bank verification · ${
                    selectedRow.vendorName || selectedRow.vendorId
                  }`}
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-slate-600">
                Remarks {decision === "reject" ? "(required)" : "(optional)"}
              </span>
              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-700"
                disabled={actionLoading}
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-white",
                  decision === "approve" ? "bg-emerald-600" : "bg-rose-600",
                  actionLoading && "opacity-60",
                )}
                onClick={() => void confirmDecision()}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirm {decision === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}
