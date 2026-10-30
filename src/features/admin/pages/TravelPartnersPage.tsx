import { useState, useEffect, useCallback } from "react";
import { Button, DataTable, formatListCount } from "@/components/ui";
import { ExportButton } from "@/components/ui/ExportButton";
import type { GridColDef } from "@mui/x-data-grid";
import { ApproveRejectModal } from "../components/ApproveRejectModal";
import { adminService } from "../services/adminService";
import type {
  AgencyTier,
  TravelAgentOnboardingListItem,
  TravelAgentOnboardingItem,
} from "../services/adminService";
import { useAuth } from "@/hooks/useAuth";
import {
  isSalesManagerRole,
  isSuperAdmin,
  isZonalManagerSalesRole,
} from "@/constants/roles";
import {
  X,
  User,
  FileText,
  Building2,
  Landmark,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  MapPin,
  Hash,
  IdCard,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "@/components/ui/Toast";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
  ReportRefreshButton,
} from "@/features/reports/components/ReportFilterDrawer";
import {
  isoToReportDateText,
  parseOptionalReportDate,
  validateOptionalDateRange,
  exportStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import {
  TravelPartnerBadge,
  getAgencyTierTone,
  getTravelPartnerRemarkTone,
  travelPartnerTableGridSx,
} from "../components/travelPartnerTableUi";

export type TravelPartnerStatus = "PENDING" | "APPROVED" | "REJECTED";

type PartnerListFilters = {
  email: string;
  name: string;
  agencyName: string;
  agencyTier: string;
  createdAt: string;
  createdAtFrom: string;
  createdAtTo: string;
};

const DEFAULT_PARTNER_FILTERS: PartnerListFilters = {
  email: "",
  name: "",
  agencyName: "",
  agencyTier: "",
  createdAt: "",
  createdAtFrom: "",
  createdAtTo: "",
};

export interface TravelPartner {
  id: string;
  status: TravelPartnerStatus;
  appliedAt: string;
  // From list API: fullName -> name, agencyName -> agencyNumber, createdAt -> appliedAt
  title: string;
  name: string;
  email: string;
  agencyNumber: string;
  agencyTier?: AgencyTier;
  onboardedBy?: string | null;
  onboardedByUserId?: number | null;
  panNumber?: string;
  panCardFileUrl?: string;
  gstNumber?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  reviewedAt?: string;
  remarks?: string;
}

const AGENCY_TIER_OPTIONS: Array<{ value: AgencyTier; label: string }> = [
  { value: "DIAMOND", label: "Diamond" },
  { value: "PLATINUM", label: "Platinum" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "BRONZE", label: "Bronze" },
];

function mapListItemToPartner(
  item: TravelAgentOnboardingListItem,
): TravelPartner {
  return {
    id: String(item.id),
    status: item.status,
    appliedAt: item.createdAt,
    title: "",
    name: item.fullName,
    email: item.email,
    agencyNumber: item.agencyName,
    agencyTier: item.agencyTier,
    onboardedBy: item.onboardedBy ?? null,
    onboardedByUserId: item.onboardedByUserId ?? null,
  };
}

/** Maps get-by-id API response (TravelAgentOnboardingItem) to UI TravelPartner */
function mapOnboardingToPartner(
  item: TravelAgentOnboardingItem,
): TravelPartner {
  return {
    id: String(item.id),
    status: item.status,
    appliedAt: item.createdAt,
    title: item.title ?? "",
    name: item.fullName,
    email: item.email,
    agencyNumber: item.agencyName,
    agencyTier: item.agencyTier,
    onboardedBy: item.onboardedBy ?? null,
    onboardedByUserId: item.onboardedByUserId ?? null,
    panNumber: item.panNumber,
    panCardFileUrl: item.panCardDocumentUrl,
    gstNumber: item.gstNumber,
    businessAddress: item.businessAddress,
    city: item.city,
    state: item.state,
    pincode: item.pinCode,
    accountHolderName: item.accountHolderName,
    accountNumber: item.accountNumber,
    ifsc: item.ifscCode,
    bankName: item.bankName,
    reviewedAt: item.reviewedAt ?? undefined,
    remarks: item.rejectionRemarks ?? undefined,
  };
}

const PARTNER_TABS: Array<{
  value: TravelPartnerStatus;
  label: string;
  icon: typeof Clock;
  activeClass: string;
}> = [
  {
    value: "PENDING",
    label: "Pending",
    icon: Clock,
    activeClass: "bg-amber-500 text-white",
  },
  {
    value: "APPROVED",
    label: "Approved",
    icon: CheckCircle,
    activeClass: "bg-emerald-600 text-white",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    icon: XCircle,
    activeClass: "bg-rose-600 text-white",
  },
];

const EMPTY_MESSAGES: Record<
  TravelPartnerStatus,
  { title: string; description: string }
> = {
  PENDING: {
    title: "No pending partners",
    description: "New travel partner applications will appear here.",
  },
  APPROVED: {
    title: "No approved partners",
    description: "Approved travel partners will appear here.",
  },
  REJECTED: {
    title: "No rejected partners",
    description: "Rejected applications will appear here.",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isPdfDocument(url?: string) {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".pdf");
}

function formatAgencyTier(tier?: AgencyTier) {
  if (!tier) return "—";
  return (
    AGENCY_TIER_OPTIONS.find((option) => option.value === tier)?.label ?? tier
  );
}

export default function TravelPartnersPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [partners, setPartners] = useState<TravelPartner[]>([]);
  const [activeTab, setActiveTab] = useState<TravelPartnerStatus>("PENDING");
  const [selectedPartner, setSelectedPartner] = useState<TravelPartner | null>(
    null,
  );
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailStep, setDetailStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierUpdating, setTierUpdating] = useState(false);
  const [tierTargetPartner, setTierTargetPartner] = useState<TravelPartner | null>(
    null,
  );
  const [selectedTier, setSelectedTier] = useState<AgencyTier>("GOLD");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [statusTotals, setStatusTotals] = useState<
    Record<TravelPartnerStatus, number>
  >({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [draftFilters, setDraftFilters] = useState<PartnerListFilters>(
    DEFAULT_PARTNER_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<PartnerListFilters>(
    DEFAULT_PARTNER_FILTERS,
  );
  const isZonalSales = isZonalManagerSalesRole(user?.roles);
  const canUpdateTier = Boolean(
    isSuperAdmin(user?.roles) ||
      isSalesManagerRole(user?.roles) ||
      isZonalSales,
  );
  const showApproveRejectActions =
    selectedPartner?.status === "PENDING" &&
    (!isZonalSales || detailStep === 2);

  const activeFilterCount =
    (appliedFilters.email ? 1 : 0) +
    (appliedFilters.name ? 1 : 0) +
    (appliedFilters.agencyName ? 1 : 0) +
    (appliedFilters.agencyTier ? 1 : 0) +
    (appliedFilters.createdAt ? 1 : 0) +
    (appliedFilters.createdAtFrom || appliedFilters.createdAtTo ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize) || 1);

  const applyFilters = () => {
    const createdAtIso = parseOptionalReportDate(draftFilters.createdAt);
    if (draftFilters.createdAt.trim() && !createdAtIso) {
      showToast("Enter created date as dd/mm/yyyy", "error");
      return;
    }

    let createdAtFrom = "";
    let createdAtTo = "";
    if (!createdAtIso) {
      const range = validateOptionalDateRange(
        draftFilters.createdAtFrom,
        draftFilters.createdAtTo,
      );
      if (!range.ok) {
        showToast(range.message, "error");
        return;
      }
      createdAtFrom = range.fromDate || "";
      createdAtTo = range.toDate || "";
    }

    setAppliedFilters({
      email: draftFilters.email.trim(),
      name: draftFilters.name.trim(),
      agencyName: draftFilters.agencyName.trim(),
      agencyTier: draftFilters.agencyTier.trim(),
      createdAt: createdAtIso || "",
      createdAtFrom,
      createdAtTo,
    });
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_PARTNER_FILTERS);
    setAppliedFilters(DEFAULT_PARTNER_FILTERS);
    setPage(0);
    setFilterOpen(false);
  };

  const openFilterDrawer = () => {
    setDraftFilters({
      ...appliedFilters,
      createdAt: isoToReportDateText(appliedFilters.createdAt),
      createdAtFrom: isoToReportDateText(appliedFilters.createdAtFrom),
      createdAtTo: isoToReportDateText(appliedFilters.createdAtTo),
    });
    setFilterOpen(true);
  };

  const exportPartners = async (format: ReportExportFormat) => {
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await adminService.exportTravelAgentOnboarding({
        params: {
          status: activeTab,
          ...(appliedFilters.email ? { email: appliedFilters.email } : {}),
          ...(appliedFilters.name ? { name: appliedFilters.name } : {}),
          ...(appliedFilters.agencyName
            ? { agencyName: appliedFilters.agencyName }
            : {}),
          ...(appliedFilters.agencyTier
            ? { agencyTier: appliedFilters.agencyTier as AgencyTier }
            : {}),
          ...(appliedFilters.createdAt
            ? { createdAt: appliedFilters.createdAt }
            : {
                ...(appliedFilters.createdAtFrom
                  ? {
                      createdAtFrom: `${appliedFilters.createdAtFrom}T00:00:00.000+05:30`,
                    }
                  : {}),
                ...(appliedFilters.createdAtTo
                  ? {
                      createdAtTo: `${appliedFilters.createdAtTo}T23:59:59.999+05:30`,
                    }
                  : {}),
              }),
        },
        format,
        defaultFileName: `travel-partners-${activeTab.toLowerCase()}`,
        onStatus: setExportStatus,
      });
      showToast("Travel partners downloaded", "success");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Export failed";
      showToast(message, "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const response = await adminService.getTravelAgentOnboardingList({
        page,
        size: pageSize,
        status: activeTab,
        ...(appliedFilters.email ? { email: appliedFilters.email } : {}),
        ...(appliedFilters.name ? { name: appliedFilters.name } : {}),
        ...(appliedFilters.agencyName
          ? { agencyName: appliedFilters.agencyName }
          : {}),
        ...(appliedFilters.agencyTier
          ? { agencyTier: appliedFilters.agencyTier as AgencyTier }
          : {}),
        ...(appliedFilters.createdAt
          ? { createdAt: appliedFilters.createdAt }
          : {
              ...(appliedFilters.createdAtFrom
                ? {
                    createdAtFrom: `${appliedFilters.createdAtFrom}T00:00:00.000+05:30`,
                  }
                : {}),
              ...(appliedFilters.createdAtTo
                ? {
                    createdAtTo: `${appliedFilters.createdAtTo}T23:59:59.999+05:30`,
                  }
                : {}),
            }),
      });
      setPartners(response.content.map(mapListItemToPartner));
      setTotalElements(response.totalElements);
      setStatusTotals((prev) => ({
        ...prev,
        [activeTab]: response.totalElements,
      }));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to load travel partners";
      setListError(message);
      setPartners([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, appliedFilters]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const openPartnerDetail = useCallback(async (partner: TravelPartner) => {
    setSelectedPartner(partner);
    setDetailStep(1);
    setDetailLoading(true);
    try {
      const item = await adminService.getTravelAgentOnboardingById(partner.id);
      const mapped = mapOnboardingToPartner(item);
      setSelectedPartner({
        ...mapped,
        onboardedBy: mapped.onboardedBy ?? partner.onboardedBy ?? null,
        onboardedByUserId:
          mapped.onboardedByUserId ?? partner.onboardedByUserId ?? null,
      });
    } catch {
      // Keep showing list item if fetch by id fails
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleApprove = async (remarks: string) => {
    if (!selectedPartner) return;
    setIsProcessing(true);
    try {
      await adminService.approveTravelAgentOnboarding(selectedPartner.id, {
        remarks,
      });
      await fetchPartners();
      setShowApproveModal(false);
      setSelectedPartner(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!selectedPartner) return;
    setIsProcessing(true);
    try {
      await adminService.rejectTravelAgentOnboarding(selectedPartner.id, {
        remarks,
      });
      await fetchPartners();
      setShowRejectModal(false);
      setSelectedPartner(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const openTierModal = useCallback((partner: TravelPartner) => {
    setTierTargetPartner(partner);
    setSelectedTier(partner.agencyTier ?? "GOLD");
    setShowTierModal(true);
  }, []);

  const handleUpdateTier = async () => {
    if (!tierTargetPartner) return;
    setTierUpdating(true);
    try {
      await adminService.updateTravelAgentAgencyTier(tierTargetPartner.id, {
        agencyTier: selectedTier,
      });
      await fetchPartners();
      if (selectedPartner?.id === tierTargetPartner.id) {
        setSelectedPartner((prev) =>
          prev ? { ...prev, agencyTier: selectedTier } : prev,
        );
      }
      setShowTierModal(false);
      setTierTargetPartner(null);
    } finally {
      setTierUpdating(false);
    }
  };

  const emptyMessage = EMPTY_MESSAGES[activeTab];
  const columns: GridColDef<TravelPartner>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => {
        const fullName = `${params.row.title ? `${params.row.title} ` : ""}${params.row.name}`;
        return (
          <span className="truncate text-sm font-semibold leading-tight text-slate-900">
            {fullName}
          </span>
        );
      },
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.3,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <span className="truncate text-sm text-slate-700" title={params.row.email}>
          {params.row.email || "—"}
        </span>
      ),
    },
    {
      field: "agencyNumber",
      headerName: "Agency No.",
      flex: 0.9,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <span className="truncate text-sm text-slate-700">
          {params.row.agencyNumber || "—"}
        </span>
      ),
    },
    {
      field: "agencyTier",
      headerName: "Agency Tier",
      width: 130,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <TravelPartnerBadge className={getAgencyTierTone(params.row.agencyTier)}>
          {formatAgencyTier(params.row.agencyTier)}
        </TravelPartnerBadge>
      ),
    },
    {
      field: "onboardedBy",
      headerName: "Onboarded By",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (params) =>
        params.row.onboardedBy ? (
          <span
            className="truncate text-sm text-slate-700"
            title={params.row.onboardedBy}
          >
            {params.row.onboardedBy}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        ),
    },
    {
      field: "appliedAt",
      headerName: "Applied",
      width: 120,
      minWidth: 110,
      sortable: false,
      renderCell: (params) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-600">
          {formatDate(params.row.appliedAt)}
        </span>
      ),
    },
    ...(activeTab !== "PENDING"
      ? [
          {
            field: "remarks",
            headerName: "Remarks",
            flex: 1,
            minWidth: 160,
            sortable: false,
            renderCell: (params) => (
              <TravelPartnerBadge
                className={getTravelPartnerRemarkTone(activeTab)}
                title={params.row.remarks || "—"}
              >
                {params.row.remarks || "—"}
              </TravelPartnerBadge>
            ),
          } satisfies GridColDef<TravelPartner>,
        ]
      : []),
    {
      field: "actions",
      headerName: "",
      width: activeTab === "APPROVED" && canUpdateTier ? 148 : 88,
      minWidth: 88,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <div className="flex w-full items-center justify-end gap-1.5">
          {activeTab === "APPROVED" && canUpdateTier ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openTierModal(params.row);
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Tier
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void openPartnerDetail(params.row);
            }}
            className="rounded-lg border border-[#2f3d95]/25 bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#2f3d95] transition-colors hover:border-[#2f3d95] hover:bg-[#2f3d95] hover:text-white"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  const statusBadgeClass: Record<TravelPartnerStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden bg-slate-50">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto flex h-full w-full max-w-350 min-h-0 flex-1 flex-col gap-3 px-3 py-4 sm:px-5">
        <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {PARTNER_TABS.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setPage(0);
                    }}
                    className={cn(
                      "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
                      isActive
                        ? tab.activeClass
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-500",
                      )}
                    >
                      {statusTotals[tab.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                from={
                  appliedFilters.createdAtFrom ||
                  appliedFilters.createdAt ||
                  null
                }
                to={appliedFilters.createdAtTo || null}
                detail={
                  [
                    PARTNER_TABS.find((tab) => tab.value === activeTab)?.label,
                    appliedFilters.email || null,
                    appliedFilters.name || null,
                    appliedFilters.agencyName || null,
                    appliedFilters.agencyTier
                      ? formatAgencyTier(
                          appliedFilters.agencyTier as AgencyTier,
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
              <ReportFilterButton
                onClick={openFilterDrawer}
                activeCount={activeFilterCount}
              />
              <ExportButton
                iconOnly
                exporting={exporting}
                exportingLabel={exportStatusLabel(exportStatus) || "Exporting…"}
                onExportExcel={() => void exportPartners("EXCEL")}
                onExportCSV={() => void exportPartners("CSV")}
                onExportPDF={() => void exportPartners("PDF")}
              />
              <ReportRefreshButton
                onClick={() => void fetchPartners()}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {listError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
            <p className="mb-3 text-sm font-medium text-red-600">{listError}</p>
            <Button
              onClick={() => void fetchPartners()}
              variant="primary"
              className="text-sm"
            >
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            subtitle={
              loading ? (
                "Loading…"
              ) : (
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(totalElements, "partner")}
                  </span>
                  <span className="text-slate-400">
                    {hasActiveFilters ? " · filtered" : ""} · Page {page + 1} of{" "}
                    {totalPages}
                  </span>
                </>
              )
            }
            rows={partners}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            paginationMode="server"
            rowCount={totalElements}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              if (model.pageSize !== pageSize) {
                setPageSize(model.pageSize);
                setPage(0);
                return;
              }
              if (model.page !== page) setPage(model.page);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            disableRowSelectionOnClick
            disableColumnFilter
            showToolbar
            showExport={false}
            fillContainer
            dense
            rowHeight={52}
            sx={travelPartnerTableGridSx}
            className="min-h-0"
            localeText={{
              noRowsLabel: hasActiveFilters
                ? "No partners match your filters."
                : `${emptyMessage.title}. ${emptyMessage.description}`,
            }}
          />
        )}
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
            Email
          </label>
          <input
            type="search"
            value={draftFilters.email}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                email: e.target.value,
              }))
            }
            placeholder="agent@"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Name
          </label>
          <input
            type="search"
            value={draftFilters.name}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder="John"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Agency name
          </label>
          <input
            type="search"
            value={draftFilters.agencyName}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                agencyName: e.target.value,
              }))
            }
            placeholder="Sky"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Agency tier
          </label>
          <select
            value={draftFilters.agencyTier}
            onChange={(e) =>
              setDraftFilters((prev) => ({
                ...prev,
                agencyTier: e.target.value,
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All tiers</option>
            {AGENCY_TIER_OPTIONS.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </section>
        <section>
          <ReportCustomDateFields
            singleDate
            singleLabel="Created date (IST day)"
            fromText={draftFilters.createdAt}
            onFromTextChange={(value) =>
              setDraftFilters((prev) => ({
                ...prev,
                createdAt: value,
                createdAtFrom: "",
                createdAtTo: "",
              }))
            }
          />
        </section>
        <ReportCustomDateFields
          fromLabel="Created from"
          toLabel="Created to"
          fromText={draftFilters.createdAtFrom}
          toText={draftFilters.createdAtTo}
          onFromTextChange={(value) =>
            setDraftFilters((prev) => ({
              ...prev,
              createdAtFrom: value,
              createdAt: "",
            }))
          }
          onToTextChange={(value) =>
            setDraftFilters((prev) => ({
              ...prev,
              createdAtTo: value,
              createdAt: "",
            }))
          }
        />
      </ReportFilterDrawer>

      {/* Detail Modal */}
      {selectedPartner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedPartner(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "flex items-center justify-between px-6 py-4 border-b shrink-0 border-l-4",
                selectedPartner.status === "PENDING" &&
                  "bg-amber-100 border-l-amber-600 border-gray-200",
                selectedPartner.status === "APPROVED" &&
                  "bg-emerald-100 border-l-emerald-700 border-gray-200",
                selectedPartner.status === "REJECTED" &&
                  "bg-rose-100 border-l-rose-700 border-gray-200",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    selectedPartner.status === "PENDING" &&
                      "bg-amber-200 text-amber-800",
                    selectedPartner.status === "APPROVED" &&
                      "bg-emerald-200 text-emerald-800",
                    selectedPartner.status === "REJECTED" &&
                      "bg-rose-200 text-rose-800",
                  )}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedPartner.title ? `${selectedPartner.title} ` : ""}
                    {selectedPartner.name}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 mt-0.5 text-xs font-medium rounded-full px-2 py-0.5",
                      statusBadgeClass[selectedPartner.status],
                    )}
                  >
                    {(() => {
                      const tab = PARTNER_TABS.find(
                        (t) => t.value === selectedPartner.status,
                      );
                      const Icon = tab?.icon ?? Clock;
                      return (
                        <>
                          <Icon className="h-3 w-3" />
                          {tab?.label ?? selectedPartner.status}
                        </>
                      );
                    })()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex gap-1 border-b border-gray-200 px-4 py-2 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setDetailStep(1)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  detailStep === 1
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700",
                )}
              >
                <User className="h-4 w-4" />
                Personal & PAN
              </button>
              <button
                type="button"
                onClick={() => setDetailStep(2)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  detailStep === 2
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700",
                )}
              >
                <Building2 className="h-4 w-4" />
                Business & Bank
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#2f3d95]" />
                  <p className="text-sm text-gray-500">Loading details…</p>
                </div>
              ) : (
                <>
                  {detailStep === 1 && (
                    <div className="space-y-6">
                      <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
                          <User className="h-4 w-4 text-blue-600" />
                          Personal details
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {selectedPartner.title ? (
                            <div className="flex items-start gap-2">
                              <Hash className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <dt className="text-gray-500">Title</dt>
                                <dd className="font-medium text-gray-900">
                                  {selectedPartner.title}
                                </dd>
                              </div>
                            </div>
                          ) : null}
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Name</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.name ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <dt className="text-gray-500">Email</dt>
                              <dd className="font-medium text-gray-900 break-all">
                                {selectedPartner.email ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <User className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <dt className="text-gray-500">Onboarded by</dt>
                              <dd className="font-medium text-gray-900 break-all">
                                {selectedPartner.onboardedBy || "—"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                      </section>
                      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                          <FileText className="h-4 w-4 text-slate-600" />
                          PAN details
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-start gap-2">
                            <IdCard className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Agency name</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.agencyNumber ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Briefcase className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Agency tier</dt>
                              <dd className="font-medium text-gray-900">
                                {formatAgencyTier(selectedPartner.agencyTier)}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">PAN number</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.panNumber ?? "—"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                        {selectedPartner.panCardFileUrl ? (
                          <div>
                            <dt className="text-gray-500 text-sm mb-2 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> PAN document
                            </dt>
                            {isPdfDocument(selectedPartner.panCardFileUrl) ? (
                              <a
                                href={selectedPartner.panCardFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                              >
                                View document
                              </a>
                            ) : (
                              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                <img
                                  src={selectedPartner.panCardFileUrl}
                                  alt="PAN card"
                                  className="w-full max-h-64 object-contain"
                                />
                              </div>
                            )}
                          </div>
                        ) : null}
                      </section>
                    </div>
                  )}
                  {detailStep === 2 && (
                    <div className="space-y-6">
                      <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-900 mb-3">
                          <Briefcase className="h-4 w-4 text-teal-600" />
                          Business details
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <Hash className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">GST number</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.gstNumber ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">
                                Business address
                              </dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.businessAddress ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">City</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.city ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">State</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.state ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Pincode</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.pincode ?? "—"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                      </section>
                      <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-3">
                          <Landmark className="h-4 w-4 text-indigo-600" />
                          Bank details
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <User className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">
                                Account holder name
                              </dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.accountHolderName ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Account number</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.accountNumber ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">IFSC</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.ifsc ?? "—"}
                              </dd>
                            </div>
                          </div>
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <Landmark className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-gray-500">Bank name</dt>
                              <dd className="font-medium text-gray-900">
                                {selectedPartner.bankName ?? "—"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                      </section>
                    </div>
                  )}
                </>
              )}
            </div>

            {(showApproveRejectActions || selectedPartner.status === "PENDING") && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPartner(null)}
                >
                  Close
                </Button>
                {showApproveRejectActions && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => setShowRejectModal(true)}
                      className="gap-2 bg-rose-700 hover:bg-rose-800 text-white border-0"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setShowApproveModal(true)}
                      className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white border-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            )}
            {selectedPartner.status !== "PENDING" && (
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPartner(null)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ApproveRejectModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
        type="approve"
        isLoading={isProcessing}
        title="Approve Partner"
      />
      <ApproveRejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        type="reject"
        isLoading={isProcessing}
        title="Reject Partner"
      />
      {showTierModal && tierTargetPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-emerald-200 overflow-hidden">
            <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Update Tier</h3>
              <p className="mt-1 text-sm text-gray-600">
                Update agency tier for{" "}
                <span className="font-medium text-gray-900">
                  {tierTargetPartner.name}
                </span>
              </p>
            </div>
            <div className="p-6">
            <div className="mt-0">
              <label
                htmlFor="agency-tier"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Agency Tier
              </label>
              <select
                id="agency-tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as AgencyTier)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {AGENCY_TIER_OPTIONS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (tierUpdating) return;
                  setShowTierModal(false);
                  setTierTargetPartner(null);
                }}
                disabled={tierUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleUpdateTier()}
                disabled={tierUpdating}
                isLoading={tierUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 border-0 text-white"
              >
                Update Tier
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
