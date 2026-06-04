import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  bookingService,
  type AdminBookingFullDetail,
  type RateBreakup,
} from "../services/bookingService";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { VoucherViewModal } from "../components/VoucherViewModal";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Shield,
  Tag,
  TrendingUp,
  User,
  BedDouble,
  Utensils,
  Layers,
  Clock,
  Scale,
} from "lucide-react";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  return `${Number(value.toFixed(4))}%`;
}

function getBookingStatusStyle(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  const s = status.toUpperCase();
  if (s === "CONFIRMED" || s === "COMPLETED")
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s === "RESERVED" || s === "PENDING")
    return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "CANCELLED" || s === "CANCELED")
    return "bg-red-50 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getPaymentStatusStyle(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  const s = status.toUpperCase();
  if (s.includes("PAID"))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s.includes("PENDING"))
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getServiceFeeFromBreakup(rateBreakup: RateBreakup | undefined): number {
  if (!rateBreakup) return 0;
  return (
    rateBreakup.serviceFeeIncludingGst ??
    rateBreakup.serviceChargeAmount ??
    0
  );
}

function getPropertyGrossExcludingServiceFee(rateBreakup: RateBreakup | undefined) {
  if (rateBreakup?.hotelGrossCharges == null) return undefined;
  const serviceFee = getServiceFeeFromBreakup(rateBreakup);
  return Math.max(0, rateBreakup.hotelGrossCharges - serviceFee);
}

function SectionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
  className = "",
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden ${className}`}
    >
      <div className={`px-5 py-4 border-b border-gray-100 ${iconBg}`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-50 last:border-0">
      <dt className="text-sm font-medium text-gray-500 min-w-[160px] shrink-0">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 wrap-break-word">
        {value ?? "—"}
      </dd>
    </div>
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
      className={`flex items-center justify-between gap-4 px-4 py-2 text-sm ${
        highlight ? "bg-slate-50 font-semibold" : "bg-white"
      }`}
    >
      <div className="text-gray-700">{label}</div>
      <div className="text-gray-900 font-medium tabular-nums text-right min-w-[120px]">
        {value ?? "—"}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
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
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-linear-to-br from-white to-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{ruleName || "—"}</p>
      {percent != null && !Number.isNaN(percent) ? (
        <p className="mt-1 text-xs text-indigo-700 font-medium">
          {formatPercent(percent)} effective
        </p>
      ) : null}
      {amount != null && amount > 0 ? (
        <p className="mt-0.5 text-sm tabular-nums text-gray-800">
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

  useEffect(() => {
    if (!listItemId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    bookingService
      .getAdminBookingFullDetail(listItemId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
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
  const rateBreakup = detail.pricing.rateBreakup;
  const currency = detail.pricing.currency || rateBreakup?.currency || "INR";
  const propertyGrossExService = getPropertyGrossExcludingServiceFee(rateBreakup);
  const promos = rateBreakup?.appliedPromotions ?? [];
  const showPromotionBreakup =
    (rateBreakup?.promotionDiscount ?? 0) > 0 || promos.length > 0;
  const showBeforePromotion =
    rateBreakup?.roomChargesBeforePromotion != null ||
    rateBreakup?.extraAdultChildChargesBeforePromotion != null;
  const serviceChargePercent =
    rateBreakup?.serviceChargePercent ?? detail.financials.effectiveServiceFeePercent ?? 0;
  const serviceFeeExclGst =
    detail.pricing.serviceFeeAmount ?? detail.financials.serviceFeeAmount ?? 0;
  const serviceFeeInclGst = getServiceFeeFromBreakup(rateBreakup);
  const extraAdultCharges =
    detail.financials.extraAdultCharges ?? detail.financials.extraChildCharges;
  const promotionDiscount =
    detail.pricing.promotionDiscount ?? detail.financials.promotionDiscount ?? 0;
  const showRoomDayPromo = detail.roomDayFinancials.some(
    (r) => (r.promotionDiscount ?? 0) > 0,
  );
  const hasAgencyLine =
    (rateBreakup?.agentCommission != null && rateBreakup.agentCommission > 0) ||
    Boolean(rateBreakup?.agencyTier);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          type="button"
          onClick={backToBookings}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#2f3d95] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-[#2f3d95]/15 bg-linear-to-br from-slate-50 via-white to-indigo-50/40 p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#2f3d95] flex items-center justify-center shadow-md">
                <Hash className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2f3d95]">
                  Admin booking view
                </p>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {summary.bookingRef}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  ID {summary.bookingId} · {summary.hotelName} ·{" "}
                  {summary.bookedVia}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Booked {formatDateTime(summary.bookedOn)}
                  {summary.hotelCity ? ` · ${summary.hotelCity}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold border ${getBookingStatusStyle(
                  summary.bookingStatus,
                )}`}
              >
                {summary.bookingStatus}
              </span>
              <span
                className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold border max-w-[220px] text-center ${getPaymentStatusStyle(
                  detail.payment.paymentStatus,
                )}`}
              >
                {detail.payment.paymentStatus}
              </span>
              <button
                type="button"
                onClick={() => setShowVoucher(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2f3d95] text-[#2f3d95] text-sm font-medium hover:bg-[#2f3d95]/10"
              >
                <FileText className="w-4 h-4" />
                Voucher
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard
            label="Guest paid"
            value={formatCurrency(summary.totalAmount, currency)}
            accent="border-emerald-200 bg-emerald-50/50"
          />
          <KpiCard
            label="Hotel payout"
            value={formatCurrency(detail.pricing.hotelPayout, currency)}
            accent="border-sky-200 bg-sky-50/50"
          />
          <KpiCard
            label="OTA net revenue"
            value={formatCurrency(detail.pricing.otaNetRevenue, currency)}
            sub={`Gross ${formatCurrency(detail.pricing.otaGrossRevenue, currency)}`}
            accent="border-violet-200 bg-violet-50/50"
          />
          <KpiCard
            label="Commission"
            value={formatCurrency(detail.pricing.commissionAmount, currency)}
            accent="border-blue-200 bg-blue-50/50"
          />
          <KpiCard
            label="Service fee"
            value={formatCurrency(serviceFeeExclGst, currency)}
            sub={
              serviceFeeInclGst > 0
                ? `Incl. GST ${formatCurrency(serviceFeeInclGst, currency)}`
                : undefined
            }
            accent="border-orange-200 bg-orange-50/50"
          />
        </div>

        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/40 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
            Service charges
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="rounded-xl border border-orange-100 bg-white/70 px-3 py-2.5">
              <p className="text-xs text-gray-500">Service fee (excl. GST)</p>
              <p className="font-semibold tabular-nums text-gray-900">
                {formatCurrency(serviceFeeExclGst, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white/70 px-3 py-2.5">
              <p className="text-xs text-gray-500">GST on service fee</p>
              <p className="font-semibold tabular-nums text-gray-900">
                {formatCurrency(detail.financials.serviceFeeGst, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white/70 px-3 py-2.5">
              <p className="text-xs text-gray-500">Service fee (incl. GST)</p>
              <p className="font-semibold tabular-nums text-gray-900">
                {formatCurrency(serviceFeeInclGst, currency)}
                {serviceChargePercent > 0 &&
                  ` · ${formatPercent(serviceChargePercent)}`}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white/70 px-3 py-2.5">
              <p className="text-xs text-gray-500">Rule</p>
              <p className="font-medium text-gray-900">
                {detail.financials.serviceFeeRuleName || "—"}
              </p>
              {detail.financials.effectiveServiceFeePercent != null ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  Effective {formatPercent(detail.financials.effectiveServiceFeePercent)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <SectionCard
          icon={Scale}
          iconBg="bg-indigo-50"
          iconColor="bg-indigo-100 text-indigo-700"
          title="Applied pricing rules"
          className="mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RuleCard
              title="Service fee"
              ruleName={detail.financials.serviceFeeRuleName}
              percent={detail.financials.effectiveServiceFeePercent}
              amount={serviceFeeInclGst}
              currency={currency}
            />
            <RuleCard
              title="Commission"
              ruleName={detail.financials.commissionRuleName}
              percent={detail.financials.commissionPercent}
              amount={detail.financials.commissionAmount}
              currency={currency}
            />
            <RuleCard
              title="Tax (GST)"
              ruleName={detail.financials.taxRuleName}
              percent={detail.financials.gstPercent}
              amount={detail.financials.gstAmount}
              currency={currency}
            />
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Promotion:{" "}
            <span className="font-medium text-gray-700">
              {detail.financials.promotionRuleName || "None"}
            </span>
          </p>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            icon={Building2}
            iconBg="bg-sky-50"
            iconColor="bg-sky-100 text-sky-600"
            title="Property & stay"
          >
            <dl>
              <DetailRow label="Hotel" value={summary.hotelName} />
              <DetailRow
                label="Booking status"
                value={
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getBookingStatusStyle(
                      summary.bookingStatus,
                    )}`}
                  >
                    {summary.bookingStatus}
                  </span>
                }
              />
              <DetailRow
                label="Address"
                value={
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    {[summary.hotelAddress, summary.hotelLocality, summary.hotelCity]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                }
              />
              <DetailRow
                label="Check-in"
                value={formatDate(summary.checkInDate)}
              />
              <DetailRow
                label="Check-out"
                value={formatDate(summary.checkOutDate)}
              />
              <DetailRow label="Nights" value={summary.nightsDisplay} />
              <DetailRow label="Occupancy" value={summary.occupancyDisplay} />
            </dl>
          </SectionCard>

          <SectionCard
            icon={User}
            iconBg="bg-indigo-50"
            iconColor="bg-indigo-100 text-indigo-600"
            title="Guest"
          >
            <dl>
              <DetailRow label="Primary guest" value={detail.guest.name} />
              <DetailRow
                label="Email"
                value={
                  detail.guest.email ? (
                    <span className="inline-flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {detail.guest.email}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Phone"
                value={
                  detail.guest.phone ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {detail.guest.phone}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
            {detail.guest.guests?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  All guests
                </p>
                <ul className="space-y-2">
                  {detail.guest.guests.map((g, i) => (
                    <li
                      key={i}
                      className="text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span className="font-medium text-gray-900">{g.name}</span>
                      {(g.email || g.phone) && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {[g.email, g.phone].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={BedDouble}
            iconBg="bg-violet-50"
            iconColor="bg-violet-100 text-violet-600"
            title="Rooms"
          >
            <div className="space-y-3">
              {detail.rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="font-medium text-gray-900">{room.roomName}</div>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5 text-amber-500" />
                      {room.mealPlan}
                    </span>
                    <span>{room.occupancyDisplay}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            icon={CreditCard}
            iconBg="bg-emerald-50"
            iconColor="bg-emerald-100 text-emerald-600"
            title="Payment"
          >
            <dl>
              <DetailRow
                label="Status"
                value={
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPaymentStatusStyle(
                      detail.payment.paymentStatus,
                    )}`}
                  >
                    {detail.payment.paymentStatus}
                  </span>
                }
              />
              <DetailRow label="Method" value={detail.payment.paymentType} />
              <DetailRow
                label="Transaction ID"
                value={
                  detail.payment.transactionId ? (
                    <span className="font-mono text-xs">
                      {detail.payment.transactionId}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Paid at"
                value={formatDateTime(detail.payment.paidAt ?? undefined)}
              />
              <DetailRow
                label="Paid amount"
                value={
                  <span className="text-lg font-bold tabular-nums">
                    {formatCurrency(detail.payment.paidAmount, currency)}
                  </span>
                }
              />
            </dl>
          </SectionCard>

          <SectionCard
            icon={Tag}
            iconBg="bg-gray-50"
            iconColor="bg-gray-200 text-gray-700"
            title="Channel & pricing"
          >
            <dl>
              <DetailRow
                label="Customer type"
                value={detail.financials.selectedCustomerType}
              />
              <DetailRow
                label="Pricing source"
                value={detail.financials.selectedPricingSource}
              />
              <DetailRow label="Channel" value={detail.financials.channelType} />
              <DetailRow
                label="Booking mode"
                value={detail.financials.bookingMode}
              />
              <DetailRow
                label="Promotion rule"
                value={detail.financials.promotionRuleName}
              />
              <DetailRow
                label="Tax rule"
                value={detail.financials.taxRuleName}
              />
            </dl>
          </SectionCard>

          <SectionCard
            icon={Shield}
            iconBg="bg-rose-50"
            iconColor="bg-rose-100 text-rose-600"
            title="Cancellation policy"
          >
            <p className="text-sm text-gray-700 leading-relaxed">
              {detail.cancellation.cancellationPolicy || "—"}
            </p>
          </SectionCard>

          {/* Rate breakup */}
          <SectionCard
            icon={Receipt}
            iconBg="bg-amber-50"
            iconColor="bg-amber-100 text-amber-600"
            title="Rate breakup"
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 uppercase">
                Customer price (summary)
              </div>
              <RateRow
                label="Base price"
                value={formatCurrency(detail.pricing.basePrice, currency)}
              />
              {promotionDiscount > 0 ? (
                <RateRow
                  label="Promotion discount"
                  value={
                    <span className="text-emerald-700">
                      −{formatCurrency(promotionDiscount, currency)}
                    </span>
                  }
                />
              ) : null}
              <RateRow
                label="Price after promotion"
                value={formatCurrency(detail.pricing.priceAfterPromo, currency)}
              />
              <RateRow
                label="GST on accommodation"
                value={formatCurrency(detail.pricing.gstAmount, currency)}
              />
              <RateRow
                label="Service fee (excl. GST)"
                value={formatCurrency(serviceFeeExclGst, currency)}
              />
              <RateRow
                label="GST on service fee"
                value={formatCurrency(detail.financials.serviceFeeGst, currency)}
              />
              <RateRow
                label="Service fee (incl. GST)"
                value={formatCurrency(serviceFeeInclGst, currency)}
              />
              <RateRow
                label="Commission (excl. GST)"
                value={formatCurrency(detail.pricing.commissionAmount, currency)}
              />
              <RateRow
                label="Customer selling price"
                value={formatCurrency(
                  detail.financials.customerSellingPrice,
                  currency,
                )}
              />
              <RateRow
                label="Final payable (guest)"
                value={formatCurrency(detail.pricing.finalPayable, currency)}
                highlight
              />

              {showBeforePromotion && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                    Accommodation (list rates)
                  </div>
                  <RateRow
                    label="Room charges (list)"
                    value={formatCurrency(
                      rateBreakup?.roomChargesBeforePromotion ??
                        rateBreakup?.roomCharges,
                      currency,
                    )}
                  />
                  <RateRow
                    label="Extra adult / child (list)"
                    value={formatCurrency(
                      rateBreakup?.extraAdultChildChargesBeforePromotion ??
                        rateBreakup?.extraAdultChildCharges,
                      currency,
                    )}
                  />
                </>
              )}

              {showPromotionBreakup && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                    Promotions
                  </div>
                  {promos.length > 0 ? (
                    promos.map((p, idx) => (
                      <RateRow
                        key={idx}
                        label={p.displayLine || p.promotionName}
                        value={
                          <span className="text-emerald-700">
                            −{formatCurrency(p.discountAmount, currency)}
                          </span>
                        }
                      />
                    ))
                  ) : (
                    <RateRow
                      label="Total promotion discount"
                      value={
                        <span className="text-emerald-700">
                          −
                          {formatCurrency(
                            rateBreakup?.promotionDiscount,
                            currency,
                          )}
                        </span>
                      }
                    />
                  )}
                  <RateRow
                    label="Net accommodation (after promo)"
                    value={formatCurrency(
                      rateBreakup?.netAccommodationAfterPromotion,
                      currency,
                    )}
                    highlight
                  />
                </>
              )}
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                Property charges
              </div>
              <RateRow
                label="Room charges"
                value={formatCurrency(rateBreakup?.roomCharges, currency)}
              />
              <RateRow
                label="Extra adult / child"
                value={formatCurrency(
                  rateBreakup?.extraAdultChildCharges,
                  currency,
                )}
              />
              <RateRow
                label="Property taxes (GST on property)"
                value={formatCurrency(rateBreakup?.propertyTaxes, currency)}
              />
              <div className="bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-800 uppercase border-t border-orange-100">
                Service charges
              </div>
              <RateRow
                label={
                  serviceChargePercent > 0
                    ? `Service fee incl. GST @ ${formatPercent(serviceChargePercent)}`
                    : "Service fee (incl. GST)"
                }
                value={formatCurrency(
                  rateBreakup?.serviceFeeIncludingGst ?? serviceFeeInclGst,
                  currency,
                )}
                highlight
              />
              <RateRow
                label="Service fee (excl. GST)"
                value={formatCurrency(serviceFeeExclGst, currency)}
              />
              <RateRow
                label="GST on service fee"
                value={formatCurrency(detail.financials.serviceFeeGst, currency)}
              />
              <RateRow
                label="Service fee rule"
                value={detail.financials.serviceFeeRuleName || "—"}
              />
              <RateRow
                label="Property gross (excl. service fee)"
                value={formatCurrency(
                  propertyGrossExService ?? rateBreakup?.hotelGrossCharges,
                  currency,
                )}
              />
              <RateRow
                label="Property gross (incl. service fee)"
                value={formatCurrency(rateBreakup?.hotelGrossCharges, currency)}
                highlight
              />
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                OTA commission
              </div>
              <RateRow
                label="Commission"
                value={formatCurrency(rateBreakup?.commissionAmount, currency)}
              />
              <RateRow
                label="GST on commission"
                value={formatCurrency(rateBreakup?.commissionGst, currency)}
              />
              <RateRow
                label="Commission incl. GST"
                value={formatCurrency(rateBreakup?.commissionTotal, currency)}
                highlight
              />
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                Tax deductions
              </div>
              <RateRow
                label="TCS"
                value={formatCurrency(rateBreakup?.tcsAmount, currency)}
              />
              <RateRow
                label="TDS"
                value={formatCurrency(rateBreakup?.tdsAmount, currency)}
              />
              <RateRow
                label="Total tax deduction (TCS + TDS)"
                value={formatCurrency(rateBreakup?.taxDeductions, currency)}
                highlight
              />
              {hasAgencyLine && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase border-t">
                    Agency
                  </div>
                  {rateBreakup?.agencyTier && (
                    <RateRow label="Agency tier" value={rateBreakup.agencyTier} />
                  )}
                  {rateBreakup?.agentCommission != null && (
                    <RateRow
                      label="Agent commission"
                      value={formatCurrency(
                        rateBreakup.agentCommission,
                        currency,
                      )}
                    />
                  )}
                  <RateRow
                    label="Agency commission (financials)"
                    value={formatCurrency(
                      detail.financials.agencyCommission,
                      currency,
                    )}
                  />
                </>
              )}
              <div className="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800 uppercase border-t border-violet-100">
                OTA revenue
              </div>
              <RateRow
                label="OTA gross revenue"
                value={formatCurrency(detail.pricing.otaGrossRevenue, currency)}
              />
              <RateRow
                label="OTA net revenue"
                value={formatCurrency(detail.pricing.otaNetRevenue, currency)}
                highlight
              />
              <div className="bg-sky-50 border-t border-sky-100 px-4 py-3 flex justify-between gap-2">
                <span className="text-sm font-semibold text-sky-800">
                  Payable to property
                </span>
                <span className="text-lg font-extrabold text-sky-900 tabular-nums">
                  {formatCurrency(rateBreakup?.payableToHotel, currency)}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Financials */}
          <SectionCard
            icon={TrendingUp}
            iconBg="bg-indigo-50"
            iconColor="bg-indigo-100 text-indigo-600"
            title="Financial breakdown (all charges)"
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              <dl>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Accommodation
                </p>
                <DetailRow
                  label="Base price"
                  value={formatCurrency(detail.financials.basePrice, currency)}
                />
                <DetailRow
                  label="Extra adult charges"
                  value={formatCurrency(extraAdultCharges, currency)}
                />
                {promotionDiscount > 0 ? (
                  <DetailRow
                    label="Promotion discount"
                    value={
                      <span className="text-emerald-700">
                        −{formatCurrency(promotionDiscount, currency)}
                      </span>
                    }
                  />
                ) : null}
                <DetailRow
                  label="Price after promo"
                  value={formatCurrency(
                    detail.financials.priceAfterPromo,
                    currency,
                  )}
                />
                <DetailRow
                  label={`GST (${formatPercent(detail.financials.gstPercent)})`}
                  value={formatCurrency(detail.financials.gstAmount, currency)}
                />
                <DetailRow
                  label="CGST / SGST"
                  value={`${formatCurrency(detail.financials.cgstAmount, currency)} / ${formatCurrency(detail.financials.sgstAmount, currency)}`}
                />
                <DetailRow
                  label="Tax rule"
                  value={detail.financials.taxRuleName}
                />
              </dl>
              <dl>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Service & commission
                </p>
                <DetailRow
                  label="Service fee"
                  value={formatCurrency(
                    detail.financials.serviceFeeAmount,
                    currency,
                  )}
                />
                <DetailRow
                  label="GST on service fee"
                  value={formatCurrency(detail.financials.serviceFeeGst, currency)}
                />
                <DetailRow
                  label="Service fee (incl. GST)"
                  value={formatCurrency(serviceFeeInclGst, currency)}
                />
                <DetailRow
                  label="Service fee rule"
                  value={
                    <div>
                      <span>{detail.financials.serviceFeeRuleName}</span>
                      {detail.financials.effectiveServiceFeePercent != null ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Effective {formatPercent(detail.financials.effectiveServiceFeePercent)}
                        </p>
                      ) : null}
                    </div>
                  }
                />
                <DetailRow
                  label={`Commission (${formatPercent(detail.financials.commissionPercent)})`}
                  value={formatCurrency(
                    detail.financials.commissionAmount,
                    currency,
                  )}
                />
                <DetailRow
                  label="GST on commission"
                  value={formatCurrency(detail.financials.commissionGst, currency)}
                />
                <DetailRow
                  label="Commission rule"
                  value={detail.financials.commissionRuleName}
                />
                <DetailRow
                  label="Agency commission"
                  value={formatCurrency(
                    detail.financials.agencyCommission,
                    currency,
                  )}
                />
              </dl>
              <dl>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Tax, payout & OTA
                </p>
                <DetailRow
                  label={`TCS (${formatPercent(detail.financials.tcsPercent)})`}
                  value={formatCurrency(detail.financials.tcsAmount, currency)}
                />
                <DetailRow
                  label={`TDS (${formatPercent(detail.financials.tdsPercent)})`}
                  value={formatCurrency(detail.financials.tdsAmount, currency)}
                />
                <DetailRow
                  label="Customer selling price"
                  value={formatCurrency(
                    detail.financials.customerSellingPrice,
                    currency,
                  )}
                />
                <DetailRow
                  label="Final payable"
                  value={formatCurrency(detail.financials.finalPayable, currency)}
                />
                <DetailRow
                  label="Hotel payout"
                  value={formatCurrency(detail.financials.hotelPayout, currency)}
                />
                <DetailRow
                  label="OTA gross revenue"
                  value={formatCurrency(
                    detail.financials.otaGrossRevenue,
                    currency,
                  )}
                />
                <DetailRow
                  label="OTA net revenue"
                  value={formatCurrency(
                    detail.financials.otaNetRevenue,
                    currency,
                  )}
                />
              </dl>
            </div>
          </SectionCard>

          {/* Per-room day */}
          {detail.roomDayFinancials.length > 0 && (
            <SectionCard
              icon={Layers}
              iconBg="bg-slate-50"
              iconColor="bg-slate-200 text-slate-700"
              title="Room-day breakdown"
              className="lg:col-span-2"
            >
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
                      <th className="py-2 pr-3">Room</th>
                      <th className="py-2 pr-3">Stay date</th>
                      <th className="py-2 pr-3 text-right">Room</th>
                      <th className="py-2 pr-3 text-right">Extra</th>
                      {showRoomDayPromo ? (
                        <th className="py-2 pr-3 text-right">Promo</th>
                      ) : null}
                      <th className="py-2 pr-3 text-right">Net accom.</th>
                      <th className="py-2 pr-3 text-right">GST</th>
                      <th className="py-2 pr-3 text-right">Gross</th>
                      <th className="py-2 pr-3 text-right">Commission</th>
                      <th className="py-2 text-right">Net payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.roomDayFinancials.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80"
                      >
                        <td className="py-2.5 pr-3 font-medium">
                          #{row.roomInstanceIndex}
                        </td>
                        <td className="py-2.5 pr-3">
                          {formatDate(row.stayDate)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.roomCharges, currency)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.extraCharges, currency)}
                        </td>
                        {showRoomDayPromo ? (
                          <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-700">
                            −{formatCurrency(row.promotionDiscount, currency)}
                          </td>
                        ) : null}
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.netAccommodation, currency)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.hotelGst, currency)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.propertyGross, currency)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatCurrency(row.commission, currency)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-medium">
                          {formatCurrency(row.propertyNetPayable, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Audit */}
          <SectionCard
            icon={Clock}
            iconBg="bg-gray-50"
            iconColor="bg-gray-200 text-gray-600"
            title="Audit"
            className="lg:col-span-2"
          >
            <dl>
              <DetailRow
                label="Created"
                value={formatDateTime(detail.audit.createdAt)}
              />
              <DetailRow
                label="Updated"
                value={formatDateTime(detail.audit.updatedAt)}
              />
            </dl>
          </SectionCard>
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
