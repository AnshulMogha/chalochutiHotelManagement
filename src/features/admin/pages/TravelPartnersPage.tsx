import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import { ApproveRejectModal } from "../components/ApproveRejectModal";
import { adminService } from "../services/adminService";
import type {
  TravelAgentOnboardingListItem,
  TravelAgentOnboardingItem,
} from "../services/adminService";
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
  Phone,
  MapPin,
  Hash,
  CalendarDays,
  MessageSquare,
  IdCard,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TravelPartnerStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TravelPartner {
  id: string;
  status: TravelPartnerStatus;
  appliedAt: string;
  // From list API: fullName -> name, agencyName -> agencyNumber, createdAt -> appliedAt
  title: string;
  name: string;
  email: string;
  phone?: string;
  agencyNumber: string;
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

function mapListItemToPartner(item: TravelAgentOnboardingListItem): TravelPartner {
  return {
    id: String(item.id),
    status: item.status,
    appliedAt: item.createdAt,
    title: "",
    name: item.fullName,
    email: item.email,
    agencyNumber: item.agencyName,
  };
}

/** Maps get-by-id API response (TravelAgentOnboardingItem) to UI TravelPartner */
function mapOnboardingToPartner(item: TravelAgentOnboardingItem): TravelPartner {
  return {
    id: String(item.id),
    status: item.status,
    appliedAt: item.createdAt,
    title: item.title ?? "",
    name: item.fullName,
    email: item.email,
    agencyNumber: item.agencyName,
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

const TAB_CONFIG: Record<
  TravelPartnerStatus,
  { label: string; icon: typeof Clock; activeClass: string; badgeClass: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    activeClass: "border-amber-600 text-amber-800 bg-amber-100",
    badgeClass: "bg-amber-200 text-amber-900",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle,
    activeClass: "border-emerald-700 text-emerald-800 bg-emerald-100",
    badgeClass: "bg-emerald-200 text-emerald-900",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    activeClass: "border-rose-700 text-rose-800 bg-rose-100",
    badgeClass: "bg-rose-200 text-rose-900",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TravelPartnersPage() {
  const [partners, setPartners] = useState<TravelPartner[]>([]);
  const [activeTab, setActiveTab] = useState<TravelPartnerStatus>("PENDING");
  const [selectedPartner, setSelectedPartner] = useState<TravelPartner | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailStep, setDetailStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [statusTotals, setStatusTotals] = useState<Record<TravelPartnerStatus, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const response = await adminService.getTravelAgentOnboardingList({
        page: currentPage,
        size: pageSize,
        status: activeTab,
      });
      setPartners(response.content.map(mapListItemToPartner));
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      setHasNext(response.hasNext);
      setHasPrevious(response.hasPrevious);
      setStatusTotals((prev) => ({ ...prev, [activeTab]: response.totalElements }));
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to load travel partners";
      setListError(message);
      setPartners([]);
      setTotalPages(0);
      setTotalElements(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filtered = partners;

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
      await adminService.approveTravelAgentOnboarding(selectedPartner.id, { remarks });
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
      await adminService.rejectTravelAgentOnboarding(selectedPartner.id, { remarks });
      await fetchPartners();
      setShowRejectModal(false);
      setSelectedPartner(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2f3d95] text-white">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Travel Partners</h1>
              <p className="text-sm text-gray-500">
                Review and approve travel partner applications
              </p>
            </div>
          </div>
        </div>

        {listError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-800">{listError}</p>
          </div>
        )}

        {loading && (
          <div className="mb-6 py-12 text-center text-gray-500 text-sm">
            Loading travel partners…
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-t-xl border border-b-0 border-gray-200 shadow-sm">
          <nav className="flex gap-0" aria-label="Tabs">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((tabId) => {
              const config = TAB_CONFIG[tabId];
              const Icon = config.icon;
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => {
                    setActiveTab(tabId);
                    setCurrentPage(0);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3.5 text-sm font-medium rounded-t-lg border-b-2 transition-all",
                    isActive
                      ? config.activeClass
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "opacity-90")} />
                  {config.label}
                  <span
                    className={cn(
                      "ml-1 py-0.5 px-2 rounded-full text-xs font-semibold",
                      isActive ? config.badgeClass : "bg-gray-200 text-gray-600"
                    )}
                  >
                    {statusTotals[tabId]}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            (() => {
              const config = TAB_CONFIG[activeTab];
              const Icon = config.icon;
              return (
                <div className="py-16 text-center">
                  <div
                    className={cn(
                      "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
                      config.badgeClass
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-700">
                    No {activeTab.toLowerCase()} partners
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === "PENDING"
                      ? "New applications will appear here."
                      : `No ${activeTab.toLowerCase()} applications yet.`}
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Name
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <IdCard className="h-3.5 w-3.5" /> Agency No.
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> Applied
                      </span>
                    </th>
                    {activeTab !== "PENDING" && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> Remarks
                        </span>
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Action
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((partner) => (
                    <tr
                      key={partner.id}
                      className={cn(
                        "hover:bg-gray-50/80 transition-colors",
                        activeTab === "PENDING" && "hover:bg-amber-100/60",
                        activeTab === "APPROVED" && "hover:bg-emerald-100/60",
                        activeTab === "REJECTED" && "hover:bg-rose-100/60"
                      )}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {partner.title ? `${partner.title} ` : ""}{partner.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{partner.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{partner.agencyNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(partner.appliedAt)}
                      </td>
                      {activeTab !== "PENDING" && (
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {partner.remarks ?? "—"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-gray-300 hover:border-[#2f3d95] hover:bg-[#2f3d95]/5 hover:text-[#2f3d95]"
                          onClick={() => openPartnerDetail(partner)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing page {totalPages === 0 ? 0 : currentPage + 1} of {totalPages} ({totalElements} total)
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="travel-partner-page-size">
              Rows:
            </label>
            <select
              id="travel-partner-page-size"
              className="h-9 rounded-md border border-gray-300 px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setPageSize(nextSize);
                setCurrentPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious || loading}
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
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
                  "bg-rose-100 border-l-rose-700 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    selectedPartner.status === "PENDING" && "bg-amber-200 text-amber-800",
                    selectedPartner.status === "APPROVED" && "bg-emerald-200 text-emerald-800",
                    selectedPartner.status === "REJECTED" && "bg-rose-200 text-rose-800"
                  )}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedPartner.title ? `${selectedPartner.title} ` : ""}{selectedPartner.name}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 mt-0.5 text-xs font-medium rounded-full px-2 py-0.5",
                      TAB_CONFIG[selectedPartner.status].badgeClass
                    )}
                  >
                    {(() => {
                      const Icon = TAB_CONFIG[selectedPartner.status].icon;
                      return (
                        <>
                          <Icon className="h-3 w-3" />
                          {TAB_CONFIG[selectedPartner.status].label}
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
            <div className="flex border-b border-gray-200 px-6 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setDetailStep(1)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  detailStep === 1
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
                )}
              >
                <User className="h-4 w-4" />
                Step 1 – Personal & PAN
              </button>
              <button
                type="button"
                onClick={() => setDetailStep(2)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  detailStep === 2
                    ? "border-indigo-600 text-indigo-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
                )}
              >
                <Building2 className="h-4 w-4" />
                Step 2 – Business & Bank
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="py-12 text-center text-gray-500 text-sm">Loading details…</div>
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
                            <dd className="font-medium text-gray-900">{selectedPartner.title}</dd>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Name</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.name ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900 break-all">{selectedPartner.email ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Phone</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.phone ?? "—"}</dd>
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
                          <dt className="text-gray-500">Agency number</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.agencyNumber ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">PAN number</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.panNumber ?? "—"}</dd>
                        </div>
                      </div>
                    </dl>
                    {selectedPartner.panCardFileUrl ? (
                      <div>
                        <dt className="text-gray-500 text-sm mb-2 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> PAN card
                        </dt>
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <img
                            src={selectedPartner.panCardFileUrl}
                            alt="PAN card"
                            className="w-full max-h-64 object-contain"
                          />
                        </div>
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
                          <dd className="font-medium text-gray-900">{selectedPartner.gstNumber ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Business address</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.businessAddress ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">City</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.city ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">State</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.state ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Pincode</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.pincode ?? "—"}</dd>
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
                          <dt className="text-gray-500">Account holder name</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.accountHolderName ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Account number</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.accountNumber ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">IFSC</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.ifsc ?? "—"}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <Landmark className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Bank name</dt>
                          <dd className="font-medium text-gray-900">{selectedPartner.bankName ?? "—"}</dd>
                        </div>
                      </div>
                    </dl>
                  </section>
                </div>
              )}
                </>
              )}
            </div>

            {selectedPartner.status === "PENDING" && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
                <Button variant="outline" onClick={() => setSelectedPartner(null)}>
                  Close
                </Button>
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
              </div>
            )}
            {selectedPartner.status !== "PENDING" && (
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
                <Button variant="outline" onClick={() => setSelectedPartner(null)}>
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
    </div>
  );
}
