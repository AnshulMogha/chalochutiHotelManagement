import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, DataTable, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
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
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import {
  Handshake,
  Eye,
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
  CalendarDays,
  MessageSquare,
  IdCard,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TravelPartnerBadge,
  TravelPartnerColumnHeader,
  TRAVEL_PARTNER_TAB_STYLES,
  getAgencyTierTone,
  getTravelPartnerRemarkTone,
  travelPartnerTableGridSx,
} from "../components/travelPartnerTableUi";

export type TravelPartnerStatus = "PENDING" | "APPROVED" | "REJECTED";

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
}> = [
  { value: "PENDING", label: "Pending", icon: Clock },
  { value: "APPROVED", label: "Approved", icon: CheckCircle },
  { value: "REJECTED", label: "Rejected", icon: XCircle },
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
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [totalElements, setTotalElements] = useState(0);
  const [statusTotals, setStatusTotals] = useState<
    Record<TravelPartnerStatus, number>
  >({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const isZonalSales = isZonalManagerSalesRole(user?.roles);
  const canUpdateTier = Boolean(
    isSuperAdmin(user?.roles) ||
      isSalesManagerRole(user?.roles) ||
      isZonalSales,
  );
  const showApproveRejectActions =
    selectedPartner?.status === "PENDING" &&
    (!isZonalSales || detailStep === 2);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const response = await adminService.getTravelAgentOnboardingList({
        page: paginationModel.page,
        size: paginationModel.pageSize,
        status: activeTab,
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
  }, [activeTab, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const openPartnerDetail = useCallback(async (partner: TravelPartner) => {
    setSelectedPartner(partner);
    setDetailStep(1);
    setDetailLoading(true);
    try {
      const item = await adminService.getTravelAgentOnboardingById(partner.id);
      setSelectedPartner(mapOnboardingToPartner(item));
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

  const columns = useMemo((): GridColDef<TravelPartner>[] => {
    const cols: GridColDef<TravelPartner>[] = [
      {
        field: "name",
        headerName: "Name",
        flex: 1.2,
        minWidth: 160,
        valueGetter: (_value, row) =>
          `${row.title ? `${row.title} ` : ""}${row.name}`,
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={User} label="Name" />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge className="bg-indigo-50 text-indigo-800 ring-indigo-200">
            {params.value as string}
          </TravelPartnerBadge>
        ),
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1.3,
        minWidth: 180,
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={Mail} label="Email" />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge
            className="bg-sky-50 text-sky-800 ring-sky-200"
            title={String(params.value ?? "")}
          >
            {params.value as string}
          </TravelPartnerBadge>
        ),
      },
      {
        field: "agencyNumber",
        headerName: "Agency No.",
        flex: 1,
        minWidth: 130,
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={IdCard} label="Agency No." />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge className="bg-violet-50 text-violet-800 ring-violet-200">
            {params.value as string}
          </TravelPartnerBadge>
        ),
      },
      {
        field: "agencyTier",
        headerName: "Agency Tier",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (_value, row) => formatAgencyTier(row.agencyTier),
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={Briefcase} label="Agency Tier" />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge
            className={getAgencyTierTone(params.row.agencyTier)}
          >
            {params.value as string}
          </TravelPartnerBadge>
        ),
      },
      {
        field: "appliedAt",
        headerName: "Applied",
        flex: 0.8,
        minWidth: 110,
        valueGetter: (_value, row) => formatDate(row.appliedAt),
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={CalendarDays} label="Applied" />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge className="bg-slate-100 text-slate-700 ring-slate-200">
            {params.value as string}
          </TravelPartnerBadge>
        ),
      },
    ];

    if (activeTab !== "PENDING") {
      cols.push({
        field: "remarks",
        headerName: "Remarks",
        flex: 1.2,
        minWidth: 160,
        sortable: false,
        renderHeader: () => (
          <TravelPartnerColumnHeader icon={MessageSquare} label="Remarks" />
        ),
        renderCell: (params) => (
          <TravelPartnerBadge
            className={getTravelPartnerRemarkTone(activeTab)}
            title={String(params.value ?? "—")}
          >
            {(params.value as string) || "—"}
          </TravelPartnerBadge>
        ),
      });
    }

    cols.push({
      field: "actions",
      headerName: "Actions",
      flex: 0.7,
      minWidth: 130,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderHeader: () => (
        <TravelPartnerColumnHeader icon={Eye} label="Actions" />
      ),
      renderCell: (params) => (
        <div className="flex items-center justify-end gap-1.5">
          {activeTab === "APPROVED" && canUpdateTier && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openTierModal(params.row);
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Tier
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void openPartnerDetail(params.row);
            }}
            className="rounded-lg border border-[#2f3d95]/25 bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#2f3d95] transition-colors hover:border-[#2f3d95] hover:bg-[#2f3d95] hover:text-white"
          >
            View
          </button>
        </div>
      ),
    });

    return cols;
  }, [activeTab, canUpdateTier, openPartnerDetail, openTierModal]);

  const renderPanel = () => {
    const message = EMPTY_MESSAGES[activeTab];

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#2f3d95]" />
            <p className="text-sm font-medium text-gray-600">
              Loading travel partners...
            </p>
          </div>
        ) : listError ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
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
        ) : partners.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Handshake className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              {message.title}
            </h3>
            <p className="max-w-sm text-sm text-gray-500">{message.description}</p>
          </div>
        ) : (
          <DataTable
            rows={partners}
            columns={columns}
            getRowId={(row) => row.id}
            rowHeight={56}
            pageSizeOptions={[10, 20, 50]}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={totalElements}
            fillContainer
            sx={travelPartnerTableGridSx}
            className="h-full rounded-none border-0 shadow-none"
          />
        )}
      </div>
    );
  };

  const statusBadgeClass: Record<TravelPartnerStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="container mx-auto flex h-full min-h-0 flex-1 flex-col px-4 py-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Travel Partners
            {!loading && (
              <span className="ml-1.5 font-bold text-gray-900">
                ({totalElements} partner{totalElements !== 1 ? "s" : ""})
              </span>
            )}
          </h1>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => {
            setActiveTab(nextTab as TravelPartnerStatus);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <TabsList className="inline-flex h-auto w-full shrink-0 flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
            {PARTNER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              const styles = TRAVEL_PARTNER_TAB_STYLES[tab.value];
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                    isActive ? styles.active : styles.idle,
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? styles.iconActive : styles.iconIdle,
                    )}
                    strokeWidth={2.25}
                  />
                  {tab.label}
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-white/80 text-gray-600",
                    )}
                  >
                    {statusTotals[tab.value]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {PARTNER_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-0 flex min-h-0 flex-1 flex-col"
            >
              {activeTab === tab.value ? renderPanel() : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>

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
