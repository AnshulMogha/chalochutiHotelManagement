import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  bookingService,
  moneyAmount,
  type AdminBookingFullDetail,
  type AppliedPromotion,
  type RateBreakup,
} from "../services/bookingService";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  FINANCE_KPI_TONES,
  FinanceKpiCard,
  StatusBadge,
  bookingStatusTone,
  paymentStatusTone,
  refundStatusTone,
} from "@/features/reports/components/hotelFinancialMisUi";
import { formatStatusLabel } from "@/features/reports/components/reportUiHelpers";
import { VoucherViewModal } from "../components/VoucherViewModal";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  HandCoins,
  Landmark,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Scale,
  Shield,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  User,
  Utensils,
  Wallet,
} from "lucide-react";

type DetailTab =
  | "bookingSummary"
  | "roomPricing"
  | "financial"
  | "payment"
  | "cancellation";

const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: "bookingSummary", label: "Booking Summary" },
  { value: "roomPricing", label: "Room & Pricing" },
  { value: "financial", label: "Financial" },
  { value: "payment", label: "Payment" },
  { value: "cancellation", label: "Cancellation" },
];

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(value);
  }
}

function formatCurrency(
  amount: number | undefined | null,
  currency = "INR",
): string {
  if (amount === undefined || amount === null) return "—";
  if (Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const rounded = Number(value);
  const digits = Number.isInteger(rounded) || Math.abs(rounded * 10 - Math.round(rounded * 10)) < 1e-8
    ? 1
    : 2;
  const shown = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  return `${shown}%`;
}

function ratePercent(
  part: number | undefined | null,
  base: number | undefined | null,
): number | undefined {
  if (part == null || base == null || !(base > 0) || !Number.isFinite(part)) {
    return undefined;
  }
  const pct = (Number(part) / Number(base)) * 100;
  return Number.isFinite(pct) ? pct : undefined;
}

function withRate(label: string, pct: number | undefined | null): string {
  return pct != null ? `${label} @ ${formatPercent(pct)}` : label;
}

function firstPercent(
  ...values: Array<number | null | undefined>
): number | undefined {
  for (const value of values) {
    if (value != null && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function formatLongDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatRuleName(name: string | undefined | null): string {
  if (!name || name.toUpperCase() === "NONE") return "None";
  return name;
}

function promoDisplayLabel(promo: AppliedPromotion): string {
  if (promo.displayLine) return promo.displayLine;
  const percent = promo.percentLabel || formatPercent(promo.discountPercentage);
  return percent ? `${promo.promotionName} (${percent})` : promo.promotionName;
}

function getPaymentStatusStyle(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  const s = status.toUpperCase();
  if (s.includes("PAID") || s.includes("CONFIRMED"))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s.includes("PENDING"))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (s.includes("FAILED") || s.includes("CANCELLED") || s.includes("CANCELED"))
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getCancellationPolicyLines(policy: string | null | undefined): string[] {
  return (policy || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getServiceFeeFromBreakup(rateBreakup: RateBreakup | undefined): number {
  if (!rateBreakup) return 0;
  return (
    rateBreakup.serviceFeeIncludingGst ??
    rateBreakup.serviceChargeAmount ??
    0
  );
}

function SectionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
  className = "",
  compact = false,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm ${className}`}
    >
      <div
        className={`border-b border-gray-100 ${iconBg} ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center rounded-lg ${iconColor} ${compact ? "h-7 w-7" : "h-8 w-8"}`}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
      </div>
      <div className={compact ? "p-3" : "p-4"}>{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(5.5rem,38%)_minmax(0,1fr)] items-start gap-x-3 border-b border-gray-50 last:border-0 ${
        compact ? "py-1.5" : "py-2"
      }`}
    >
      <dt className="text-xs leading-snug text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium leading-snug break-words text-gray-900">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function SummaryField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-snug break-words text-gray-900">
        {value ?? "—"}
      </p>
    </div>
  );
}

function CalcLine({
  index,
  label,
  amount,
  currency,
  negative = false,
}: {
  index?: string;
  label: string;
  amount: number | undefined | null;
  currency: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-1.5 text-xs">
      <span className="min-w-0 text-gray-600">
        {index ? <span className="mr-1 text-gray-400">{index}.</span> : null}
        {label}
      </span>
      <span
        className={`shrink-0 font-medium tabular-nums ${
          negative ? "text-emerald-700" : "text-gray-900"
        }`}
      >
        {negative ? "−" : ""}
        {formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

function CalcSubtotal({
  letter,
  label,
  amount,
  currency,
}: {
  letter: string;
  label: string;
  amount: number | undefined | null;
  currency: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-900">
      <span>
        ({letter}) {label}
      </span>
      <span className="shrink-0 tabular-nums">{formatCurrency(amount, currency)}</span>
    </div>
  );
}

function CalcSectionHeader({ title }: { title: string }) {
  return (
    <div className="border-y border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
  );
}

function TableHead({
  label,
  hint,
  align = "right",
}: {
  label: string;
  hint?: string;
  align?: "left" | "right";
}) {
  return (
    <th className="whitespace-nowrap px-3 py-2 align-top">
      <div
        className={
          align === "right" ? "flex flex-col items-end" : "flex flex-col items-start"
        }
      >
        <span className="h-4 text-[11px] font-semibold leading-4 text-slate-700">
          {label}
        </span>
        <span className="mt-0.5 h-3.5 text-[10px] leading-3.5 text-slate-400">
          {hint || "\u00a0"}
        </span>
      </div>
    </th>
  );
}

function RateRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-1.5 text-xs ${
        highlight ? "bg-slate-50 font-semibold" : "bg-white"
      }`}
    >
      <div className="min-w-0 shrink text-gray-600">{label}</div>
      <div className="shrink-0 text-right font-medium tabular-nums text-gray-900">
        {value ?? "—"}
      </div>
    </div>
  );
}

function RuleCard({
  title,
  ruleName,
  percent,
  amount,
  currency,
}: {
  title: string;
  ruleName: string;
  percent?: number | null;
  amount?: number | null;
  currency?: string;
}) {
  const hasPercent = percent != null && !Number.isNaN(percent);
  const hasAmount = amount != null && amount > 0 && currency;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">
        {ruleName || "—"}
        {hasPercent ? (
          <span className="ml-1.5 text-xs font-medium text-indigo-700">
            {formatPercent(percent)}
          </span>
        ) : null}
      </p>
      {hasAmount ? (
        <p className="mt-0.5 text-xs tabular-nums text-slate-700">
          {formatCurrency(amount, currency)}
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  listItemId: string | undefined;
  backHotelId: string | null;
};

export default function AdminBookingDetailPage({
  listItemId,
  backHotelId,
}: Props) {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const [detail, setDetail] = useState<AdminBookingFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVoucher, setShowVoucher] = useState(false);
  const [tab, setTab] = useState<DetailTab>("bookingSummary");
  // Reused across StrictMode remounts so the same booking is requested once.
  const requestRef = useRef<{
    key: string;
    promise: Promise<AdminBookingFullDetail>;
  } | null>(null);

  useEffect(() => {
    if (!listItemId) {
      setLoading(false);
      return;
    }
    const key = listItemId;
    if (requestRef.current?.key !== key) {
      requestRef.current = {
        key,
        promise: bookingService.getAdminBookingFullDetail(listItemId),
      };
    }
    const { promise } = requestRef.current;
    let cancelled = false;
    setLoading(true);
    promise
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (requestRef.current?.key === key) requestRef.current = null;
        if (!cancelled) {
          console.error("Error fetching admin booking detail:", err);
          showToastRef.current("Failed to load booking details", "error");
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listItemId]);

  const backToBookings = () => {
    const to = backHotelId
      ? `${ROUTES.BOOKINGS.LIST}?hotelId=${backHotelId}`
      : ROUTES.BOOKINGS.LIST;
    navigate(to);
  };

  if (!listItemId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600 text-center">Invalid booking.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-[#2f3d95] animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-600">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Booking not found.</p>
          <button
            type="button"
            onClick={backToBookings}
            className="mt-4 inline-flex items-center gap-2 text-[#2f3d95] font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const summary = detail.bookingSummary;
  const cancellation = detail.cancellation;
  const rateBreakup = detail.pricing.rateBreakup;
  const currency = detail.pricing.currency || rateBreakup?.currency || "INR";
  const serviceFeeExclGst =
    detail.pricing.serviceFeeAmount ??
    detail.financials.serviceFeeAmount ??
    detail.financials.serviceFee?.amount ??
    0;
  const serviceFeeInclGst = getServiceFeeFromBreakup(rateBreakup);
  const extraAdultCount =
    detail.financials.extraAdultCount ?? rateBreakup?.extraAdultCount;
  const extraAdultCharges =
    detail.financials.extraAdultCharges ?? detail.financials.extraChildCharges;
  const promotionDiscount =
    detail.pricing.promotionDiscount ?? detail.financials.promotionDiscount ?? 0;
  const appliedPromotions: AppliedPromotion[] =
    detail.financials.appliedPromotions?.length
      ? detail.financials.appliedPromotions
      : detail.pricing.rateBreakup?.appliedPromotions ?? [];
  const agencyTier =
    detail.financials.agencyTier ?? rateBreakup?.agencyTier ?? null;
  const agencyIncentivePercent =
    detail.financials.agencyIncentivePercent ??
    rateBreakup?.agencyIncentivePercent ??
    null;
  const agencyIncentiveType =
    detail.financials.agencyIncentiveType ??
    rateBreakup?.agencyIncentiveType ??
    null;
  const agencyIncentiveSource =
    detail.financials.agencyIncentiveSource ??
    rateBreakup?.agencyIncentiveSource ??
    null;
  const agencyIncentiveCategory =
    detail.financials.agencyIncentiveCategory ??
    rateBreakup?.agencyIncentiveCategory ??
    null;
  const agencyCommissionAmount =
    detail.financials.agencyCommission ??
    detail.pricing.agencyCommission ??
    rateBreakup?.agencyCommission ??
    rateBreakup?.agentCommission ??
    0;
  const agentTdsPercent =
    detail.financials.agentTdsPercent ?? rateBreakup?.agentTdsPercent ?? null;
  const agentTdsAmount =
    detail.financials.agentTdsAmount ?? rateBreakup?.agentTdsAmount ?? null;
  const agentNetCommission =
    detail.financials.agentNetCommission ??
    rateBreakup?.agentNetCommission ??
    null;
  const agentPayable = rateBreakup?.agentPayable ?? null;
  const isPackageBooking = [
    detail.financials.bookingMode,
    detail.financials.selectedPricingSource,
    detail.financials.selectedCustomerType,
    agencyIncentiveCategory,
    agencyIncentiveSource,
  ].some((value) => String(value || "").toUpperCase().includes("PACKAGE"));
  const isAgentBooking =
    agencyCommissionAmount > 0 ||
    (agentNetCommission ?? 0) > 0 ||
    Boolean(agencyTier);
  const showAgencyBlock =
    isAgentBooking ||
    isPackageBooking ||
    ((agencyIncentivePercent ?? 0) > 0 && Boolean(agencyIncentiveSource));
  const packageTaxAmount =
    rateBreakup?.propertyTaxes ?? detail.pricing.gstAmount ?? 0;
  const packageCommissionAmount =
    rateBreakup?.commissionAmount ?? detail.pricing.commissionAmount ?? 0;
  const packageCommissionGst =
    rateBreakup?.commissionGst ?? detail.financials.commissionGst ?? 0;
  const packageTaxDeduction =
    rateBreakup?.taxDeductions ??
    (detail.financials.tcsAmount ?? 0) + (detail.financials.tdsAmount ?? 0);
  const showCommissionBreakup =
    !isPackageBooking ||
    packageCommissionAmount > 0 ||
    packageCommissionGst > 0;
  const showTaxDeductionBreakup =
    !isPackageBooking || packageTaxDeduction > 0;
  const showRoomDayPromo =
    promotionDiscount > 0 ||
    appliedPromotions.length > 0 ||
    detail.roomDayFinancials.some((r) => (r.promotionDiscount ?? 0) > 0);
  const isCancelledBooking = `${summary.bookingStatus} ${detail.payment.paymentStatus}`
    .toUpperCase()
    .includes("CANCEL");
  const totalRooms = detail.rooms.reduce(
    (sum, room) => sum + (room.quantity || 0),
    0,
  );
  const guestPaidAmount =
    detail.payment.paidAmount != null && detail.payment.paidAmount > 0
      ? detail.payment.paidAmount
      : summary.totalAmount;
  const outstandingAmount =
    detail.payment.customerOutstanding ?? detail.payment.pendingAmount ?? 0;
  const refundedAmount =
    detail.payment.refundedAmount ??
    moneyAmount(cancellation.refundAmount) ??
    moneyAmount(cancellation.settlement?.customerRefund) ??
    0;
  const originalReservationValue =
    moneyAmount(cancellation.originalReservationValue) ?? guestPaidAmount;
  const cancellationChargeAmount =
    moneyAmount(cancellation.currentCancellationCharge) ??
    moneyAmount(cancellation.cancellationCharge) ??
    cancellation.cancelAmount;
  const payableToProperty =
    moneyAmount(cancellation.settlement?.amountPayableToProperty) ??
    moneyAmount(cancellation.amountPayableToProperty) ??
    detail.pricing.hotelPayout ??
    rateBreakup?.payableToHotel;
  const cancellationPolicyLines = getCancellationPolicyLines(
    cancellation.cancellationPolicy,
  );
  const cancelNowCharge = cancellationChargeAmount;
  const refundIfCancelledNow =
    moneyAmount(cancellation.refundAmountIfCancelledNow) ??
    moneyAmount(cancellation.refundAmount);
  const isNonRefundable =
    cancellation.nonRefundable === true ||
    String(cancellation.currentPolicyStage || "")
      .toUpperCase()
      .includes("NOT_CANCELLABLE") ||
    String(cancellation.cancellationPolicy || "")
      .toLowerCase()
      .includes("non-refundable");
  const pricingSource =
    detail.financials.selectedPricingSource ||
    detail.financials.bookingMode ||
    null;
  const extraGuests = (detail.guest.guests ?? []).filter((g) => {
    const sameName =
      (g.name || "").trim().toLowerCase() ===
      (detail.guest.name || "").trim().toLowerCase();
    const sameEmail =
      (g.email || "").trim().toLowerCase() ===
      (detail.guest.email || "").trim().toLowerCase();
    const samePhone =
      (g.phone || "").replace(/\s/g, "") ===
      (detail.guest.phone || "").replace(/\s/g, "");
    return !(sameName && sameEmail && samePhone);
  });
  const gstPercent = firstPercent(
    detail.financials.gstPercent,
    detail.financials.gst?.ratePercent,
  );
  const commissionPercent = firstPercent(
    detail.financials.commissionPercent,
    detail.financials.commission?.ratePercent,
  );
  const commissionGstPercent = firstPercent(
    detail.financials.commissionGstRated?.ratePercent,
  );
  const tcsPercent = firstPercent(
    detail.financials.tcsPercent,
    detail.financials.tcs?.ratePercent,
  );
  const tdsPercent = firstPercent(
    detail.financials.tdsPercent,
    detail.financials.tds?.ratePercent,
  );
  const cancellationChargePercent = ratePercent(
    cancellationChargeAmount,
    originalReservationValue,
  );
  const payablePercent = ratePercent(
    payableToProperty,
    originalReservationValue,
  );
  const refundPercent = ratePercent(refundedAmount, originalReservationValue);
  const gstLabel =
    detail.financials.gst?.rateLabel ||
    (gstPercent != null ? `GST (${formatPercent(gstPercent)})` : "GST");
  const commissionLabel =
    detail.financials.commission?.rateLabel ||
    (commissionPercent != null
      ? `Commission (${formatPercent(commissionPercent)})`
      : "Commission");
  const commissionGstLabel =
    detail.financials.commissionGstRated?.rateLabel ||
    (commissionGstPercent != null
      ? `GST on commission @ ${formatPercent(commissionGstPercent)}`
      : "GST on commission");
  const tcsLabel =
    detail.financials.tcs?.rateLabel ||
    (tcsPercent != null ? `TCS (${formatPercent(tcsPercent)})` : "TCS");
  const tdsLabel =
    detail.financials.tds?.rateLabel ||
    (tdsPercent != null ? `TDS (${formatPercent(tdsPercent)})` : "TDS");

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4">
        {/* Hero header */}
        <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-linear-to-r from-blue-50/80 via-white to-indigo-50/60 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={backToBookings}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                    Admin booking view
                  </p>
                  <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                    {summary.bookingRef}
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    ID {summary.bookingId} · {summary.hotelName} · {summary.bookedVia}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge
                  status={summary.bookingStatus}
                  tone={bookingStatusTone(summary.bookingStatus)}
                />
                {isPackageBooking ? (
                  <StatusBadge
                    status={
                      detail.financials.selectedPricingSource ||
                      detail.financials.bookingMode ||
                      "PACKAGE"
                    }
                    tone="bg-violet-50 text-violet-700 ring-violet-200"
                  />
                ) : null}
                <StatusBadge
                  status={detail.payment.paymentStatus}
                  tone={paymentStatusTone(detail.payment.paymentStatus)}
                />
                <button
                  type="button"
                  onClick={() => setShowVoucher(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Voucher
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Hotel
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {summary.hotelName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {summary.hotelCity || summary.hotelAddress || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Stay
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDate(summary.checkInDate)} – {formatDate(summary.checkOutDate)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {summary.nightsDisplay}
                  {totalRooms ? ` · ${totalRooms} room(s)` : ""} ·{" "}
                  {summary.occupancyDisplay || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Guest
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {detail.guest.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Booked {formatDateTime(summary.bookedOn)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Tag className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Channel
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {summary.bookedVia}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {[
                    detail.rooms[0]?.mealPlan,
                    isPackageBooking
                      ? formatStatusLabel(
                          detail.financials.selectedPricingSource ||
                            detail.financials.bookingMode ||
                            "PACKAGE",
                        )
                      : pricingSource,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial KPIs */}
        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          <FinanceKpiCard
            label={
              isCancelledBooking
                ? isAgentBooking
                  ? "Agent paid"
                  : "Original value"
                : isAgentBooking
                  ? "Agent paid"
                  : "Guest paid"
            }
            value={formatCurrency(
              isCancelledBooking && !isAgentBooking
                ? originalReservationValue
                : guestPaidAmount,
              currency,
            )}
            sub={
              isCancelledBooking && isAgentBooking
                ? `Reservation ${formatCurrency(originalReservationValue, currency)}`
                : summary.bookedVia
            }
            icon={HandCoins}
            tone={FINANCE_KPI_TONES.collected}
            onClick={() => setTab("payment")}
            actionLabel=""
          />
          {isCancelledBooking ? (
            <FinanceKpiCard
              label="Cancellation charge"
              value={formatCurrency(cancellationChargeAmount, currency)}
              sub={
                cancellationChargePercent != null
                  ? formatPercent(cancellationChargePercent)
                  : cancellation.cancellationDatetime
                    ? formatDateTime(cancellation.cancellationDatetime)
                    : undefined
              }
              icon={Receipt}
              tone={FINANCE_KPI_TONES.cancellation}
              onClick={() => setTab("cancellation")}
              actionLabel=""
            />
          ) : null}
          <FinanceKpiCard
            label="Payable to property"
            value={formatCurrency(payableToProperty, currency)}
            sub={
              isCancelledBooking ? "After cancellation" : pricingSource || undefined
            }
            icon={Landmark}
            tone={FINANCE_KPI_TONES.hotelPayout}
            onClick={() => setTab("financial")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="OTA net revenue"
            value={formatCurrency(detail.pricing.otaNetRevenue, currency)}
            sub={
              isPackageBooking
                ? "Package rate"
                : `Gross ${formatCurrency(detail.pricing.otaGrossRevenue, currency)}`
            }
            icon={Target}
            tone={FINANCE_KPI_TONES.ota}
            onClick={() => setTab("financial")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Commission"
            value={formatCurrency(detail.pricing.commissionAmount, currency)}
            sub={
              isPackageBooking
                ? formatStatusLabel(
                    detail.financials.selectedPricingSource || "PACKAGE_RATE",
                  )
                : undefined
            }
            icon={Scale}
            tone={FINANCE_KPI_TONES.margin}
            onClick={() => setTab("roomPricing")}
            actionLabel=""
          />
          {isCancelledBooking ? (
            <FinanceKpiCard
              label={
                cancellation.cancelledBy?.toUpperCase() === "AGENT"
                  ? "Agent refund"
                  : "Customer refund"
              }
              value={formatCurrency(refundedAmount, currency)}
              sub={
                cancellation.refundStatus
                  ? formatStatusLabel(cancellation.refundStatus)
                  : undefined
              }
              icon={Wallet}
              tone={FINANCE_KPI_TONES.refund}
              onClick={() => setTab("cancellation")}
              actionLabel=""
            />
          ) : isAgentBooking ? (
            <FinanceKpiCard
              label="Agency commission"
              value={formatCurrency(agencyCommissionAmount, currency)}
              sub={
                [
                  agencyTier,
                  agencyIncentivePercent != null
                    ? formatPercent(agencyIncentivePercent)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              icon={Sparkles}
              tone={FINANCE_KPI_TONES.refund}
              onClick={() => setTab("financial")}
              actionLabel=""
            />
          ) : (
            <FinanceKpiCard
              label="Service fee"
              value={formatCurrency(serviceFeeExclGst, currency)}
              sub={
                serviceFeeInclGst > 0
                  ? `Incl. GST ${formatCurrency(serviceFeeInclGst, currency)}`
                  : undefined
              }
              icon={Sparkles}
              tone={FINANCE_KPI_TONES.refund}
              onClick={() => setTab("roomPricing")}
              actionLabel=""
            />
          )}
          <FinanceKpiCard
            label="Final payable"
            value={formatCurrency(detail.pricing.finalPayable, currency)}
            sub={
              outstandingAmount > 0
                ? `Outstanding ${formatCurrency(outstandingAmount, currency)}`
                : undefined
            }
            icon={Wallet}
            tone={FINANCE_KPI_TONES.outstanding}
            onClick={() => setTab("payment")}
            actionLabel=""
          />
        </div>

        {/* Tabs */}
        <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm">
          <div className="flex min-w-max gap-1">
            {DETAIL_TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  tab === item.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "bookingSummary" ? (
        <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
          <SectionCard
            compact
            icon={Building2}
            iconBg="bg-sky-50"
            iconColor="bg-sky-100 text-sky-600"
            title="Booking summary"
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryField label="Booking ref" value={summary.bookingRef} />
              <SummaryField label="Booking ID" value={String(summary.bookingId)} />
              <SummaryField label="Status" value={summary.bookingStatus} />
              <SummaryField label="Hotel" value={summary.hotelName} />
              <SummaryField label="City" value={summary.hotelCity || "—"} />
              <SummaryField label="Booked via" value={summary.bookedVia} />
              <SummaryField
                label="Check-in"
                value={formatDate(summary.checkInDate)}
              />
              <SummaryField
                label="Check-out"
                value={formatDate(summary.checkOutDate)}
              />
              <SummaryField label="Nights" value={summary.nightsDisplay} />
              <SummaryField label="Occupancy" value={summary.occupancyDisplay} />
              <SummaryField
                label="Booked on"
                value={formatDateTime(summary.bookedOn)}
              />
              <SummaryField
                label="Total amount"
                value={formatCurrency(summary.totalAmount, currency)}
              />
              <SummaryField
                label="Address"
                value={summary.hotelAddress || "—"}
                className="sm:col-span-2 xl:col-span-3"
              />
            </div>
          </SectionCard>

          <SectionCard
            compact
            icon={User}
            iconBg="bg-indigo-50"
            iconColor="bg-indigo-100 text-indigo-600"
            title="Guest"
          >
            <p className="text-sm font-semibold text-gray-900">
              {detail.guest.name}
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="min-w-0 break-words">
                  {detail.guest.email || "—"}
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="min-w-0 break-words">
                  {detail.guest.phone || "—"}
                </span>
              </div>
            </div>
            {extraGuests.length > 0 ? (
              <div className="mt-3 border-t border-gray-100 pt-2">
                <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                  Additional guests ({extraGuests.length})
                </p>
                <ul className="space-y-1">
                  {extraGuests.map((g, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs"
                    >
                      <span className="font-medium text-gray-900">{g.name}</span>
                      {g.email ? (
                        <span className="mt-0.5 block break-words text-[10px] text-gray-500">
                          {g.email}
                        </span>
                      ) : null}
                      {g.phone ? (
                        <span className="block text-[10px] text-gray-500">
                          {g.phone}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>
        </div>
        ) : null}

        {tab === "roomPricing" ? (
        <>
        <SectionCard
          compact
          icon={BedDouble}
          iconBg="bg-violet-50"
          iconColor="bg-violet-100 text-violet-600"
          title="Rooms"
          className="mb-3"
        >
          {detail.rooms.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {detail.rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {room.roomName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Utensils className="h-3 w-3 text-amber-500" />
                      {room.mealPlan || "—"}
                    </span>
                    <span>{room.occupancyDisplay || "—"}</span>
                    {room.quantity ? <span>Qty {room.quantity}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">—</p>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Total rooms: {totalRooms || "—"}
          </p>
        </SectionCard>
        {(() => {
          const rows = detail.roomDayFinancials;
          const commissionInclusiveTotal =
            detail.financials.commissionInclusiveGst ??
            rateBreakup?.commissionTotal ??
            (detail.pricing.commissionAmount ?? 0) +
              (detail.financials.commissionGst ?? 0);
          const commissionSum = rows.reduce(
            (sum, row) => sum + (row.commission ?? 0),
            0,
          );
          const moneyCell = (amount: number) => (
            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
              {formatCurrency(amount, currency)}
            </td>
          );
          const rowAmounts = rows.map((row) => {
            const charges = row.roomCharges ?? 0;
            const promo = row.promotionDiscount ?? 0;
            const net = row.netAccommodation ?? charges - promo;
            const gst = row.hotelGst ?? 0;
            const gross = row.propertyGross ?? net + gst;
            const commIncl =
              commissionSum > 0
                ? commissionInclusiveTotal * ((row.commission ?? 0) / commissionSum)
                : rows.length
                  ? commissionInclusiveTotal / rows.length
                  : 0;
            return { charges, promo, net, gst, gross, commIncl, beforeTax: gross - commIncl };
          });
          const totals = rowAmounts.reduce(
            (acc, row) => ({
              charges: acc.charges + row.charges,
              promo: acc.promo + row.promo,
              net: acc.net + row.net,
              gst: acc.gst + row.gst,
              gross: acc.gross + row.gross,
              commIncl: acc.commIncl + row.commIncl,
              beforeTax: acc.beforeTax + row.beforeTax,
            }),
            {
              charges: 0,
              promo: 0,
              net: 0,
              gst: 0,
              gross: 0,
              commIncl: 0,
              beforeTax: 0,
            },
          );

          return (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <TableHead label="Date" align="left" />
                        <TableHead label="Charges (A)" hint="Before GST" />
                        <TableHead label="Promotion (B)" />
                        <TableHead label="Net (C)" hint="A − B" />
                        <TableHead label="Hotel GST (D)" />
                        <TableHead label="Property total (E)" hint="C + D, incl. GST" />
                        <TableHead label="Commission (F)" hint="Inclusive of GST" />
                        <TableHead label="Before TDS/TCS (G)" hint="E − F" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length ? (
                        rows.map((row, idx) => {
                          const amounts = rowAmounts[idx];
                          return (
                            <tr
                              key={row.id}
                              className={
                                idx % 2 === 0
                                  ? "border-b border-slate-100 bg-white"
                                  : "border-b border-slate-100 bg-slate-50/60"
                              }
                            >
                              <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                                {formatLongDate(row.stayDate)}
                              </td>
                              {moneyCell(amounts.charges)}
                              {moneyCell(amounts.promo)}
                              {moneyCell(amounts.net)}
                              {moneyCell(amounts.gst)}
                              {moneyCell(amounts.gross)}
                              {moneyCell(amounts.commIncl)}
                              {moneyCell(amounts.beforeTax)}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No room-day financials available.
                          </td>
                        </tr>
                      )}
                      {rows.length ? (
                        <tr className="border-t border-slate-200 bg-blue-50/70 font-semibold text-slate-900">
                          <td className="px-3 py-2">Grand total</td>
                          {moneyCell(totals.charges)}
                          {moneyCell(totals.promo)}
                          {moneyCell(totals.net)}
                          {moneyCell(totals.gst)}
                          {moneyCell(totals.gross)}
                          {moneyCell(totals.commIncl)}
                          {moneyCell(totals.beforeTax)}
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
          );
        })()}

        <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Final calculation
            </h3>
          </div>
          <CalcSectionHeader title="Property charges" />
          <CalcLine
            index="1"
            label="Room charges (rack rate, before promotion)"
            amount={
              rateBreakup?.roomChargesBeforePromotion ??
              rateBreakup?.roomCharges ??
              detail.pricing.basePrice
            }
            currency={currency}
          />
          {appliedPromotions.length
            ? appliedPromotions.map((promo, idx) => (
                <CalcLine
                  key={`${promo.promotionName}-${idx}`}
                  label={`${promoDisplayLabel(promo)}${
                    promo.offerType
                      ? ` · ${formatStatusLabel(promo.offerType)}`
                      : ""
                  }`}
                  amount={promo.discountAmount}
                  currency={currency}
                  negative
                />
              ))
            : promotionDiscount > 0 ? (
                <CalcLine
                  label="Promotion discount"
                  amount={promotionDiscount}
                  currency={currency}
                  negative
                />
              ) : null}
          {promotionDiscount > 0 || appliedPromotions.length ? (
            <CalcLine
              label="Net accommodation (after promotion)"
              amount={
                rateBreakup?.netAccommodationAfterPromotion ??
                rateBreakup?.roomCharges ??
                detail.financials.priceAfterPromo
              }
              currency={currency}
            />
          ) : null}
          {!(isPackageBooking && !(packageTaxAmount > 0)) ? (
            <CalcLine
              index="2"
              label={withRate("Property taxes", gstPercent)}
              amount={rateBreakup?.propertyTaxes ?? detail.pricing.gstAmount}
              currency={currency}
            />
          ) : null}
          <CalcSubtotal
            letter="A"
            label={
              isPackageBooking && !(packageTaxAmount > 0)
                ? "Total property charges"
                : "Total property charges (room charges + GST)"
            }
            amount={
              rateBreakup?.hotelGrossCharges ??
              detail.financials.customerSellingPrice
            }
            currency={currency}
          />

          {showCommissionBreakup ? (
            <>
          <CalcSectionHeader title="Commission" />
          <CalcLine
            index="3"
            label={withRate("Commission", commissionPercent)}
            amount={
              rateBreakup?.commissionAmount ?? detail.pricing.commissionAmount
            }
            currency={currency}
          />
          <CalcLine
            index="4"
            label={withRate("GST on commission", commissionGstPercent)}
            amount={rateBreakup?.commissionGst ?? detail.financials.commissionGst}
            currency={currency}
          />
          <CalcSubtotal
            letter="B"
            label="Commission inclusive of GST (3 + 4)"
            amount={
              detail.financials.commissionInclusiveGst ??
              rateBreakup?.commissionTotal
            }
            currency={currency}
          />
            </>
          ) : null}

          {showTaxDeductionBreakup ? (
            <>
          <CalcSectionHeader title="Tax deduction" />
          <CalcLine
            index="5"
            label={withRate("TCS", tcsPercent)}
            amount={rateBreakup?.tcsAmount ?? detail.financials.tcsAmount}
            currency={currency}
          />
          <CalcLine
            index="6"
            label={withRate("TDS", tdsPercent)}
            amount={rateBreakup?.tdsAmount ?? detail.financials.tdsAmount}
            currency={currency}
          />
          <CalcSubtotal
            letter="C"
            label="Tax deduction (5 + 6)"
            amount={
              rateBreakup?.taxDeductions ??
              (detail.financials.tcsAmount ?? 0) +
                (detail.financials.tdsAmount ?? 0)
            }
            currency={currency}
          />
            </>
          ) : null}

          {isCancelledBooking ? (
            <div className="border-t border-rose-100 bg-rose-50/80 px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-4 font-semibold text-slate-500">
                <span>
                  {isPackageBooking && !showCommissionBreakup && !showTaxDeductionBreakup
                    ? "Payable to property"
                    : "Payable to property (A − B − C)"}
                </span>
                <span className="text-sm tabular-nums line-through decoration-slate-400">
                  {formatCurrency(
                    rateBreakup?.payableToHotel ?? detail.pricing.hotelPayout,
                    currency,
                  )}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-4 font-semibold text-rose-900">
                <span>Payable after cancellation</span>
                <span className="text-sm tabular-nums">
                  {formatCurrency(payableToProperty, currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 border-t border-sky-100 bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-900">
              <span>
                {isPackageBooking && !showCommissionBreakup && !showTaxDeductionBreakup
                  ? "Payable to property"
                  : "Payable to property (A − B − C)"}
              </span>
              <span className="text-sm tabular-nums">
                {formatCurrency(
                  rateBreakup?.payableToHotel ?? detail.pricing.hotelPayout,
                  currency,
                )}
              </span>
            </div>
          )}

          {showAgencyBlock ? (
            <>
              <CalcSectionHeader title="Agency" />
              {agencyCommissionAmount > 0 ? (
                <CalcLine
                  index="7"
                  label={
                    agencyIncentivePercent != null
                      ? `Agency commission @ ${formatPercent(agencyIncentivePercent)}${
                          agencyIncentiveSource
                            ? ` (${formatStatusLabel(agencyIncentiveSource)})`
                            : ""
                        }`
                      : "Agency commission"
                  }
                  amount={agencyCommissionAmount}
                  currency={currency}
                />
              ) : (
                <div className="flex items-start justify-between gap-4 px-3 py-1.5 text-xs">
                  <span className="min-w-0 text-gray-600">
                    Agency incentive
                    {agencyIncentivePercent != null
                      ? ` @ ${formatPercent(agencyIncentivePercent)}`
                      : ""}
                    {agencyIncentiveSource
                      ? ` (${formatStatusLabel(agencyIncentiveSource)})`
                      : ""}
                    {agencyIncentiveCategory
                      ? ` · ${formatStatusLabel(agencyIncentiveCategory)}`
                      : ""}
                  </span>
                  <span className="shrink-0 font-medium text-gray-500">
                    {agencyIncentiveType
                      ? formatStatusLabel(agencyIncentiveType)
                      : "—"}
                  </span>
                </div>
              )}
              {agentTdsAmount != null && agentTdsAmount > 0 ? (
                <CalcLine
                  index="8"
                  label={
                    agentTdsPercent != null
                      ? `Agent TDS @ ${formatPercent(agentTdsPercent)}`
                      : "Agent TDS"
                  }
                  amount={agentTdsAmount}
                  currency={currency}
                />
              ) : null}
              {agentNetCommission != null ? (
                <CalcSubtotal
                  letter="D"
                  label="Agent net commission (7 − 8)"
                  amount={agentNetCommission}
                  currency={currency}
                />
              ) : null}
              {agentPayable != null && isCancelledBooking ? (
                <div className="border-t border-rose-100 bg-rose-50/80 px-3 py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-4 font-semibold text-slate-500">
                    <span>Agent payable</span>
                    <span className="text-sm tabular-nums line-through decoration-slate-400">
                      {formatCurrency(agentPayable, currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-4 font-semibold text-rose-900">
                    <span>Agent refund</span>
                    <span className="text-sm tabular-nums">
                      {formatCurrency(refundedAmount, currency)}
                    </span>
                  </div>
                </div>
              ) : agentPayable != null ? (
                <div className="flex items-center justify-between gap-4 border-t border-violet-100 bg-violet-50/80 px-3 py-2.5 text-xs font-semibold text-violet-900">
                  <span>Agent payable</span>
                  <span className="text-sm tabular-nums">
                    {formatCurrency(agentPayable, currency)}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        </>
        ) : null}

        {tab === "financial" ? (
        <>
        <SectionCard
          compact
          icon={Scale}
          iconBg="bg-indigo-50"
          iconColor="bg-indigo-100 text-indigo-700"
          title="Applied pricing rules"
          className="mb-3"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <RuleCard
              title="Service fee"
              ruleName={formatRuleName(detail.financials.serviceFeeRuleName)}
              percent={detail.financials.effectiveServiceFeePercent}
              amount={serviceFeeInclGst}
              currency={currency}
            />
            <RuleCard
              title="Commission"
              ruleName={formatRuleName(detail.financials.commissionRuleName)}
              percent={commissionPercent}
              amount={detail.financials.commissionAmount}
              currency={currency}
            />
            <RuleCard
              title="Tax (GST)"
              ruleName={formatRuleName(detail.financials.taxRuleName)}
              percent={gstPercent}
              amount={detail.financials.gstAmount}
              currency={currency}
            />
            {appliedPromotions.length ? (
              appliedPromotions.map((promo, idx) => (
                <RuleCard
                  key={`${promo.promotionRuleId ?? promo.promotionName}-${idx}`}
                  title={
                    promo.promotionType
                      ? `Promotion · ${formatStatusLabel(promo.promotionType)}`
                      : "Promotion"
                  }
                  ruleName={
                    promo.stackable === false
                      ? `${promo.promotionName} · Non-stackable`
                      : promo.promotionName
                  }
                  percent={promo.discountPercentage}
                  amount={promo.discountAmount}
                  currency={currency}
                />
              ))
            ) : (
              <RuleCard
                title="Promotion"
                ruleName={formatRuleName(detail.financials.promotionRuleName)}
                amount={promotionDiscount > 0 ? promotionDiscount : null}
                currency={currency}
              />
            )}
            {showAgencyBlock ? (
              <RuleCard
                title={
                  isPackageBooking
                    ? "Package incentive"
                    : agencyTier
                      ? `Agency · ${agencyTier}`
                      : "Agency"
                }
                ruleName={
                  agencyIncentiveSource
                    ? formatStatusLabel(agencyIncentiveSource)
                    : "Incentive"
                }
                percent={agencyIncentivePercent}
                amount={
                  agencyCommissionAmount > 0 ? agencyCommissionAmount : null
                }
                currency={currency}
              />
            ) : null}
          </div>
        </SectionCard>
        <div className="mb-3 space-y-3">
          <SectionCard
            compact
            icon={TrendingUp}
            iconBg="bg-amber-50"
            iconColor="bg-amber-100 text-amber-600"
            title="Financial overview"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-100">
              <dl className="min-w-0 md:pr-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Accommodation
                </p>
                <DetailRow
                  compact
                  label="Base price"
                  value={formatCurrency(detail.financials.basePrice, currency)}
                />
                {extraAdultCount != null ? (
                  <DetailRow
                    compact
                    label="Extra adult count"
                    value={String(extraAdultCount)}
                  />
                ) : null}
                {extraAdultCharges != null ? (
                  <DetailRow
                    compact
                    label="Extra adult charges"
                    value={formatCurrency(extraAdultCharges, currency)}
                  />
                ) : null}
                {appliedPromotions.length
                  ? appliedPromotions.map((promo, idx) => (
                      <DetailRow
                        key={`${promo.promotionName}-${idx}`}
                        compact
                        label={promoDisplayLabel(promo)}
                        value={
                          <span className="text-emerald-700">
                            −{formatCurrency(promo.discountAmount, currency)}
                          </span>
                        }
                      />
                    ))
                  : promotionDiscount > 0 ? (
                      <DetailRow
                        compact
                        label="Promotion discount"
                        value={
                          <span className="text-emerald-700">
                            −{formatCurrency(promotionDiscount, currency)}
                          </span>
                        }
                      />
                    ) : null}
                <DetailRow
                  compact
                  label="Price after promo"
                  value={formatCurrency(
                    detail.financials.priceAfterPromo,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label={gstLabel}
                  value={formatCurrency(
                    detail.financials.gst?.amount ?? detail.financials.gstAmount,
                    currency,
                  )}
                />
                {(detail.financials.cgstAmount != null ||
                  detail.financials.sgstAmount != null) && (
                  <DetailRow
                    compact
                    label="CGST / SGST"
                    value={`${formatCurrency(detail.financials.cgstAmount, currency)} / ${formatCurrency(detail.financials.sgstAmount, currency)}`}
                  />
                )}
              </dl>
              <dl className="min-w-0 md:px-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Service & commission
                </p>
                <DetailRow
                  compact
                  label="Service fee"
                  value={formatCurrency(
                    detail.financials.serviceFeeAmount,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label="GST on service fee"
                  value={formatCurrency(detail.financials.serviceFeeGst, currency)}
                />
                <DetailRow
                  compact
                  label="Service fee (incl. GST)"
                  value={formatCurrency(serviceFeeInclGst, currency)}
                />
                <DetailRow
                  compact
                  label={commissionLabel}
                  value={formatCurrency(
                    detail.financials.commission?.amount ??
                      detail.financials.commissionAmount,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label={commissionGstLabel}
                  value={formatCurrency(
                    detail.financials.commissionGstRated?.amount ??
                      detail.financials.commissionGst,
                    currency,
                  )}
                />
                {detail.financials.commissionInclusiveGst != null ? (
                  <DetailRow
                    compact
                    label="Commission (incl. GST)"
                    value={formatCurrency(
                      detail.financials.commissionInclusiveGst,
                      currency,
                    )}
                  />
                ) : null}
                {showAgencyBlock ? (
                  <>
                    {agencyTier ? (
                      <DetailRow compact label="Agency tier" value={agencyTier} />
                    ) : null}
                    {agencyIncentivePercent != null ? (
                      <DetailRow
                        compact
                        label="Agency incentive"
                        value={`${formatPercent(agencyIncentivePercent)}${
                          agencyIncentiveType
                            ? ` · ${formatStatusLabel(agencyIncentiveType)}`
                            : ""
                        }`}
                      />
                    ) : null}
                    {agencyIncentiveSource ? (
                      <DetailRow
                        compact
                        label="Incentive source"
                        value={formatStatusLabel(agencyIncentiveSource)}
                      />
                    ) : null}
                    {agencyIncentiveCategory ? (
                      <DetailRow
                        compact
                        label="Incentive category"
                        value={formatStatusLabel(agencyIncentiveCategory)}
                      />
                    ) : null}
                    {agencyCommissionAmount > 0 ? (
                      <DetailRow
                        compact
                        label="Agency commission"
                        value={formatCurrency(agencyCommissionAmount, currency)}
                      />
                    ) : null}
                    {agentTdsAmount != null && agentTdsAmount > 0 ? (
                      <DetailRow
                        compact
                        label={
                          agentTdsPercent != null
                            ? `Agent TDS @ ${formatPercent(agentTdsPercent)}`
                            : "Agent TDS"
                        }
                        value={formatCurrency(agentTdsAmount, currency)}
                      />
                    ) : null}
                    {agentNetCommission != null ? (
                      <DetailRow
                        compact
                        label="Agent net commission"
                        value={formatCurrency(agentNetCommission, currency)}
                      />
                    ) : null}
                  </>
                ) : null}
              </dl>
              <dl className="min-w-0 md:pl-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Tax, payout & OTA
                </p>
                <DetailRow
                  compact
                  label={tcsLabel}
                  value={formatCurrency(
                    detail.financials.tcs?.amount ?? detail.financials.tcsAmount,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label={tdsLabel}
                  value={formatCurrency(
                    detail.financials.tds?.amount ?? detail.financials.tdsAmount,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label="Customer selling price"
                  value={formatCurrency(
                    detail.financials.customerSellingPrice,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label="Final payable"
                  value={formatCurrency(detail.financials.finalPayable, currency)}
                />
                {isAgentBooking && agentPayable != null ? (
                  <DetailRow
                    compact
                    label="Agent payable"
                    value={formatCurrency(agentPayable, currency)}
                  />
                ) : null}
                <DetailRow
                  compact
                  label="Hotel payout"
                  value={formatCurrency(detail.financials.hotelPayout, currency)}
                />
                <DetailRow
                  compact
                  label="OTA gross revenue"
                  value={formatCurrency(
                    detail.financials.otaGrossRevenue,
                    currency,
                  )}
                />
                <DetailRow
                  compact
                  label="OTA net revenue"
                  value={formatCurrency(
                    detail.financials.otaNetRevenue,
                    currency,
                  )}
                />
              </dl>
            </div>
          </SectionCard>

          <SectionCard
            compact
            icon={Tag}
            iconBg="bg-gray-50"
            iconColor="bg-gray-200 text-gray-700"
            title="Additional info"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryField
                label="Customer type"
                value={detail.financials.selectedCustomerType || "—"}
              />
              <SummaryField
                label="Pricing source"
                value={detail.financials.selectedPricingSource || "—"}
              />
              <SummaryField
                label="Channel"
                value={detail.financials.channelType || "—"}
              />
              <SummaryField
                label="Booking mode"
                value={detail.financials.bookingMode || "—"}
              />
              <SummaryField label="Currency" value={currency} />
              {detail.financials.financialContext ? (
                <SummaryField
                  label="Financial context"
                  value={detail.financials.financialContext.replace(/_/g, " ")}
                />
              ) : null}
              {agencyTier ? (
                <SummaryField label="Agency tier" value={agencyTier} />
              ) : null}
              {agencyIncentiveCategory ? (
                <SummaryField
                  label="Incentive category"
                  value={formatStatusLabel(agencyIncentiveCategory)}
                />
              ) : null}
              {agencyIncentiveSource ? (
                <SummaryField
                  label="Incentive source"
                  value={formatStatusLabel(agencyIncentiveSource)}
                />
              ) : null}
            </div>
          </SectionCard>

          {detail.roomDayFinancials.length > 0 && (
            <SectionCard
              compact
              icon={Layers}
              iconBg="bg-slate-50"
              iconColor="bg-slate-200 text-slate-700"
              title="Room day financials"
            >
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-160 border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-[10px] font-semibold uppercase text-gray-500">
                      <th className="py-1.5 pr-2">Room</th>
                      <th className="py-1.5 pr-2">Date</th>
                      <th className="py-1.5 pr-2 text-right">Room</th>
                      <th className="py-1.5 pr-2 text-right">Extra</th>
                      {showRoomDayPromo ? (
                        <th className="py-1.5 pr-2 text-right">Promo</th>
                      ) : null}
                      <th className="py-1.5 pr-2 text-right">Net</th>
                      <th className="py-1.5 pr-2 text-right">GST</th>
                      <th className="py-1.5 pr-2 text-right">Gross</th>
                      <th className="py-1.5 pr-2 text-right">Comm.</th>
                      <th className="py-1.5 text-right">Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.roomDayFinancials.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80"
                      >
                        <td className="py-1.5 pr-2 font-medium">
                          #{row.roomInstanceIndex}
                        </td>
                        <td className="py-1.5 pr-2">
                          {formatDate(row.stayDate)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.roomCharges, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.extraCharges, currency)}
                        </td>
                        {showRoomDayPromo ? (
                          <td className="py-1.5 pr-2 text-right tabular-nums text-emerald-700">
                            −{formatCurrency(row.promotionDiscount, currency)}
                          </td>
                        ) : null}
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.netAccommodation, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.hotelGst, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.propertyGross, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCurrency(row.commission, currency)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums font-medium">
                          {formatCurrency(row.propertyNetPayable, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

        </div>
        </>
        ) : null}

        {tab === "cancellation" ? (
        <>
        <div className="mb-3 grid gap-3 lg:grid-cols-2">
          <SectionCard
            compact
            icon={Shield}
            iconBg="bg-amber-50"
            iconColor="bg-amber-100 text-amber-600"
            title="Cancellation policy"
          >
            {isNonRefundable ? (
              <span className="mb-2 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                Non-refundable
              </span>
            ) : null}
            {cancellationPolicyLines.length ? (
              <ul className="space-y-1.5">
                {cancellationPolicyLines.map((line, idx) => (
                  <li key={idx} className="flex gap-1.5 text-[11px] leading-snug text-gray-700">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">—</p>
            )}
          </SectionCard>
          <SectionCard
            compact
            icon={Shield}
            iconBg="bg-rose-50"
            iconColor="bg-rose-100 text-rose-600"
            title={isCancelledBooking ? "Cancellation details" : "If cancelled now"}
          >
            <dl>
              {isCancelledBooking && cancellation.cancelledBy ? (
                <DetailRow
                  compact
                  label="Cancelled by"
                  value={formatStatusLabel(cancellation.cancelledBy)}
                />
              ) : null}
              {isCancelledBooking && cancellation.cancellationReason ? (
                <DetailRow
                  compact
                  label="Reason"
                  value={cancellation.cancellationReason}
                />
              ) : null}
              {!isCancelledBooking && cancellation.isCancellationAllowed != null ? (
                <DetailRow
                  compact
                  label="Cancellation allowed"
                  value={cancellation.isCancellationAllowed ? "Yes" : "No"}
                />
              ) : null}
              {cancellation.currentPolicyStage ? (
                <DetailRow
                  compact
                  label="Current stage"
                  value={formatStatusLabel(cancellation.currentPolicyStage)}
                />
              ) : null}
              {isCancelledBooking && cancellation.cancellationDatetime ? (
                <DetailRow
                  compact
                  label="Cancelled on"
                  value={formatDateTime(cancellation.cancellationDatetime)}
                />
              ) : null}
              <DetailRow
                compact
                label={isCancelledBooking ? "Original reservation" : "Original value"}
                value={formatCurrency(originalReservationValue, currency)}
              />
              {isCancelledBooking && isAgentBooking && agentPayable != null ? (
                <DetailRow
                  compact
                  label="Original agent payable"
                  value={formatCurrency(agentPayable, currency)}
                />
              ) : null}
              {isCancelledBooking ||
              cancellation.isCancellationAllowed !== false ? (
                <>
                  <DetailRow
                    compact
                    label={withRate("Cancellation charge", cancellationChargePercent)}
                    value={formatCurrency(cancelNowCharge, currency)}
                  />
                  <DetailRow
                    compact
                    label={
                      isCancelledBooking
                        ? cancellation.cancelledBy?.toUpperCase() === "AGENT"
                          ? "Agent refund"
                          : "Customer refund"
                        : "Refund if cancelled now"
                    }
                    value={formatCurrency(
                      isCancelledBooking ? refundedAmount : refundIfCancelledNow,
                      currency,
                    )}
                  />
                </>
              ) : null}
              {isCancelledBooking && cancellation.refundStatus ? (
                <DetailRow
                  compact
                  label="Refund status"
                  value={
                    <StatusBadge
                      status={cancellation.refundStatus}
                      tone={refundStatusTone(cancellation.refundStatus)}
                    />
                  }
                />
              ) : null}
              {isCancelledBooking && cancellation.refundDateTime ? (
                <DetailRow
                  compact
                  label="Refunded on"
                  value={formatDateTime(cancellation.refundDateTime)}
                />
              ) : null}
            </dl>
          </SectionCard>
        </div>
        {isCancelledBooking && cancellation.settlement ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-rose-50/80 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Cancellation settlement
              </h3>
              {cancellation.settlement.settlementContext ? (
                <StatusBadge
                  status={cancellation.settlement.settlementContext}
                  tone="bg-rose-50 text-rose-700 ring-rose-200"
                />
              ) : null}
            </div>
            <CalcSectionHeader title="Property charges" />
            <CalcLine
              index="1"
              label={withRate(
                "Cancellation accommodation charge",
                cancellationChargePercent,
              )}
              amount={moneyAmount(
                cancellation.settlement.cancellationAccommodationCharge,
              )}
              currency={currency}
            />
            {!(
              isPackageBooking &&
              !(moneyAmount(cancellation.settlement.hotelGst) ?? 0)
            ) ? (
              <CalcLine
                index="2"
                label={withRate("Hotel GST", gstPercent)}
                amount={moneyAmount(cancellation.settlement.hotelGst)}
                currency={currency}
              />
            ) : null}
            <CalcSubtotal
              letter="A"
              label={withRate(
                "Total cancellation property charges",
                ratePercent(
                  moneyAmount(
                    cancellation.settlement.totalCancellationPropertyCharges,
                  ),
                  originalReservationValue,
                ),
              )}
              amount={moneyAmount(
                cancellation.settlement.totalCancellationPropertyCharges,
              )}
              currency={currency}
            />
            {!(
              isPackageBooking &&
              !(moneyAmount(cancellation.settlement.commissionInclusiveGst) ?? 0)
            ) ? (
              <>
            <CalcSectionHeader title="Commission" />
            <CalcLine
              index="3"
              label={withRate("OTA commission", commissionPercent)}
              amount={moneyAmount(cancellation.settlement.otaCommission)}
              currency={currency}
            />
            <CalcLine
              index="4"
              label={
                commissionGstPercent != null
                  ? withRate("GST on commission", commissionGstPercent)
                  : commissionGstLabel
              }
              amount={moneyAmount(cancellation.settlement.commissionGst)}
              currency={currency}
            />
            <CalcSubtotal
              letter="B"
              label="Commission inclusive of GST (3 + 4)"
              amount={moneyAmount(cancellation.settlement.commissionInclusiveGst)}
              currency={currency}
            />
              </>
            ) : null}
            {!(
              isPackageBooking &&
              !(moneyAmount(cancellation.settlement.taxDeduction) ?? 0)
            ) ? (
              <>
            <CalcSectionHeader title="Tax deductions" />
            <CalcLine
              index="5"
              label={withRate("TCS", tcsPercent)}
              amount={moneyAmount(cancellation.settlement.tcs)}
              currency={currency}
            />
            <CalcLine
              index="6"
              label={withRate("TDS", tdsPercent)}
              amount={moneyAmount(cancellation.settlement.tds)}
              currency={currency}
            />
            <CalcSubtotal
              letter="C"
              label="Tax deduction (5 + 6)"
              amount={moneyAmount(cancellation.settlement.taxDeduction)}
              currency={currency}
            />
              </>
            ) : null}
            <CalcSubtotal
              letter="D"
              label={withRate(
                isPackageBooking
                  ? "Payable to property"
                  : "Payable to property (A − B − C)",
                payablePercent,
              )}
              amount={moneyAmount(
                cancellation.settlement.amountPayableToProperty,
              )}
              currency={currency}
            />
            <CalcSubtotal
              letter="E"
              label={withRate(
                "Customer refund",
                refundPercent && refundPercent > 0 ? refundPercent : undefined,
              )}
              amount={moneyAmount(cancellation.settlement.customerRefund)}
              currency={currency}
            />
          </div>
        ) : null}
        </>
        ) : null}

        {tab === "payment" ? (
        <SectionCard
          compact
          icon={CreditCard}
          iconBg="bg-emerald-50"
          iconColor="bg-emerald-100 text-emerald-600"
          title="Payment summary"
          className="mb-3"
        >
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <DetailRow
              compact
              label="Payment status"
              value={
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPaymentStatusStyle(
                    detail.payment.paymentStatus,
                  )}`}
                >
                  {detail.payment.paymentStatus}
                </span>
              }
            />
            <DetailRow
              compact
              label={isAgentBooking ? "Agent paid" : isCancelledBooking ? "Original value" : "Guest paid"}
              value={formatCurrency(guestPaidAmount, currency)}
            />
            {isCancelledBooking &&
            isAgentBooking &&
            originalReservationValue !== guestPaidAmount ? (
              <DetailRow
                compact
                label="Original reservation"
                value={formatCurrency(originalReservationValue, currency)}
              />
            ) : null}
            <DetailRow
              compact
              label="Final payable"
              value={formatCurrency(detail.pricing.finalPayable, currency)}
            />
            <DetailRow
              compact
              label="Outstanding"
              value={formatCurrency(outstandingAmount, currency)}
            />
            {refundedAmount > 0 ? (
              <DetailRow
                compact
                label="Refunded"
                value={formatCurrency(refundedAmount, currency)}
              />
            ) : null}
            <DetailRow compact label="Method" value={detail.payment.paymentType || "—"} />
            <DetailRow
              compact
              label="Transaction ID"
              value={
                detail.payment.transactionId ? (
                  <span className="font-mono text-[10px]">
                    {detail.payment.transactionId}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              compact
              label="Paid at"
              value={formatDateTime(detail.payment.paidAt ?? undefined)}
            />
          </dl>
        </SectionCard>
        ) : null}

        </div>
      </div>

      <VoucherViewModal
        open={showVoucher}
        onClose={() => setShowVoucher(false)}
        bookingId={listItemId}
        bookingReference={summary.bookingRef}
      />
    </>
  );
}
