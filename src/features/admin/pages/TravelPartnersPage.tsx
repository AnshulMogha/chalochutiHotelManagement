import { useState } from "react";
import { Button } from "@/components/ui";
import { ApproveRejectModal } from "../components/ApproveRejectModal";
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
  // Step 1 - Personal
  title: string;
  name: string;
  email: string;
  phone?: string;
  // PAN
  agencyNumber: string;
  panNumber: string;
  panCardFileUrl?: string;
  // Step 2 - Business
  gstNumber: string;
  businessAddress: string;
  city: string;
  state: string;
  pincode: string;
  // Bank
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  // Review
  reviewedAt?: string;
  remarks?: string;
}

const DUMMY_PARTNERS: TravelPartner[] = [
  {
    id: "tp1",
    status: "PENDING",
    appliedAt: "2025-01-28T10:00:00Z",
    title: "Mr",
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    agencyNumber: "AGN001234",
    panNumber: "ABCDE1234F",
    panCardFileUrl: "https://picsum.photos/400/250",
    gstNumber: "27AABCU9603R1ZM",
    businessAddress: "123, MG Road, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400069",
    accountHolderName: "Rahul Sharma",
    accountNumber: "XXXX1234",
    ifsc: "HDFC0001234",
    bankName: "HDFC Bank",
  },
  {
    id: "tp2",
    status: "PENDING",
    appliedAt: "2025-01-27T14:30:00Z",
    title: "Mrs",
    name: "Priya Patel",
    email: "priya.patel@travel.com",
    phone: "+91 91234 56789",
    agencyNumber: "AGN005678",
    panNumber: "FGHIJ5678K",
    panCardFileUrl: "https://picsum.photos/400/251",
    gstNumber: "09PPTPT1234K1Z5",
    businessAddress: "45, Brigade Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    accountHolderName: "Priya Patel",
    accountNumber: "XXXX5678",
    ifsc: "ICIC0000789",
    bankName: "ICICI Bank",
  },
  {
    id: "tp3",
    status: "APPROVED",
    appliedAt: "2025-01-25T09:00:00Z",
    reviewedAt: "2025-01-26T11:00:00Z",
    remarks: "Documents verified. Approved.",
    title: "Mr",
    name: "Amit Kumar",
    email: "amit.k@agency.in",
    agencyNumber: "AGN009999",
    panNumber: "KLMNO9012P",
    gstNumber: "07AACKK1234M1ZR",
    businessAddress: "Block A, Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    accountHolderName: "Amit Kumar",
    accountNumber: "XXXX9012",
    ifsc: "SBIN0001234",
    bankName: "State Bank of India",
  },
  {
    id: "tp4",
    status: "REJECTED",
    appliedAt: "2025-01-24T16:00:00Z",
    reviewedAt: "2025-01-25T10:00:00Z",
    remarks: "PAN document unclear. Please resubmit.",
    title: "Ms",
    name: "Sneha Reddy",
    email: "sneha.r@partners.com",
    agencyNumber: "AGN000111",
    panNumber: "PQRST3456U",
    gstNumber: "36AASNR1234L1ZG",
    businessAddress: "Road No 1, Jubilee Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500033",
    accountHolderName: "Sneha Reddy",
    accountNumber: "XXXX3456",
    ifsc: "AXIS0000456",
    bankName: "Axis Bank",
  },
];

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
  const [partners, setPartners] = useState<TravelPartner[]>(() => [...DUMMY_PARTNERS]);
  const [activeTab, setActiveTab] = useState<TravelPartnerStatus>("PENDING");
  const [selectedPartner, setSelectedPartner] = useState<TravelPartner | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailStep, setDetailStep] = useState<1 | 2>(1);

  const filtered = partners.filter((p) => p.status === activeTab);
  const selectedFromList = selectedPartner
    ? partners.find((p) => p.id === selectedPartner.id) ?? selectedPartner
    : null;

  const handleApprove = async (remarks: string) => {
    if (!selectedPartner) return;
    setIsProcessing(true);
    try {
      // TODO: Replace with API call
      await new Promise((r) => setTimeout(r, 600));
      setPartners((prev) =>
        prev.map((p) =>
          p.id === selectedPartner.id
            ? {
                ...p,
                status: "APPROVED" as const,
                reviewedAt: new Date().toISOString(),
                remarks,
              }
            : p
        )
      );
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
      // TODO: Replace with API call
      await new Promise((r) => setTimeout(r, 600));
      setPartners((prev) =>
        prev.map((p) =>
          p.id === selectedPartner.id
            ? {
                ...p,
                status: "REJECTED" as const,
                reviewedAt: new Date().toISOString(),
                remarks,
              }
            : p
        )
      );
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
                  onClick={() => setActiveTab(tabId)}
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
                    {partners.filter((p) => p.status === tabId).length}
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
                          {partner.title} {partner.name}
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
                          onClick={() => {
                            setSelectedPartner(partner);
                            setDetailStep(1);
                          }}
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
      </div>

      {/* Detail Modal */}
      {selectedFromList && (
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
                selectedFromList.status === "PENDING" &&
                  "bg-amber-100 border-l-amber-600 border-gray-200",
                selectedFromList.status === "APPROVED" &&
                  "bg-emerald-100 border-l-emerald-700 border-gray-200",
                selectedFromList.status === "REJECTED" &&
                  "bg-rose-100 border-l-rose-700 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    selectedFromList.status === "PENDING" && "bg-amber-200 text-amber-800",
                    selectedFromList.status === "APPROVED" && "bg-emerald-200 text-emerald-800",
                    selectedFromList.status === "REJECTED" && "bg-rose-200 text-rose-800"
                  )}
                >
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedFromList.title} {selectedFromList.name}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 mt-0.5 text-xs font-medium rounded-full px-2 py-0.5",
                      TAB_CONFIG[selectedFromList.status].badgeClass
                    )}
                  >
                    {(() => {
                      const Icon = TAB_CONFIG[selectedFromList.status].icon;
                      return (
                        <>
                          <Icon className="h-3 w-3" />
                          {TAB_CONFIG[selectedFromList.status].label}
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
              {detailStep === 1 && (
                <div className="space-y-6">
                  <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
                      <User className="h-4 w-4 text-blue-600" />
                      Personal details
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Title</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.title}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Name</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.name}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900 break-all">{selectedFromList.email}</dd>
                        </div>
                      </div>
                      {selectedFromList.phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <dt className="text-gray-500">Phone</dt>
                            <dd className="font-medium text-gray-900">{selectedFromList.phone}</dd>
                          </div>
                        </div>
                      )}
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
                          <dd className="font-medium text-gray-900">{selectedFromList.agencyNumber}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">PAN number</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.panNumber}</dd>
                        </div>
                      </div>
                    </dl>
                    {selectedFromList.panCardFileUrl && (
                      <div>
                        <dt className="text-gray-500 text-sm mb-2 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> PAN card
                        </dt>
                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <img
                            src={selectedFromList.panCardFileUrl}
                            alt="PAN card"
                            className="w-full max-h-64 object-contain"
                          />
                        </div>
                      </div>
                    )}
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
                          <dd className="font-medium text-gray-900">{selectedFromList.gstNumber}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Business address</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.businessAddress}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">City</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.city}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">State</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.state}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Pincode</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.pincode}</dd>
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
                          <dd className="font-medium text-gray-900">{selectedFromList.accountHolderName}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Account number</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.accountNumber}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">IFSC</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.ifsc}</dd>
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-start gap-2">
                        <Landmark className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <dt className="text-gray-500">Bank name</dt>
                          <dd className="font-medium text-gray-900">{selectedFromList.bankName}</dd>
                        </div>
                      </div>
                    </dl>
                  </section>
                </div>
              )}
            </div>

            {selectedFromList.status === "PENDING" && (
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
            {selectedFromList.status !== "PENDING" && (
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
