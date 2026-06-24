import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { bookingService, type BookingDetail } from "../services/bookingService";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { ROLES, hasAnyRole } from "@/constants/roles";
import { useAuth } from "@/hooks";
import {
  ArrowLeft,
  Hash,
  User,
  Calendar,
  Moon,
  Utensils,
  Building2,
  CreditCard,
  Tag,
  Loader2,
  FileText,
  MapPin,
  Mail,
  Phone,
  BedDouble,
  Receipt,
  Clock,
  Shield,
  StickyNote,
} from "lucide-react";
import { VoucherViewModal } from "../components/VoucherViewModal";
import AdminBookingDetailPage from "./AdminBookingDetailPage";

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

function getPaymentStatusStyle(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  const s = status.toUpperCase();
  if (s.includes("PAID") || s.includes("CONFIRMED"))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s.includes("PENDING"))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (s.includes("FAILED") || s.includes("CANCELLED"))
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const trimmed = Number(value.toFixed(4));
  return `${trimmed}%`;
}

/** Gross property charges excluding service fee (API gross includes service charge). */
function getPropertyGrossExcludingServiceFee(
  rateBreakup: BookingDetail["rateBreakup"],
): number | undefined {
  if (rateBreakup?.hotelGrossCharges == null) return undefined;
  const serviceFee = rateBreakup.serviceChargeAmount ?? 0;
  return Math.max(0, rateBreakup.hotelGrossCharges - serviceFee);
}

function hasPromotionBreakup(
  rateBreakup: BookingDetail["rateBreakup"],
): boolean {
  if (!rateBreakup) return false;
  const discount = rateBreakup.promotionDiscount ?? 0;
  const promos = rateBreakup.appliedPromotions?.length ?? 0;
  const before =
    rateBreakup.roomChargesBeforePromotion != null ||
    rateBreakup.extraAdultChildChargesBeforePromotion != null;
  return discount > 0 || promos > 0 || before;
}

function getPricingComputationStyle(value: string | undefined | null): string {
  if (!value) return "bg-gray-100 text-gray-700 border-gray-200";
  const normalized = String(value).toUpperCase();
  if (normalized === "PACKAGE_RATE") {
    return "bg-violet-100 text-violet-800 border-violet-200";
  }
  if (normalized === "RETAIL_RATE") {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function DetailCard({
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("hotelId");
  const { isUserProfileLoading, user } = useAuth();
  const isSuperAdmin = hasAnyRole(user?.roles, [ROLES.SUPER_ADMIN]);

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

  if (isSuperAdmin) {
    return (
      <AdminBookingDetailPage listItemId={id} backHotelId={hotelId} />
    );
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

  useEffect(() => {
    if (!id || !hotelId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setBooking(null);
    bookingService
      .getBookingDetail(hotelId, id)
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
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
  const hotelPricingComputation =
    booking.hotelPricingComputation ||
    booking.hotel_pricing_computation ||
    null;
  const isPackageRate =
    String(hotelPricingComputation || "").toUpperCase() === "PACKAGE_RATE";
  const isCancelledBooking = String(booking.paymentStatus || "")
    .toUpperCase()
    .includes("CANCELLED");
  const showPromotionBreakup = hasPromotionBreakup(rateBreakup);
  const propertyGrossExServiceFee = getPropertyGrossExcludingServiceFee(rateBreakup);

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={backToBookings}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#2f3d95] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bookings
          </button>
        </div>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2f3d95]/10 flex items-center justify-center">
              <Hash className="w-7 h-7 text-[#2f3d95]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {booking.bookingId}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {booking.bookedVia} · Booked {booking.bookedOn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowVoucher(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2f3d95] text-[#2f3d95] text-sm font-medium hover:bg-[#2f3d95]/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Voucher
            </button>
            <span
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border ${getPaymentStatusStyle(
                booking.paymentStatus,
              )}`}
            >
              {booking.paymentStatus}
            </span>
          </div>
        </div>

        {hotelPricingComputation && (
          <div className="mb-6 rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50 to-indigo-50 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Hotel Pricing Computation
                </p>
                <span
                  className={`mt-1 inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${getPricingComputationStyle(
                    hotelPricingComputation,
                  )}`}
                >
                  {hotelPricingComputation}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hotel */}
          <DetailCard
            icon={Building2}
            iconBg="bg-sky-50"
            iconColor="bg-sky-100 text-sky-600"
            title="Hotel"
          >
            <dl className="divide-y divide-gray-50">
              <DetailRow label="Hotel name" value={booking.hotelName} />
              <DetailRow
                label="Address"
                value={
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>
                      {[
                        booking.hotelAddress,
                        booking.hotelLocality,
                        booking.hotelCity,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </span>
                }
              />
            </dl>
          </DetailCard>

          {/* Guest */}
          <DetailCard
            icon={User}
            iconBg="bg-indigo-50"
            iconColor="bg-indigo-100 text-indigo-600"
            title="Guest information"
          >
            <dl className="divide-y divide-gray-50">
              <DetailRow label="Guest name" value={booking.guestName} />
              {booking.guestStatus != null && booking.guestStatus !== "" && (
                <DetailRow label="Guest status" value={booking.guestStatus} />
              )}
              <DetailRow
                label="Contact"
                value={
                  booking.contactNumber ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {booking.contactNumber}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Email"
                value={
                  booking.emailAddress ? (
                    <span className="inline-flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {booking.emailAddress}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow label="Occupancy" value={booking.occupancyDisplay} />
            </dl>
          </DetailCard>

          {/* Stay dates */}
          <DetailCard
            icon={Calendar}
            iconBg="bg-emerald-50"
            iconColor="bg-emerald-100 text-emerald-600"
            title="Stay"
          >
            <dl className="divide-y divide-gray-50">
              <DetailRow
                label="Check-in"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {formatDate(booking.checkInDate)}
                  </span>
                }
              />
              <DetailRow
                label="Check-out"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-500" />
                    {formatDate(booking.checkOutDate)}
                  </span>
                }
              />
              <DetailRow label="Nights" value={booking.nightsDisplay} />
            </dl>
          </DetailCard>

          {/* Rooms */}
          <DetailCard
            icon={BedDouble}
            iconBg="bg-violet-50"
            iconColor="bg-violet-100 text-violet-600"
            title="Rooms"
          >
            <div className="space-y-3">
              {booking.roomTypes?.length ? (
                booking.roomTypes.map((room, idx) => (
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
                ))
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
              <p className="text-xs text-gray-500 pt-1">
                Total rooms: {booking.totalRooms ?? "—"}
              </p>
            </div>
          </DetailCard>

          {/* Payment summary */}
          <DetailCard
            icon={CreditCard}
            iconBg="bg-emerald-50"
            iconColor="bg-emerald-100 text-emerald-600"
            title="Payment"
          >
            <dl className="divide-y divide-gray-50">
              <DetailRow
                label="Payment status"
                value={
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPaymentStatusStyle(
                      booking.paymentStatus,
                    )}`}
                  >
                    {booking.paymentStatus}
                  </span>
                }
              />
              <DetailRow
                label="Payment type"
                value={booking.paymentType || "—"}
              />
              <DetailRow
                label="Guest paid (total)"
                value={
                  <span className="text-lg font-bold text-gray-900 tabular-nums">
                    {formatCurrency(
                      booking.totalAmount,
                      rateBreakup?.currency,
                    )}
                  </span>
                }
              />
            </dl>
          </DetailCard>

          {/* Rate breakup */}
          <DetailCard
            icon={Receipt}
            iconBg="bg-amber-50"
            iconColor="bg-amber-100 text-amber-600"
            title="Rate breakup"
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {showPromotionBreakup && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Accommodation (before promotion)
                  </div>
                  <RateRow
                    label="Room charges (list)"
                    value={formatCurrency(
                      rateBreakup?.roomChargesBeforePromotion ??
                        rateBreakup?.roomCharges,
                      rateBreakup?.currency,
                    )}
                  />
                  <RateRow
                    label="Extra adult / child (list)"
                    value={formatCurrency(
                      rateBreakup?.extraAdultChildChargesBeforePromotion ??
                        rateBreakup?.extraAdultChildCharges,
                      rateBreakup?.currency,
                    )}
                  />
                  <div className="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 uppercase tracking-wide border-t border-violet-100">
                    Promotions
                  </div>
                  {rateBreakup?.appliedPromotions?.length ? (
                    rateBreakup.appliedPromotions.map((promo, idx) => (
                      <RateRow
                        key={`${promo.promotionName}-${idx}`}
                        label={
                          promo.displayLine ||
                          `${promo.promotionName} (${promo.percentLabel || formatPercent(promo.discountPercentage)})`
                        }
                        value={
                          <span className="text-emerald-700 font-medium">
                            −
                            {formatCurrency(
                              promo.discountAmount,
                              rateBreakup?.currency,
                            )}
                          </span>
                        }
                      />
                    ))
                  ) : (
                    <RateRow
                      label="Promotion discount"
                      value={
                        <span className="text-emerald-700 font-medium">
                          −
                          {formatCurrency(
                            rateBreakup?.promotionDiscount,
                            rateBreakup?.currency,
                          )}
                        </span>
                      }
                    />
                  )}
                  {(rateBreakup?.appliedPromotions?.length ?? 0) > 1 &&
                    (rateBreakup?.promotionDiscount ?? 0) > 0 && (
                      <RateRow
                        label="Total promotion discount"
                        value={
                          <span className="text-emerald-700 font-semibold">
                            −
                            {formatCurrency(
                              rateBreakup?.promotionDiscount,
                              rateBreakup?.currency,
                            )}
                          </span>
                        }
                        highlight
                      />
                    )}
                  <RateRow
                    label="Net accommodation (after promotion)"
                    value={formatCurrency(
                      rateBreakup?.netAccommodationAfterPromotion,
                      rateBreakup?.currency,
                    )}
                    highlight
                  />
                </>
              )}

              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-t border-gray-200">
                Property charges
              </div>
              <RateRow
                label={
                  showPromotionBreakup
                    ? "1. Room charges (after promotion)"
                    : "1. Room charges"
                }
                value={formatCurrency(
                  rateBreakup?.roomCharges,
                  rateBreakup?.currency,
                )}
              />
              <RateRow
                label={
                  showPromotionBreakup
                    ? "2. Extra adult / child (after promotion)"
                    : "2. Extra adult / child charges"
                }
                value={formatCurrency(
                  rateBreakup?.extraAdultChildCharges,
                  rateBreakup?.currency,
                )}
              />
              <RateRow
                label="3. Property taxes"
                value={formatCurrency(
                  rateBreakup?.propertyTaxes,
                  rateBreakup?.currency,
                )}
              />
              <RateRow
                label={
                  !isPackageRate && (rateBreakup?.serviceChargeAmount ?? 0) > 0
                    ? "(A) Property gross charges (1+2+3, excl. service fee)"
                    : "(A) Property gross charges (1+2+3)"
                }
                value={formatCurrency(
                  propertyGrossExServiceFee ?? rateBreakup?.hotelGrossCharges,
                  rateBreakup?.currency,
                )}
                highlight
              />

              {!isPackageRate && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-t border-gray-200">
                    OTA Commission
                  </div>
                  <RateRow
                    label="4. OTA commission"
                    value={formatCurrency(
                      rateBreakup?.commissionAmount,
                      rateBreakup?.currency,
                    )}
                  />
                  <RateRow
                    label="5. GST on commission @18%"
                    value={formatCurrency(
                      rateBreakup?.commissionGst,
                      rateBreakup?.currency,
                    )}
                  />
                  <RateRow
                    label="(B) Commission including GST (4+5)"
                    value={formatCurrency(
                      rateBreakup?.commissionTotal,
                      rateBreakup?.currency,
                    )}
                    highlight
                  />
                </>
              )}

              {!isPackageRate && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-t border-gray-200">
                    Tax deduction
                  </div>
                  <RateRow
                    label="6. TCS @ 0.5%"
                    value={formatCurrency(
                      rateBreakup?.tcsAmount,
                      rateBreakup?.currency,
                    )}
                  />
                  <RateRow
                    label="7. TDS @ 0.1%"
                    value={formatCurrency(
                      rateBreakup?.tdsAmount,
                      rateBreakup?.currency,
                    )}
                  />
                  <RateRow
                    label="(C) Tax deduction (6+7)"
                    value={formatCurrency(
                      rateBreakup?.taxDeductions,
                      rateBreakup?.currency,
                    )}
                    highlight
                  />
                </>
              )}

              <div className="bg-sky-50 border-t border-sky-100 px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-sky-800">
                    {isPackageRate
                      ? "Payable to property (A)"
                      : "Payable to property (A - B - C)"}
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-sky-900 tabular-nums">
                    {formatCurrency(
                      rateBreakup?.payableToHotel,
                      rateBreakup?.currency,
                    )}
                  </div>
                </div>
              </div>

              {(rateBreakup?.agentCommission != null ||
                rateBreakup?.agencyTier) && (
                <>
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-t border-gray-200">
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
                        rateBreakup?.currency,
                      )}
                    />
                  )}
                </>
              )}
            </div>
          </DetailCard>

          {/* Booking & policy */}
          <DetailCard
            icon={Tag}
            iconBg="bg-gray-50"
            iconColor="bg-gray-200 text-gray-600"
            title="Booking & policy"
          >
            <dl className="divide-y divide-gray-50">
              {booking.externalBookingId && (
                <DetailRow
                  label="External booking ID"
                  value={
                    <span className="font-mono text-sm">
                      {booking.externalBookingId}
                    </span>
                  }
                />
              )}
              <DetailRow label="Booked via" value={booking.bookedVia} />
              <DetailRow
                label="Booked on"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {booking.bookedOn}
                  </span>
                }
              />
              <DetailRow
                label="Cancellation policy"
                value={
                  booking.cancellationPolicy ? (
                    <span className="inline-flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {booking.cancellationPolicy}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </DetailCard>

          {/* Additional info for cancelled bookings */}
          {isCancelledBooking && (
            <DetailCard
              icon={Receipt}
              iconBg="bg-rose-50"
              iconColor="bg-rose-100 text-rose-600"
              title="Additional info"
            >
              <dl className="divide-y divide-gray-50">
                <DetailRow
                  label="Cancellation date-time"
                  value={
                    booking.cancellationDatetime ? (
                      <span className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {booking.cancellationDatetime}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow
                  label="Cancelled amount"
                  value={formatCurrency(booking.cancelAmount, rateBreakup?.currency)}
                />
                <DetailRow
                  label="Refund amount"
                  value={formatCurrency(booking.refundAmount, rateBreakup?.currency)}
                />
              </dl>
            </DetailCard>
          )}

          {/* Notes - full width if present */}
          {(booking.specialRequestByGuest || booking.internalNote) && (
            <div className="lg:col-span-2">
              <DetailCard
                icon={StickyNote}
                iconBg="bg-rose-50"
                iconColor="bg-rose-100 text-rose-600"
                title="Notes"
              >
                <dl className="divide-y divide-gray-50">
                  {booking.specialRequestByGuest && (
                    <DetailRow
                      label="Special request by guest"
                      value={booking.specialRequestByGuest}
                    />
                  )}
                  {booking.internalNote && (
                    <DetailRow
                      label="Internal note"
                      value={booking.internalNote}
                    />
                  )}
                </dl>
              </DetailCard>
            </div>
          )}
        </div>
      </div>

      <VoucherViewModal
        open={showVoucher}
        onClose={() => setShowVoucher(false)}
        bookingId={id ?? ""}
        bookingReference={booking.bookingId}
      />
    </>
  );
}
