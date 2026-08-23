import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  HelpdeskActionButton,
  HelpdeskBreakupAccordion,
  HelpdeskCopyChip,
  HelpdeskInfoRow,
  HelpdeskMetric,
  HelpdeskPageShell,
  HelpdeskPanel,
  HelpdeskPaymentAttemptsTable,
  HelpdeskStatusGroup,
  HelpdeskTag,
  HelpdeskTimeline,
  formatGuestCount,
  formatStayLabel,
} from "../components/helpdeskUi";
import {
  helpdeskBookingService,
  type HelpdeskBookingDetail,
} from "../services/helpdeskBookingService";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Copy,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Moon,
  Phone,
  RotateCcw,
  Shield,
  Tag,
  User,
  Users,
  Wallet,
} from "lucide-react";

type DetailTab = "overview" | "financial" | "payment" | "timeline" | "actions";

export default function HelpdeskBookingDetailPage() {
  const { bookingRef = "" } = useParams();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HelpdeskBookingDetail | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    if (!bookingRef.trim()) return;
    let cancelled = false;
    setLoading(true);
    helpdeskBookingService
      .getBookingByReference(bookingRef)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetail(null);
          showToast(extractErrorMessage(error), "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingRef, showToast]);

  const copyValue = async (label: string, value?: string | null) => {
    if (!value?.trim()) {
      showToast(`${label} is not available.`, "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied.`, "success");
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}.`, "error");
    }
  };

  if (loading) {
    return (
      <HelpdeskPageShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2f3d95]" />
        </div>
      </HelpdeskPageShell>
    );
  }

  if (!detail) {
    return (
      <HelpdeskPageShell>
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-slate-600">Booking not found.</p>
          <Link
            to={ROUTES.HELPDESK.LOOKUP}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#2f3d95]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Help Desk
          </Link>
        </div>
      </HelpdeskPageShell>
    );
  }

  const { financial: fin, support, customer } = detail;
  const isPackage = detail.type.toUpperCase() === "PACKAGE";
  const isCancelled = support.bookingStatus.toUpperCase().includes("CANCEL");
  const location = isPackage
    ? fin.destination || "—"
    : [fin.hotelCity, fin.hotelState].filter(Boolean).join(", ");
  const supportHeadline = (support.headline || support.productName).replace(
    /\d{4}-\d{2}-\d{2}/g,
    (value) => formatReportDate(value),
  );
  const successfulPayment = fin.payment.payments.find((item) =>
    item.status.toUpperCase().includes("SUCCESS"),
  );
  const tabs: Array<{ id: DetailTab; label: string; icon: typeof Tag }> = [
    { id: "overview", label: "Overview", icon: User },
    { id: "financial", label: "Financials", icon: Wallet },
    { id: "payment", label: "Payment", icon: Hash },
    { id: "timeline", label: "Timeline", icon: CalendarDays },
    { id: "actions", label: "Actions", icon: Copy },
  ];

  return (
    <HelpdeskPageShell>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          to={ROUTES.HELPDESK.LOOKUP}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Help Desk
        </Link>
        <HelpdeskStatusGroup
          bookingStatus={support.bookingStatus}
          paymentStatus={support.paymentStatus}
          refundStatus={fin.refundStatus}
        />
      </div>

      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#2f3d95] to-[#3d4fa8] px-4 py-3 text-white sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Support ticket view
              </p>
              <h1 className="mt-0.5 font-mono text-lg font-bold sm:text-xl">
                {detail.bookingRef}
              </h1>
              <p className="mt-1 max-w-3xl text-xs text-white/85 sm:text-sm">
                {supportHeadline}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <HelpdeskTag icon={Tag}>{formatStatusLabel(detail.type)}</HelpdeskTag>
              {fin.bookingRate ? (
                <HelpdeskTag>{fin.bookingRate}</HelpdeskTag>
              ) : null}
              {fin.bookedBy ? (
                <HelpdeskTag icon={Users}>
                  Booked by {formatStatusLabel(fin.bookedBy)}
                </HelpdeskTag>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 p-2.5 sm:grid-cols-2 sm:p-3 xl:grid-cols-4">
          <HelpdeskMetric
            label="Collected"
            value={formatFinanceMoney(fin.amountCollected)}
            icon={Wallet}
            tone="blue"
            compact
          />
          <HelpdeskMetric
            label={isPackage ? "Supplier payout" : "Hotel payout"}
            value={formatFinanceMoney(
              (isPackage ? fin.totalSupplierPayout : fin.hotelPayout) ?? fin.hotelPayout,
            )}
            icon={Building2}
            tone="emerald"
            compact
          />
          <HelpdeskMetric
            label="Customer price"
            value={formatFinanceMoney(fin.customerSellingPrice)}
            icon={Tag}
            tone="slate"
            compact
          />
          <HelpdeskMetric
            label={isPackage ? "Gross profit" : "Refund"}
            value={formatFinanceMoney(
              (isPackage ? fin.grossProfit : fin.refundAmount) ?? fin.refundAmount,
            )}
            icon={RotateCcw}
            tone={isPackage || fin.refundAmount.amount > 0 ? "amber" : "slate"}
            compact
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="inline-flex w-full flex-wrap items-center gap-1.5 rounded-lg bg-slate-100/70 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  activeTab === tab.id
                    ? "bg-white text-[#2f3d95] shadow-sm ring-1 ring-[#2f3d95]/20"
                    : "text-slate-600 hover:bg-white/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <HelpdeskPanel title="Customer" subtitle="Primary contact for this booking">
            <HelpdeskInfoRow icon={User} label="Name" value={customer.name} />
            <HelpdeskInfoRow
              icon={Mail}
              label="Email"
              value={customer.email || "—"}
            />
            <HelpdeskInfoRow
              icon={Phone}
              label="Phone"
              value={customer.phone || "—"}
            />
            {fin.bookingOwner ? (
              <div className="mt-2.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  <User className="h-3.5 w-3.5" />
                  Booking owner
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {fin.bookingOwner.name}
                </p>
                <p className="text-xs text-slate-600">
                  {formatStatusLabel(fin.bookingOwner.type || "—")}
                  {fin.bookingOwner.email ? ` · ${fin.bookingOwner.email}` : ""}
                  {fin.bookingOwner.code ? ` · #${fin.bookingOwner.code}` : ""}
                </p>
              </div>
            ) : null}
            {detail.agency ? (
              <div className="mt-2.5 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Agency
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {detail.agency.agencyName || "—"}
                </p>
                <p className="text-xs text-slate-600">
                  {formatStatusLabel(detail.agency.type || "—")}
                  {detail.agency.contactName
                    ? ` · ${detail.agency.contactName}`
                    : ""}
                  {detail.agency.email ? ` · ${detail.agency.email}` : ""}
                </p>
              </div>
            ) : null}
          </HelpdeskPanel>

          <HelpdeskPanel
            title={isPackage ? "Travel details" : "Stay details"}
            subtitle={support.productName}
          >
            <HelpdeskInfoRow
              icon={Building2}
              label={isPackage ? "Package" : "Property"}
              value={isPackage ? fin.packageName || support.productName : fin.hotelName}
            />
            <HelpdeskInfoRow
              icon={MapPin}
              label={isPackage ? "Destination" : "Location"}
              value={location || "—"}
            />
            <HelpdeskInfoRow
              icon={CalendarDays}
              label={isPackage ? "Travel dates" : "Stay"}
              value={formatStayLabel(fin.checkIn, fin.checkOut, fin.nights)}
            />
            <HelpdeskInfoRow
              icon={Moon}
              label="Guests"
              value={formatGuestCount(fin.adult, fin.children)}
            />
            <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
              {fin.hotelCode ? (
                <HelpdeskCopyChip
                  label="Hotel code"
                  value={fin.hotelCode}
                  onCopy={() => void copyValue("Hotel code", fin.hotelCode)}
                />
              ) : null}
              {fin.packageCode ? (
                <HelpdeskCopyChip
                  label="Package code"
                  value={fin.packageCode}
                  onCopy={() => void copyValue("Package code", fin.packageCode)}
                />
              ) : null}
              <HelpdeskCopyChip
                label="Booking date"
                value={formatReportDate(fin.bookingDate)}
                onCopy={() => void copyValue("Booking date", fin.bookingDate)}
              />
            </div>
          </HelpdeskPanel>
        </div>
      ) : null}

      {activeTab === "financial" ? (
        <div className="space-y-4">
          <HelpdeskPanel title="Booking metadata">
            <HelpdeskInfoRow
              icon={Tag}
              label="Source"
              value={formatStatusLabel(fin.bookingSource || "—")}
            />
            <HelpdeskInfoRow
              icon={Users}
              label="Rate type"
              value={fin.bookingRate || "—"}
            />
            <HelpdeskInfoRow
              icon={Wallet}
              label="Promotion discount"
              value={formatFinanceMoney(fin.promotionDiscount)}
            />
            <HelpdeskInfoRow
              icon={Building2}
              label="OTA revenue"
              value={formatFinanceMoney(fin.otaRevenue)}
            />
          </HelpdeskPanel>
          <HelpdeskPanel
            title="Financial breakdown"
            subtitle="Expand sections for support troubleshooting"
          >
            <div className="space-y-3">
              <HelpdeskBreakupAccordion
                title="Customer price breakup"
                breakup={fin.customerSellingPriceBreakup}
                defaultOpen
              />
              <HelpdeskBreakupAccordion
                title={isPackage ? "Supplier payout breakup" : "Hotel payout breakup"}
                breakup={fin.hotelPayoutBreakup}
              />
              <HelpdeskBreakupAccordion
                title="OTA revenue breakup"
                breakup={fin.otaRevenueBreakup}
              />
            </div>
          </HelpdeskPanel>
        </div>
      ) : null}

      {activeTab === "payment" ? (
        <div className="space-y-4">
          <HelpdeskPanel
            title="Payment"
            subtitle={
              successfulPayment
                ? `${formatStatusLabel(successfulPayment.paymentMethod)} · ${formatFinanceMoney(successfulPayment.amount)}`
                : "Payment activity"
            }
          >
            <HelpdeskPaymentAttemptsTable attempts={fin.payment.payments} />
          </HelpdeskPanel>
          {fin.cancellationPolicy || fin.cancellationPolicyLines.length ? (
            <HelpdeskPanel title="Cancellation policy">
              {fin.cancellationPolicy ? (
                <p className="text-sm text-slate-700">{fin.cancellationPolicy}</p>
              ) : null}
              {fin.cancellationPolicyLines.length > 1 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {fin.cancellationPolicyLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </HelpdeskPanel>
          ) : null}
          {isCancelled ? (
            <HelpdeskPanel title="Cancellation summary">
              <div className="grid gap-4 sm:grid-cols-2">
                <HelpdeskInfoRow
                  icon={Shield}
                  label="Cancelled by"
                  value={formatStatusLabel(fin.cancelledBy || "—")}
                />
                <HelpdeskInfoRow
                  icon={CalendarDays}
                  label="Cancelled on"
                  value={formatReportDate(fin.cancellationDateTime)}
                />
                <HelpdeskInfoRow
                  icon={RotateCcw}
                  label="Refund amount"
                  value={formatFinanceMoney(fin.refundAmount)}
                />
                <HelpdeskInfoRow
                  icon={Tag}
                  label="Cancellation charge"
                  value={formatFinanceMoney(fin.cancellationCharge)}
                />
              </div>
              {fin.cancellationReason ? (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {fin.cancellationReason}
                </p>
              ) : null}
            </HelpdeskPanel>
          ) : null}
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <HelpdeskPanel title="Activity timeline">
            <HelpdeskTimeline events={detail.timeline} />
          </HelpdeskPanel>
          <HelpdeskPanel title="Support notes">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2.5">
              <p className="text-sm text-indigo-900">{supportHeadline}</p>
            </div>
          </HelpdeskPanel>
        </div>
      ) : null}

      {activeTab === "actions" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <HelpdeskPanel title="Quick actions">
            <div className="space-y-3">
              <div className="grid gap-2">
                <HelpdeskCopyChip
                  label="Booking reference"
                  value={detail.bookingRef}
                  onCopy={() => void copyValue("Booking reference", detail.bookingRef)}
                />
                {successfulPayment?.paymentTransactionId ? (
                  <HelpdeskCopyChip
                    label="Payment ID"
                    value={successfulPayment.paymentTransactionId}
                    onCopy={() =>
                      void copyValue(
                        "Payment ID",
                        successfulPayment.paymentTransactionId,
                      )
                    }
                  />
                ) : null}
                <HelpdeskCopyChip
                  label="Internal booking ID"
                  value={String(detail.bookingId)}
                  onCopy={() =>
                    void copyValue("Internal booking ID", String(detail.bookingId))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <HelpdeskActionButton
                  icon={Copy}
                  onClick={() =>
                    void copyValue("Booking reference", detail.bookingRef)
                  }
                >
                  Copy reference
                </HelpdeskActionButton>
                <HelpdeskActionButton
                  icon={Hash}
                  onClick={() =>
                    void copyValue(
                      "Payment ID",
                      successfulPayment?.paymentTransactionId,
                    )
                  }
                >
                  Copy payment ID
                </HelpdeskActionButton>
              </div>
            </div>
          </HelpdeskPanel>
          <HelpdeskPanel title="Account summary">
            <HelpdeskInfoRow
              icon={Wallet}
              label="Collected"
              value={formatFinanceMoney(fin.amountCollected)}
            />
            <HelpdeskInfoRow
              icon={RotateCcw}
              label="Refund"
              value={formatFinanceMoney(fin.refundAmount)}
            />
            <HelpdeskInfoRow
              icon={Building2}
              label="Revenue"
              value={formatFinanceMoney(fin.otaRevenue)}
            />
          </HelpdeskPanel>
        </div>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </HelpdeskPageShell>
  );
}
