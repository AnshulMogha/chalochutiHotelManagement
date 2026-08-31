import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  bookingService,
  moneyAmount,
  type BookingDetail,
} from "../services/bookingService";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { usesAdminBookingFullDetail } from "@/constants/roles";
import { useAuth } from "@/hooks";
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
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  HandCoins,
  Landmark,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Scale,
  Shield,
  StickyNote,
  Tag,
  User,
  Utensils,
  Wallet,
} from "lucide-react";
import { VoucherViewModal } from "../components/VoucherViewModal";
import AdminBookingDetailPage from "./AdminBookingDetailPage";

type DetailTab = "bookingSummary" | "roomPricing" | "payment" | "cancellation";

const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: "bookingSummary", label: "Booking Summary" },
  { value: "roomPricing", label: "Room & Pricing" },
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

function formatDateTime(value: string | undefined | null): string {
  if (!value) return "—";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
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
  const digits =
    Number.isInteger(rounded) ||
    Math.abs(rounded * 10 - Math.round(rounded * 10)) < 1e-8
      ? 1
      : 2;
  const shown = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
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

function withRate(label: string, pct: number | undefined): string {
  return pct != null ? `${label} @ ${formatPercent(pct)}` : label;
}

function hoursToDaysLabel(hours: number): string {
  const days = hours / 24;
  const whole =
    Number.isInteger(days) || Math.abs(days - Math.round(days)) < 1e-8
      ? Math.round(days)
      : Number(days.toFixed(1).replace(/\.0$/, ""));
  if (whole === 1) return "1 day";
  return `${whole} days`;
}

function formatCancellationBracketLabel(
  label: string | null | undefined,
): string {
  if (!label) return "";
  const converted = label.replace(/(\d+(?:\.\d+)?)\s*h\b/gi, (_, raw: string) =>
    hoursToDaysLabel(Number(raw)),
  );
  return converted
    .replace(
      /(\d+(?:\.\d+)?)\s+days?\s*[–-]\s*(\d+(?:\.\d+)?)\s+days?/gi,
      "$1–$2 days",
    )
    .replace(
      /(\d+(?:\.\d+)?)\s+day\s*[–-]\s*(\d+(?:\.\d+)?)\s+days?/gi,
      "$1–$2 days",
    )
    .replace(/\s*@\s*\d+(?:\.\d+)?\s*%/g, "")
    .trim();
}

function getCancellationPolicyLines(booking: BookingDetail): string[] {
  const lines = booking.cancellationPolicyLines;
  if (Array.isArray(lines) && lines.length > 0) {
    return lines.filter((line) => typeof line === "string" && line.trim());
  }
  return (booking.cancellationPolicy || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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
      className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm ${className}`}
    >
      <div className={`border-b border-gray-100 ${iconBg} px-3 py-2`}>
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconColor}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,38%)_minmax(0,1fr)] items-start gap-x-3 border-b border-gray-50 py-1.5 last:border-0">
      <dt className="text-xs leading-snug text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium leading-snug wrap-break-word text-gray-900">
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
      <p className="mt-0.5 text-sm font-medium leading-snug wrap-break-word text-gray-900">
        {value ?? "—"}
      </p>
    </div>
  );
}

function BookedByOwnerSummaryValue({
  owner,
}: {
  owner: BookingDetail["bookingOwner"];
}) {
  if (!owner?.name && !owner?.email) return "—";

  return (
    <span className="block space-y-0.5">
      {owner.name ? <span className="block">{owner.name}</span> : null}
      {owner.email ? (
        <span className="block text-xs font-normal text-gray-500">
          {owner.email}
        </span>
      ) : null}
    </span>
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
      <span className="shrink-0 tabular-nums">
        {formatCurrency(amount, currency)}
      </span>
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

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { isUserProfileLoading, user } = useAuth();
  const useAdminDetail = usesAdminBookingFullDetail(user?.roles);

  if (isUserProfileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-[#2f3d95] animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (useAdminDetail) {
    return <AdminBookingDetailPage listItemId={id} backHotelId={hotelId} />;
  }

  return <HotelBookingDetailPage bookingId={id} hotelId={hotelId} />;
}

function HotelBookingDetailPage({
  bookingId: id,
  hotelId,
}: {
  bookingId: string | undefined;
  hotelId: string | null;
}) {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVoucher, setShowVoucher] = useState(false);
  const [tab, setTab] = useState<DetailTab>("bookingSummary");
  const requestRef = useRef<{
    key: string;
    promise: Promise<BookingDetail>;
  } | null>(null);

  useEffect(() => {
    if (!id || !hotelId) {
      setLoading(false);
      return;
    }
    const key = `${hotelId}:${id}`;
    if (requestRef.current?.key !== key) {
      requestRef.current = {
        key,
        promise: bookingService.getBookingDetail(hotelId, id),
      };
    }
    const { promise } = requestRef.current;
    let cancelled = false;
    setLoading(true);
    promise
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
        if (requestRef.current?.key === key) requestRef.current = null;
        if (!cancelled) {
          console.error("Error fetching booking detail:", err);
          showToast("Failed to load booking details", "error");
          setBooking(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, hotelId, showToast]);

  const backToBookings = () => {
    const to = hotelId
      ? `${ROUTES.BOOKINGS.LIST}?hotelId=${hotelId}`
      : ROUTES.BOOKINGS.LIST;
    navigate(to);
  };

  if (!hotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">
            Please select a hotel from the top bar to view booking details.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.BOOKINGS.LIST)}
            className="mt-4 text-[#2f3d95] font-medium hover:underline"
          >
            Back to Bookings
          </button>
        </div>
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

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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

  const rateBreakup = booking.rateBreakup;
  const currency = rateBreakup?.currency || "INR";
  const hotelPricingComputation =
    booking.hotelPricingComputation ||
    booking.hotel_pricing_computation ||
    null;
  const isPackageBooking = String(hotelPricingComputation || "")
    .toUpperCase()
    .includes("PACKAGE");
  const showCommissionBreakup =
    !isPackageBooking || (rateBreakup?.commissionAmount ?? 0) > 0;
  const showTaxDeductionBreakup =
    !isPackageBooking || (rateBreakup?.taxDeductions ?? 0) > 0;
  const showPropertyTaxLine =
    !isPackageBooking || (rateBreakup?.propertyTaxes ?? 0) > 0;
  const bookingStatus = booking.status || booking.paymentStatus;
  const isCancelledBooking =
    `${booking.status || ""} ${booking.paymentStatus || ""}`
      .toUpperCase()
      .includes("CANCEL");
  const originalReservationValue =
    moneyAmount(booking.originalReservationValue) ?? booking.totalAmount;
  const cancellationChargeAmount =
    moneyAmount(booking.cancellationCharge) ?? booking.cancelAmount;
  const payableToProperty =
    moneyAmount(booking.amountPayableToProperty) ?? rateBreakup?.payableToHotel;
  const cancelNowCharge = moneyAmount(booking.currentCancellationCharge);
  const refundIfCancelledNow = moneyAmount(booking.refundAmountIfCancelledNow);
  const cancellationPolicyLines = getCancellationPolicyLines(booking);
  const appliedPromotions = rateBreakup?.appliedPromotions ?? [];
  const promotionDiscount = rateBreakup?.promotionDiscount ?? 0;
  const extraCharges = rateBreakup?.extraAdultChildCharges ?? 0;
  const serviceFeeAmount =
    rateBreakup?.serviceFeeIncludingGst ??
    rateBreakup?.serviceChargeAmount ??
    0;
  const chargeBase =
    rateBreakup?.netAccommodationAfterPromotion ??
    rateBreakup?.roomCharges ??
    rateBreakup?.roomChargesBeforePromotion;
  const gstPercent = ratePercent(rateBreakup?.propertyTaxes, chargeBase);
  const commissionPercent = ratePercent(
    rateBreakup?.commissionAmount,
    chargeBase,
  );
  const commissionGstPercent = ratePercent(
    rateBreakup?.commissionGst,
    rateBreakup?.commissionAmount,
  );
  const tcsPercent = ratePercent(rateBreakup?.tcsAmount, chargeBase);
  const tdsPercent = ratePercent(rateBreakup?.tdsAmount, chargeBase);
  const matchedBracket = booking.matchedBracket ?? null;
  const cancelNowPercent =
    matchedBracket?.penaltyPercent ??
    ratePercent(cancelNowCharge, originalReservationValue);
  const cancellationChargePercent =
    matchedBracket?.penaltyPercent ??
    ratePercent(
      isCancelledBooking ? cancellationChargeAmount : cancelNowCharge,
      originalReservationValue,
    );
  const refundPercent = ratePercent(
    isCancelledBooking ? booking.refundAmount : refundIfCancelledNow,
    originalReservationValue,
  );
  const isNonRefundable =
    String(booking.currentPolicyStage || "")
      .toUpperCase()
      .includes("NOT_CANCELLABLE") ||
    String(booking.cancellationPolicy || "")
      .toLowerCase()
      .includes("non-refundable");

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
                      Booking view
                    </p>
                    <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                      {booking.bookingId}
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      {booking.hotelName} · {booking.bookedVia}
                      {booking.bookingOwner?.name
                        ? ` · Booked by ${booking.bookingOwner.name}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    status={bookingStatus}
                    tone={bookingStatusTone(bookingStatus)}
                  />
                  {isPackageBooking ? (
                    <StatusBadge
                      status={hotelPricingComputation || "PACKAGE"}
                      tone="bg-violet-50 text-violet-700 ring-violet-200"
                    />
                  ) : hotelPricingComputation ? (
                    <StatusBadge
                      status={hotelPricingComputation}
                      tone="bg-slate-100 text-slate-700 ring-slate-200"
                    />
                  ) : null}
                  {appliedPromotions[0]?.displayLine ||
                  appliedPromotions[0]?.promotionName ? (
                    <StatusBadge
                      status={
                        appliedPromotions[0].displayLine ||
                        appliedPromotions[0].promotionName
                      }
                      tone="bg-emerald-50 text-emerald-700 ring-emerald-200"
                    />
                  ) : null}
                  {booking.paymentStatus &&
                  booking.paymentStatus !== bookingStatus ? (
                    <StatusBadge
                      status={booking.paymentStatus}
                      tone={paymentStatusTone(booking.paymentStatus)}
                    />
                  ) : null}
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
                    {booking.hotelName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {booking.hotelCity || booking.hotelAddress || "—"}
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
                    {formatDate(booking.checkInDate)} –{" "}
                    {formatDate(booking.checkOutDate)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {booking.nightsDisplay}
                    {booking.totalRooms
                      ? ` · ${booking.totalRooms} room(s)`
                      : ""}{" "}
                    · {booking.occupancyDisplay || "—"}
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
                    {booking.guestName}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Booked {formatDateTime(booking.bookedOn)}
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
                    {booking.bookedVia}
                  </p>
                  {booking.bookingOwner?.name || booking.bookingOwner?.email ? (
                    <p className="truncate text-[11px] text-slate-500">
                      {booking.bookingOwner.name}
                      {booking.bookingOwner.email
                        ? ` · ${booking.bookingOwner.email}`
                        : ""}
                    </p>
                  ) : null}
                  <p className="truncate text-[11px] text-slate-500">
                    {[
                      booking.roomTypes?.[0]?.mealPlan,
                      hotelPricingComputation
                        ? formatStatusLabel(hotelPricingComputation)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            <FinanceKpiCard
              label={isCancelledBooking ? "Original value" : "Guest paid"}
              value={formatCurrency(
                isCancelledBooking
                  ? originalReservationValue
                  : booking.totalAmount,
                currency,
              )}
              sub={booking.bookedVia}
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
                    : booking.cancellationDatetime
                      ? formatDateTime(booking.cancellationDatetime)
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
                isCancelledBooking
                  ? "After cancellation"
                  : hotelPricingComputation
                    ? formatStatusLabel(hotelPricingComputation)
                    : undefined
              }
              icon={Landmark}
              tone={FINANCE_KPI_TONES.hotelPayout}
              onClick={() => setTab("roomPricing")}
              actionLabel=""
            />
            {showCommissionBreakup ? (
              <FinanceKpiCard
                label="Commission"
                value={formatCurrency(rateBreakup?.commissionAmount, currency)}
                sub={
                  [
                    commissionPercent != null
                      ? formatPercent(commissionPercent)
                      : null,
                    rateBreakup?.commissionTotal != null
                      ? `Incl. GST ${formatCurrency(rateBreakup.commissionTotal, currency)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                icon={Scale}
                tone={FINANCE_KPI_TONES.margin}
                onClick={() => setTab("roomPricing")}
                actionLabel=""
              />
            ) : null}
            {isCancelledBooking &&
            (booking.refundAmount != null || booking.refundStatus) ? (
              <FinanceKpiCard
                label="Customer refund"
                value={
                  booking.refundAmount == null
                    ? booking.refundStatus
                      ? formatStatusLabel(booking.refundStatus)
                      : "—"
                    : formatCurrency(booking.refundAmount, currency)
                }
                sub={
                  booking.refundDateTime
                    ? formatDateTime(booking.refundDateTime)
                    : booking.refundStatus
                      ? formatStatusLabel(booking.refundStatus)
                      : undefined
                }
                icon={Wallet}
                tone={FINANCE_KPI_TONES.refund}
                onClick={() => setTab("cancellation")}
                actionLabel=""
              />
            ) : booking.isCancellationAllowed === false ? null : (
              <FinanceKpiCard
                label="If cancelled now"
                value={formatCurrency(cancelNowCharge, currency)}
                sub={
                  [
                    cancelNowPercent != null
                      ? formatPercent(cancelNowPercent)
                      : null,
                    refundIfCancelledNow != null
                      ? `Refund ${formatCurrency(refundIfCancelledNow, currency)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                icon={Shield}
                tone={FINANCE_KPI_TONES.cancellation}
                onClick={() => setTab("cancellation")}
                actionLabel=""
              />
            )}
            <FinanceKpiCard
              label="Booking total"
              value={formatCurrency(booking.totalAmount, currency)}
              icon={Wallet}
              tone={FINANCE_KPI_TONES.outstanding}
              onClick={() => setTab("payment")}
              actionLabel=""
            />
          </div>

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
                icon={Building2}
                iconBg="bg-sky-50"
                iconColor="bg-sky-100 text-sky-600"
                title="Booking summary"
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryField label="Booking ref" value={booking.bookingId} />
                  {booking.externalBookingId ? (
                    <SummaryField
                      label="External ID"
                      value={booking.externalBookingId}
                    />
                  ) : null}
                  <SummaryField label="Status" value={bookingStatus} />
                  <SummaryField label="Hotel" value={booking.hotelName} />
                  <SummaryField label="City" value={booking.hotelCity || "—"} />
                  <SummaryField label="Booked via" value={booking.bookedVia} />
                  <SummaryField
                    label="Booked by"
                    value={
                      <BookedByOwnerSummaryValue owner={booking.bookingOwner} />
                    }
                    className="sm:col-span-2"
                  />
                  <SummaryField
                    label="Check-in"
                    value={formatDate(booking.checkInDate)}
                  />
                  <SummaryField
                    label="Check-out"
                    value={formatDate(booking.checkOutDate)}
                  />
                  <SummaryField label="Nights" value={booking.nightsDisplay} />
                  <SummaryField
                    label="Occupancy"
                    value={booking.occupancyDisplay}
                  />
                  <SummaryField
                    label="Booked on"
                    value={formatDateTime(booking.bookedOn)}
                  />
                  <SummaryField
                    label="Total amount"
                    value={formatCurrency(booking.totalAmount, currency)}
                  />
                  {hotelPricingComputation ? (
                    <SummaryField
                      label="Pricing"
                      value={formatStatusLabel(hotelPricingComputation)}
                    />
                  ) : null}
                  <SummaryField
                    label="Address"
                    value={
                      [
                        booking.hotelAddress,
                        booking.hotelLocality,
                        booking.hotelCity,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"
                    }
                    className="sm:col-span-2 xl:col-span-3"
                  />
                </div>
              </SectionCard>

              <SectionCard
                icon={User}
                iconBg="bg-indigo-50"
                iconColor="bg-indigo-100 text-indigo-600"
                title="Guest"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {booking.guestName}
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="min-w-0 wrap-break-word">
                      {booking.emailAddress || "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-700">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="min-w-0 wrap-break-word">
                      {booking.contactNumber || "—"}
                    </span>
                  </div>
                </div>
                {booking.guestStatus ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Status: {booking.guestStatus}
                  </p>
                ) : null}
                {booking.gstDetails ? (
                  <p className="mt-2 text-xs text-gray-500">
                    GST: {booking.gstDetails}
                  </p>
                ) : null}
              </SectionCard>

              {booking.specialRequestByGuest || booking.internalNote ? (
                <SectionCard
                  icon={StickyNote}
                  iconBg="bg-amber-50"
                  iconColor="bg-amber-100 text-amber-600"
                  title="Notes"
                >
                  <dl>
                    {booking.specialRequestByGuest ? (
                      <DetailRow
                        label="Guest request"
                        value={booking.specialRequestByGuest}
                      />
                    ) : null}
                    {booking.internalNote ? (
                      <DetailRow
                        label="Internal note"
                        value={booking.internalNote}
                      />
                    ) : null}
                  </dl>
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          {tab === "roomPricing" ? (
            <div className="mb-3 space-y-3">
              <SectionCard
                icon={BedDouble}
                iconBg="bg-violet-50"
                iconColor="bg-violet-100 text-violet-600"
                title="Rooms"
              >
                {booking.roomTypes?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {booking.roomTypes.map((room, idx) => (
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
                          {room.quantity ? (
                            <span>Qty {room.quantity}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">—</p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Total rooms: {booking.totalRooms ?? "—"}
                </p>
              </SectionCard>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Final calculation
                  </h3>
                  {isCancelledBooking ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-200">
                      After cancellation
                    </span>
                  ) : null}
                </div>
                <CalcSectionHeader title="Property charges" />
                <CalcLine
                  index="1"
                  label={
                    promotionDiscount > 0 || appliedPromotions.length
                      ? "Room charges (before promotion)"
                      : "Room charges"
                  }
                  amount={
                    rateBreakup?.roomChargesBeforePromotion ??
                    rateBreakup?.roomCharges
                  }
                  currency={currency}
                />
                {appliedPromotions.length ? (
                  appliedPromotions.map((promo, idx) => (
                    <CalcLine
                      key={`${promo.promotionName}-${idx}`}
                      label={
                        promo.displayLine ||
                        `${promo.promotionName}${
                          promo.percentLabel ? ` (${promo.percentLabel})` : ""
                        }`
                      }
                      amount={promo.discountAmount}
                      currency={currency}
                      negative
                    />
                  ))
                ) : promotionDiscount > 0 ? (
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
                      rateBreakup?.roomCharges
                    }
                    currency={currency}
                  />
                ) : null}
                {extraCharges > 0 ? (
                  <CalcLine
                    index="2"
                    label="Extra adult / child charges"
                    amount={extraCharges}
                    currency={currency}
                  />
                ) : null}
                {showPropertyTaxLine ? (
                  <CalcLine
                    index={extraCharges > 0 ? "3" : "2"}
                    label={withRate("Property taxes", gstPercent)}
                    amount={rateBreakup?.propertyTaxes}
                    currency={currency}
                  />
                ) : null}
                <CalcSubtotal
                  letter="A"
                  label="Total property charges"
                  amount={rateBreakup?.hotelGrossCharges}
                  currency={currency}
                />
                {serviceFeeAmount > 0 ? (
                  <CalcLine
                    label={
                      rateBreakup?.serviceChargePercent
                        ? `Service fee @ ${rateBreakup.serviceChargePercent}%`
                        : "Service fee"
                    }
                    amount={serviceFeeAmount}
                    currency={currency}
                  />
                ) : null}

                {showCommissionBreakup ? (
                  <>
                    <CalcSectionHeader title="Commission" />
                    <CalcLine
                      index="3"
                      label={withRate("Commission", commissionPercent)}
                      amount={rateBreakup?.commissionAmount}
                      currency={currency}
                    />
                    <CalcLine
                      index="4"
                      label={withRate(
                        "GST on commission",
                        commissionGstPercent,
                      )}
                      amount={rateBreakup?.commissionGst}
                      currency={currency}
                    />
                    <CalcSubtotal
                      letter="B"
                      label="Commission inclusive of GST (3 + 4)"
                      amount={rateBreakup?.commissionTotal}
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
                      amount={rateBreakup?.tcsAmount}
                      currency={currency}
                    />
                    <CalcLine
                      index="6"
                      label={withRate("TDS", tdsPercent)}
                      amount={rateBreakup?.tdsAmount}
                      currency={currency}
                    />
                    <CalcSubtotal
                      letter="C"
                      label="Tax deduction (5 + 6)"
                      amount={rateBreakup?.taxDeductions}
                      currency={currency}
                    />
                  </>
                ) : null}

                <div className="flex items-center justify-between gap-4 border-t border-sky-100 bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-900">
                  <span>
                    {isPackageBooking &&
                    !showCommissionBreakup &&
                    !showTaxDeductionBreakup
                      ? "Payable to property"
                      : "Payable to property (A − B − C)"}
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatCurrency(payableToProperty, currency)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "payment" ? (
            <SectionCard
              icon={CreditCard}
              iconBg="bg-emerald-50"
              iconColor="bg-emerald-100 text-emerald-600"
              title="Payment summary"
              className="mb-3"
            >
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <DetailRow
                  label="Payment status"
                  value={
                    <StatusBadge
                      status={booking.paymentStatus}
                      tone={paymentStatusTone(booking.paymentStatus)}
                    />
                  }
                />
                <DetailRow
                  label={
                    isCancelledBooking ? "Original value" : "Booking amount"
                  }
                  value={formatCurrency(
                    isCancelledBooking
                      ? originalReservationValue
                      : booking.totalAmount,
                    currency,
                  )}
                />
                {booking.paymentType ? (
                  <DetailRow label="Method" value={booking.paymentType} />
                ) : null}
                {booking.refundStatus ? (
                  <DetailRow
                    label="Refund status"
                    value={
                      <StatusBadge
                        status={booking.refundStatus}
                        tone={refundStatusTone(booking.refundStatus)}
                      />
                    }
                  />
                ) : null}
                {booking.refundAmount != null ? (
                  <DetailRow
                    label="Refunded"
                    value={formatCurrency(booking.refundAmount, currency)}
                  />
                ) : null}
              </dl>
            </SectionCard>
          ) : null}

          {tab === "cancellation" ? (
            <div className="mb-3 grid gap-3 lg:grid-cols-2">
              <SectionCard
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
                {matchedBracket ? (
                  <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Policy applied
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-900">
                      {formatCancellationBracketLabel(matchedBracket.label) ||
                        (matchedBracket.penaltyPercent != null
                          ? `${formatPercent(matchedBracket.penaltyPercent)} cancellation charge`
                          : "Matched cancellation bracket")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {[
                        matchedBracket.penaltyType
                          ? formatStatusLabel(matchedBracket.penaltyType)
                          : null,
                        matchedBracket.penaltyPercent != null
                          ? formatPercent(matchedBracket.penaltyPercent)
                          : matchedBracket.fixedPenaltyAmount != null
                            ? formatCurrency(
                                moneyAmount(matchedBracket.fixedPenaltyAmount),
                                currency,
                              )
                            : null,
                        matchedBracket.effectiveFrom
                          ? `From ${formatDate(matchedBracket.effectiveFrom)}`
                          : null,
                        matchedBracket.effectiveTo
                          ? `to ${formatDate(matchedBracket.effectiveTo)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ) : null}
                {cancellationPolicyLines.length ? (
                  <ul className="space-y-1.5">
                    {cancellationPolicyLines.map((line, idx) => {
                      const matched =
                        matchedBracket?.penaltyPercent != null &&
                        line.includes(
                          `${Number(matchedBracket.penaltyPercent)}%`,
                        );
                      return (
                        <li
                          key={idx}
                          className={`flex gap-1.5 text-[11px] leading-snug ${
                            matched
                              ? "rounded-md bg-amber-50 px-1.5 py-1 font-medium text-amber-900"
                              : "text-gray-700"
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                              matched ? "bg-amber-600" : "bg-amber-400"
                            }`}
                          />
                          <span>{line}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">—</p>
                )}
              </SectionCard>
              <SectionCard
                icon={Shield}
                iconBg="bg-rose-50"
                iconColor="bg-rose-100 text-rose-600"
                title={
                  isCancelledBooking
                    ? "Cancellation details"
                    : "If cancelled now"
                }
              >
                <dl>
                  {isCancelledBooking &&
                  booking.cancelledBy &&
                  booking.cancelledBy.toUpperCase() !== "AGENT" ? (
                    <DetailRow
                      label="Cancelled by"
                      value={formatStatusLabel(booking.cancelledBy)}
                    />
                  ) : null}
                  {isCancelledBooking && booking.cancellationReason ? (
                    <DetailRow
                      label="Reason"
                      value={booking.cancellationReason}
                    />
                  ) : null}
                  {!isCancelledBooking &&
                  booking.isCancellationAllowed != null ? (
                    <DetailRow
                      label="Cancellation allowed"
                      value={booking.isCancellationAllowed ? "Yes" : "No"}
                    />
                  ) : null}
                  {booking.currentPolicyStage ? (
                    <DetailRow
                      label="Current stage"
                      value={formatStatusLabel(booking.currentPolicyStage)}
                    />
                  ) : null}
                  {matchedBracket?.label ? (
                    <DetailRow
                      label="Applied bracket"
                      value={formatCancellationBracketLabel(
                        matchedBracket.label,
                      )}
                    />
                  ) : null}
                  {isCancelledBooking && booking.cancellationDatetime ? (
                    <DetailRow
                      label="Cancelled on"
                      value={formatDateTime(booking.cancellationDatetime)}
                    />
                  ) : null}
                  {booking.cancellationEvaluatedAt &&
                  booking.cancellationEvaluatedAt !==
                    booking.cancellationDatetime ? (
                    <DetailRow
                      label="Policy evaluated"
                      value={formatDateTime(booking.cancellationEvaluatedAt)}
                    />
                  ) : null}
                  <DetailRow
                    label={
                      isCancelledBooking
                        ? "Original reservation"
                        : "Original value"
                    }
                    value={formatCurrency(originalReservationValue, currency)}
                  />
                  {isCancelledBooking ||
                  booking.isCancellationAllowed !== false ? (
                    <>
                      <DetailRow
                        label="Cancellation charge"
                        value={formatCurrency(
                          isCancelledBooking
                            ? cancellationChargeAmount
                            : cancelNowCharge,
                          currency,
                        )}
                      />
                      {!isCancelledBooking || booking.refundAmount != null ? (
                        <DetailRow
                          label={withRate(
                            isCancelledBooking
                              ? "Customer refund"
                              : "Refund if cancelled now",
                            refundPercent && refundPercent > 0
                              ? refundPercent
                              : undefined,
                          )}
                          value={
                            isCancelledBooking
                              ? formatCurrency(booking.refundAmount, currency)
                              : formatCurrency(refundIfCancelledNow, currency)
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                  {isCancelledBooking && booking.refundStatus ? (
                    <DetailRow
                      label="Refund status"
                      value={
                        <StatusBadge
                          status={booking.refundStatus}
                          tone={refundStatusTone(booking.refundStatus)}
                        />
                      }
                    />
                  ) : null}
                  {isCancelledBooking && booking.refundDateTime ? (
                    <DetailRow
                      label="Refunded on"
                      value={formatDateTime(booking.refundDateTime)}
                    />
                  ) : null}
                  {isCancelledBooking && payableToProperty != null ? (
                    <DetailRow
                      label="Payable to property"
                      value={formatCurrency(payableToProperty, currency)}
                    />
                  ) : null}
                </dl>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>

      <VoucherViewModal
        open={showVoucher}
        onClose={() => setShowVoucher(false)}
        bookingId={id}
        bookingReference={booking.bookingId}
      />
    </>
  );
}
