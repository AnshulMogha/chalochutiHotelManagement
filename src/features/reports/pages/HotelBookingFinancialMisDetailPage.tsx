import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  BreakupRow,
  FINANCE_KPI_TONES,
  FinanceKpiCard,
  StatusBadge,
  bookingStatusTone,
  getHotelFinancialMisAgentPrice,
  getHotelFinancialMisDisplaySellingPrice,
  isHotelFinancialMisB2b,
  paymentStatusTone,
  readCachedFinancialMisRow,
  refundStatusTone,
} from "../components/hotelFinancialMisUi";
import {
  formatFinanceMoney,
  formatReportDate,
  formatReportDateTime,
  formatStatusLabel,
} from "../components/reportUiHelpers";
import type { HotelFinancialMisBookingRow } from "../services/hotelBookingFinancialMisService";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Copy,
  HandCoins,
  Landmark,
  MapPin,
  Receipt,
  RotateCcw,
  Target,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";

type DetailTab =
  | "overview"
  | "bookingDetails"
  | "customer"
  | "hotelPayout"
  | "otaRevenue"
  | "cancellation"
  | "payment";

const TABS: { value: DetailTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "bookingDetails", label: "Booking Details" },
  { value: "customer", label: "Customer Price" },
  { value: "hotelPayout", label: "Hotel Payout" },
  { value: "otaRevenue", label: "OTA Revenue" },
  { value: "cancellation", label: "Cancellation & Refund" },
  { value: "payment", label: "Payment Details" },
];

function CustomerOrAgentPriceBreakup({
  booking,
  detailed,
}: {
  booking: HotelFinancialMisBookingRow;
  detailed?: boolean;
}) {
  const isB2b = isHotelFinancialMisB2b(booking);
  const agentPrice = getHotelFinancialMisAgentPrice(booking);
  const paymentBreakup = booking.agentPaymentBreakup;
  const incentive = booking.agencyIncentive;

  const panel = (
    <Panel
      title={isB2b ? "Agent Price Breakup" : "Customer Price Breakup"}
      className={detailed && (paymentBreakup || incentive) ? undefined : "w-full"}
    >
      <BreakupRow
        label={detailed ? "Hotel base fare" : "Base room rate"}
        amount={booking.customerSellingPriceBreakup.baseFare}
      />
      <BreakupRow
        label="Hotel taxes / GST"
        amount={booking.customerSellingPriceBreakup.hotelGst}
      />
      <BreakupRow
        label="Service fee"
        amount={booking.customerSellingPriceBreakup.serviceFee}
      />
      <BreakupRow
        label="Service fee GST"
        amount={booking.customerSellingPriceBreakup.serviceFeeGst}
      />
      <BreakupRow
        label="Promotion discount"
        amount={booking.customerSellingPriceBreakup.promotionDiscount}
        negative
      />
      {isB2b ? (
        <>
          <BreakupRow
            label="Customer selling price"
            amount={
              paymentBreakup?.sellingPrice ??
              booking.customerSellingPriceBreakup.finalCustomerPrice
            }
          />
          <BreakupRow
            label="Agent net commission"
            amount={
              paymentBreakup?.netAgentCommission ?? booking.agentNetCommission
            }
            negative
          />
          <BreakupRow
            label="Final agent price"
            amount={agentPrice}
            bold
            highlight
          />
        </>
      ) : (
        <BreakupRow
          label="Final customer payable"
          amount={booking.customerSellingPriceBreakup.finalCustomerPrice}
          bold
          highlight
        />
      )}
    </Panel>
  );

  if (!detailed || (!paymentBreakup && !incentive)) {
    return panel;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {panel}
      <div className="space-y-4">
        {paymentBreakup ? (
          <Panel title="Agent payment breakup">
            <div className="space-y-1 p-4">
              <InfoLine
                label="Selling price"
                value={formatFinanceMoney(paymentBreakup.sellingPrice)}
              />
              <InfoLine
                label="Gross agent commission"
                value={formatFinanceMoney(paymentBreakup.grossAgentCommission)}
              />
              <InfoLine
                label="Agent TDS"
                value={formatFinanceMoney(paymentBreakup.agentTds)}
              />
              <InfoLine
                label="Net agent commission"
                value={formatFinanceMoney(paymentBreakup.netAgentCommission)}
              />
              <InfoLine
                label="Amount payable by agent"
                value={formatFinanceMoney(paymentBreakup.amountPayableByAgent)}
              />
            </div>
          </Panel>
        ) : null}
        {incentive ? (
          <Panel title="Agency incentive">
            <div className="space-y-1 p-4">
              <InfoLine
                label="Agency tier"
                value={
                  incentive.agencyTier
                    ? formatStatusLabel(incentive.agencyTier)
                    : "—"
                }
              />
              <InfoLine
                label="Incentive"
                value={
                  incentive.incentivePercent != null
                    ? `${incentive.incentivePercent}%${
                        incentive.incentiveType
                          ? ` · ${formatStatusLabel(incentive.incentiveType)}`
                          : ""
                      }`
                    : formatStatusLabel(incentive.incentiveType || "—")
                }
              />
              <InfoLine
                label="Category"
                value={
                  incentive.incentiveCategory
                    ? formatStatusLabel(incentive.incentiveCategory)
                    : "—"
                }
              />
              <InfoLine
                label="Gross amount"
                value={formatFinanceMoney(incentive.grossAmount)}
              />
              <InfoLine
                label="TDS"
                value={formatFinanceMoney(incentive.tds)}
              />
              <InfoLine
                label="Net amount"
                value={formatFinanceMoney(incentive.netAmount)}
              />
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function resolveTab(raw?: string | null): DetailTab {
  const value = String(raw || "overview").toLowerCase();
  if (value === "bookingdetails" || value === "booking")
    return "bookingDetails";
  if (value === "customer" || value === "customerprice" || value === "agentprice")
    return "customer";
  if (value === "hotelpayout" || value === "payout") return "hotelPayout";
  if (value === "otarevenue" || value === "ota") return "otaRevenue";
  if (value === "cancellation" || value === "refund") return "cancellation";
  if (value === "payment") return "payment";
  return "overview";
}

export default function HotelBookingFinancialMisDetailPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const stateBooking = (
    location.state as {
      booking?: HotelFinancialMisBookingRow;
      tab?: string;
    } | null
  )?.booking;
  const initialTab = resolveTab(
    (location.state as { tab?: string } | null)?.tab,
  );

  const booking = useMemo(() => {
    if (stateBooking) return stateBooking;
    const cached = readCachedFinancialMisRow<HotelFinancialMisBookingRow>();
    if (cached && String(cached.bookingId) === String(bookingId)) return cached;
    return null;
  }, [bookingId, stateBooking]);

  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [copied, setCopied] = useState(false);

  const copyRef = async () => {
    if (!booking?.bookingRef) return;
    try {
      await navigator.clipboard.writeText(booking.bookingRef);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Wallet className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Booking financials unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Open this booking from the Hotel Financial MIS list. Embedded
            breakups are provided with each list row in v1.
          </p>
          <Link
            to={ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to report
          </Link>
        </div>
      </div>
    );
  }

  const isB2b = isHotelFinancialMisB2b(booking);
  const displaySellingPrice = getHotelFinancialMisDisplaySellingPrice(booking);
  const detailTabs = TABS.map((item) =>
    item.value === "customer"
      ? { ...item, label: isB2b ? "Agent Price" : "Customer Price" }
      : item,
  );

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5">
        {/* Booking hero card */}
        <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS)
                  }
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                      {booking.bookingRef}
                    </h1>
                    <button
                      type="button"
                      onClick={() => void copyRef()}
                      className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50"
                      title="Copy booking ref"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {copied ? (
                      <span className="text-[11px] font-medium text-emerald-600">
                        Copied
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Booking ID: {booking.bookingId}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <StatusBadge
                  status={booking.bookingStatus}
                  tone={bookingStatusTone(booking.bookingStatus)}
                />
                <StatusBadge
                  status={booking.bookingSource}
                  tone="bg-sky-50 text-sky-700 ring-sky-200"
                />
                <StatusBadge
                  status={booking.paymentStatus}
                  tone={paymentStatusTone(booking.paymentStatus)}
                />
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
                  {booking.hotelCode || "—"}
                  {booking.hotelCity || booking.hotelState
                    ? ` · ${[booking.hotelCity, booking.hotelState]
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Stay
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatReportDate(booking.checkIn)} –{" "}
                  {formatReportDate(booking.checkOut)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {booking.nights} night{booking.nights === 1 ? "" : "s"}
                  {booking.rooms != null ? ` / ${booking.rooms} room(s)` : ""}
                  {booking.adult != null || booking.children != null
                    ? ` · ${booking.adult ?? 0}A${
                        booking.children ? `/${booking.children}C` : ""
                      }`
                    : ""}
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
                  {booking.customerName || "—"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Booked by {formatStatusLabel(booking.bookedBy)}
                  {booking.bookingRate
                    ? ` · ${formatStatusLabel(booking.bookingRate)}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Booking date
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatReportDate(booking.bookingDate)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Updated {formatReportDateTime(booking.lastUpdated)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          <FinanceKpiCard
            label={isB2b ? "Agent Price" : "Customer"}
            value={formatFinanceMoney(displaySellingPrice)}
            icon={CircleDollarSign}
            tone={FINANCE_KPI_TONES.customer}
            onClick={() => setTab("customer")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Collected"
            value={formatFinanceMoney(booking.amountCollected)}
            icon={HandCoins}
            tone={FINANCE_KPI_TONES.collected}
            onClick={() => setTab("payment")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Refund"
            value={formatFinanceMoney(booking.refundAmount)}
            icon={RotateCcw}
            tone={FINANCE_KPI_TONES.refund}
            onClick={() => setTab("cancellation")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Agent Commission"
            value={formatFinanceMoney(booking.agentCommission)}
            icon={Wallet}
            tone={FINANCE_KPI_TONES.outstanding}
            onClick={() => setTab("otaRevenue")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Hotel Payout"
            value={formatFinanceMoney(booking.hotelPayout)}
            icon={Landmark}
            tone={FINANCE_KPI_TONES.hotelPayout}
            onClick={() => setTab("hotelPayout")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="OTA Revenue"
            value={formatFinanceMoney(booking.otaRevenue)}
            icon={Target}
            tone={FINANCE_KPI_TONES.ota}
            onClick={() => setTab("otaRevenue")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="OTA Incl. GST"
            value={formatFinanceMoney(booking.otaRevenueInclusiveGst)}
            icon={CircleDollarSign}
            tone={FINANCE_KPI_TONES.margin}
            onClick={() => setTab("otaRevenue")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Cancel"
            value={formatFinanceMoney(booking.cancellationCharge)}
            icon={Receipt}
            tone={FINANCE_KPI_TONES.cancellation}
            onClick={() => setTab("cancellation")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Margin"
            value={formatFinanceMoney({
              amount:
                booking.customerSellingPrice.amount -
                booking.hotelPayout.amount,
              currency: booking.customerSellingPrice.currency,
            })}
            icon={TrendingUp}
            tone={FINANCE_KPI_TONES.margin}
          />
        </div>

        {/* Tabs */}
        <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm">
          <div className="flex min-w-max gap-1">
            {detailTabs.map((item) => (
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

        {tab === "bookingDetails" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Guest & stay">
              <div className="space-y-1 p-4">
                <InfoLine
                  label="Guest name"
                  value={booking.customerName || "—"}
                />
                <InfoLine
                  label="Adults"
                  value={booking.adult != null ? String(booking.adult) : "—"}
                />
                <InfoLine
                  label="Children"
                  value={
                    booking.children != null ? String(booking.children) : "—"
                  }
                />
                {booking.rooms != null ? (
                  <InfoLine label="Rooms" value={String(booking.rooms)} />
                ) : null}
                <InfoLine
                  label="Check-in"
                  value={formatReportDate(booking.checkIn)}
                />
                <InfoLine
                  label="Check-out"
                  value={formatReportDate(booking.checkOut)}
                />
                <InfoLine
                  label="Nights"
                  value={booking.nights != null ? String(booking.nights) : "—"}
                />
              </div>
            </Panel>

            <Panel title="Booking meta">
              <div className="space-y-1 p-4">
                <InfoLine
                  label="Booking ID"
                  value={String(booking.bookingId)}
                />
                <InfoLine
                  label="Booking ref"
                  value={booking.bookingRef || "—"}
                />
                <InfoLine
                  label="Booking date"
                  value={formatReportDate(booking.bookingDate)}
                />
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
                  <span className="text-sm text-slate-500">Booking status</span>
                  <StatusBadge
                    status={booking.bookingStatus}
                    tone={bookingStatusTone(booking.bookingStatus)}
                  />
                </div>
                {booking.bookingStatusRaw &&
                booking.bookingStatusRaw !== booking.bookingStatus ? (
                  <InfoLine
                    label="Status (raw)"
                    value={formatStatusLabel(booking.bookingStatusRaw)}
                  />
                ) : null}
                <InfoLine
                  label="Booking source"
                  value={formatStatusLabel(booking.bookingSource)}
                />
                <InfoLine
                  label="Booking rate"
                  value={
                    booking.bookingRate
                      ? formatStatusLabel(booking.bookingRate)
                      : "—"
                  }
                />
                <InfoLine
                  label="Booked by"
                  value={
                    booking.bookedBy ? formatStatusLabel(booking.bookedBy) : "—"
                  }
                />
                <InfoLine
                  label="Last updated"
                  value={formatReportDateTime(booking.lastUpdated)}
                />
              </div>
            </Panel>

            <Panel title="Hotel" className="lg:col-span-2">
              <div className="grid gap-x-6 p-4 sm:grid-cols-2">
                <InfoLine label="Hotel name" value={booking.hotelName || "—"} />
                <InfoLine label="Hotel code" value={booking.hotelCode || "—"} />
                <InfoLine label="City" value={booking.hotelCity || "—"} />
                <InfoLine label="State" value={booking.hotelState || "—"} />
                <div className="sm:col-span-2">
                  <InfoLine label="Hotel ID" value={booking.hotelId || "—"} />
                </div>
              </div>
            </Panel>
          </div>
        ) : null}

        {tab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <CustomerOrAgentPriceBreakup booking={booking} />
            <Panel title="Hotel Payout Breakup">
              <BreakupRow
                label="Original hotel base"
                amount={booking.hotelPayoutBreakup.originalHotelBaseRate}
              />
              <BreakupRow
                label="Original hotel GST"
                amount={booking.hotelPayoutBreakup.originalHotelGst}
              />
              <BreakupRow
                label="Hotel base amount"
                amount={booking.hotelPayoutBreakup.hotelBaseRate}
              />
              <BreakupRow
                label="Hotel GST"
                amount={booking.hotelPayoutBreakup.hotelGst}
              />
              <BreakupRow
                label="OTA commission"
                amount={booking.hotelPayoutBreakup.otaCommission}
                negative
              />
              <BreakupRow
                label="OTA commission GST"
                amount={booking.hotelPayoutBreakup.otaCommissionGst}
                negative
              />
              <BreakupRow
                label="TDS"
                amount={booking.hotelPayoutBreakup.tds}
                negative
              />
              <BreakupRow
                label="TCS"
                amount={booking.hotelPayoutBreakup.tcs}
                negative
              />
              <BreakupRow
                label="Final hotel payout"
                amount={booking.hotelPayoutBreakup.finalHotelPayout}
                bold
                highlight
              />
            </Panel>
            <Panel title="OTA Revenue Breakup">
              <BreakupRow
                label="Commission"
                amount={booking.otaRevenueBreakup.commission}
              />
              <BreakupRow
                label="Commission GST"
                amount={booking.otaRevenueBreakup.commissionGst}
              />
              <BreakupRow
                label="Markup"
                amount={booking.otaRevenueBreakup.markup}
              />
              <BreakupRow
                label="Service fee"
                amount={booking.otaRevenueBreakup.serviceFee}
              />
              <BreakupRow
                label="Service fee GST"
                amount={booking.otaRevenueBreakup.serviceFeeGst}
              />
              <BreakupRow
                label="Cancellation income"
                amount={booking.otaRevenueBreakup.cancellationIncome}
              />
              <BreakupRow
                label="Agency commission"
                amount={booking.otaRevenueBreakup.agencyCommission}
                negative
              />
              <BreakupRow
                label="Refund adjustment"
                amount={booking.otaRevenueBreakup.refundAdjustment}
                negative
              />
              <BreakupRow
                label="Net OTA revenue"
                amount={booking.otaRevenueBreakup.netOtaRevenue}
                bold
                highlight
              />
              <BreakupRow
                label="Net OTA GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueGst}
              />
              <BreakupRow
                label="Net OTA incl. GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueInclusiveGst}
                bold
              />
            </Panel>
            <Panel title="Booking Summary" className="lg:col-span-2">
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                <InfoLine
                  label="Booking source"
                  value={formatStatusLabel(booking.bookingSource)}
                />
                <InfoLine
                  label="Booking rate"
                  value={formatStatusLabel(booking.bookingRate || "—")}
                />
                <InfoLine
                  label="Booked by"
                  value={formatStatusLabel(booking.bookedBy)}
                />
                <InfoLine
                  label="Payment status"
                  value={formatStatusLabel(booking.paymentStatus)}
                />
                <InfoLine
                  label="Refund status"
                  value={formatStatusLabel(booking.refundStatus)}
                />
                <InfoLine
                  label={isB2b ? "Agent price" : "Customer payable"}
                  value={formatFinanceMoney(displaySellingPrice)}
                />
                <InfoLine
                  label="Collected"
                  value={formatFinanceMoney(booking.amountCollected)}
                />
                {isB2b ? (
                  <InfoLine
                    label="Customer selling price"
                    value={formatFinanceMoney(booking.customerSellingPrice)}
                  />
                ) : null}
                <InfoLine
                  label="Agent commission"
                  value={formatFinanceMoney(booking.agentCommission)}
                />
                <InfoLine
                  label="Commission"
                  value={formatFinanceMoney(booking.commission)}
                />
                <InfoLine
                  label="Commission GST"
                  value={formatFinanceMoney(booking.commissionGst)}
                />
                <InfoLine
                  label="OTA revenue incl. GST"
                  value={formatFinanceMoney(booking.otaRevenueInclusiveGst)}
                />
              </div>
            </Panel>
            <Panel title="Cancellation & Refund">
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600">Refund status</span>
                  <StatusBadge
                    status={booking.refundStatus}
                    tone={refundStatusTone(booking.refundStatus)}
                  />
                </div>
                <InfoLine
                  label="Cancellation charge"
                  value={formatFinanceMoney(booking.cancellationCharge)}
                />
                <InfoLine
                  label="Refund amount"
                  value={formatFinanceMoney(booking.refundAmount)}
                />
              </div>
            </Panel>
          </div>
        ) : null}

        {tab === "customer" ? (
          <CustomerOrAgentPriceBreakup booking={booking} detailed />
        ) : null}

        {tab === "hotelPayout" ? (
          <div
            className={cn(
              "grid gap-4",
              (booking.agencyIncentive || booking.agentPaymentBreakup) &&
                "lg:grid-cols-2",
            )}
          >
            <Panel
              title="Hotel Payout Breakup"
              className={
                booking.agencyIncentive || booking.agentPaymentBreakup
                  ? undefined
                  : "w-full"
              }
            >
              <BreakupRow
                label="Original hotel base"
                amount={booking.hotelPayoutBreakup.originalHotelBaseRate}
              />
              <BreakupRow
                label="Original hotel GST"
                amount={booking.hotelPayoutBreakup.originalHotelGst}
              />
              <BreakupRow
                label="Hotel base amount"
                amount={booking.hotelPayoutBreakup.hotelBaseRate}
              />
              <BreakupRow
                label="Hotel taxes / GST"
                amount={booking.hotelPayoutBreakup.hotelGst}
              />
              <BreakupRow
                label="OTA commission"
                amount={booking.hotelPayoutBreakup.otaCommission}
                negative
              />
              <BreakupRow
                label="OTA commission GST"
                amount={booking.hotelPayoutBreakup.otaCommissionGst}
                negative
              />
              <BreakupRow
                label="Commission incl. GST"
                amount={booking.hotelPayoutBreakup.otaCommissionInclusiveGst}
              />
              <BreakupRow
                label="TDS"
                amount={booking.hotelPayoutBreakup.tds}
                negative
              />
              <BreakupRow
                label="TCS"
                amount={booking.hotelPayoutBreakup.tcs}
                negative
              />
              <BreakupRow
                label="Final hotel payout"
                amount={booking.hotelPayoutBreakup.finalHotelPayout}
                bold
                highlight
              />
            </Panel>
            {booking.agencyIncentive || booking.agentPaymentBreakup ? (
              <div className="space-y-4">
                {booking.agencyIncentive ? (
                  <Panel title="Agency incentive">
                    <div className="space-y-1 p-3">
                      <InfoLine
                        label="Agency tier"
                        value={
                          booking.agencyIncentive.agencyTier
                            ? formatStatusLabel(
                                booking.agencyIncentive.agencyTier,
                              )
                            : "—"
                        }
                      />
                      <InfoLine
                        label="Incentive"
                        value={
                          booking.agencyIncentive.incentivePercent != null
                            ? `${booking.agencyIncentive.incentivePercent}%`
                            : "—"
                        }
                      />
                      <InfoLine
                        label="Category"
                        value={
                          booking.agencyIncentive.incentiveCategory
                            ? formatStatusLabel(
                                booking.agencyIncentive.incentiveCategory,
                              )
                            : "—"
                        }
                      />
                      <InfoLine
                        label="Gross"
                        value={formatFinanceMoney(
                          booking.agencyIncentive.grossAmount,
                        )}
                      />
                      <InfoLine
                        label="TDS"
                        value={formatFinanceMoney(booking.agencyIncentive.tds)}
                      />
                      <InfoLine
                        label="Net"
                        value={formatFinanceMoney(
                          booking.agencyIncentive.netAmount,
                        )}
                      />
                    </div>
                  </Panel>
                ) : null}
                {booking.agentPaymentBreakup ? (
                  <Panel title="Agent payment breakup">
                    <div className="space-y-1 p-3">
                      <InfoLine
                        label="Selling price"
                        value={formatFinanceMoney(
                          booking.agentPaymentBreakup.sellingPrice,
                        )}
                      />
                      <InfoLine
                        label="Gross commission"
                        value={formatFinanceMoney(
                          booking.agentPaymentBreakup.grossAgentCommission,
                        )}
                      />
                      <InfoLine
                        label="Agent TDS"
                        value={formatFinanceMoney(
                          booking.agentPaymentBreakup.agentTds,
                        )}
                      />
                      <InfoLine
                        label="Net commission"
                        value={formatFinanceMoney(
                          booking.agentPaymentBreakup.netAgentCommission,
                        )}
                      />
                      <InfoLine
                        label="Payable by agent"
                        value={formatFinanceMoney(
                          booking.agentPaymentBreakup.amountPayableByAgent,
                        )}
                      />
                    </div>
                  </Panel>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "otaRevenue" ? (
          <div className="w-full">
            <Panel title="OTA Revenue Breakup" className="w-full">
              <BreakupRow
                label="Hotel commission"
                amount={booking.otaRevenueBreakup.commission}
              />
              <BreakupRow
                label="Commission GST"
                amount={booking.otaRevenueBreakup.commissionGst}
              />
              <BreakupRow
                label="Commission incl. GST"
                amount={booking.otaRevenueBreakup.commissionInclusiveGst}
              />
              <BreakupRow
                label="OTA markup"
                amount={booking.otaRevenueBreakup.markup}
              />
              <BreakupRow
                label="Service fee"
                amount={booking.otaRevenueBreakup.serviceFee}
              />
              <BreakupRow
                label="Service fee GST"
                amount={booking.otaRevenueBreakup.serviceFeeGst}
              />
              <BreakupRow
                label="Cancellation income"
                amount={booking.otaRevenueBreakup.cancellationIncome}
              />
              <BreakupRow
                label="Agency commission"
                amount={booking.otaRevenueBreakup.agencyCommission}
                negative
              />
              <BreakupRow
                label="Refund adjustment"
                amount={booking.otaRevenueBreakup.refundAdjustment}
                negative
              />
              <BreakupRow
                label="Net OTA revenue"
                amount={booking.otaRevenueBreakup.netOtaRevenue}
                bold
                highlight
              />
              <BreakupRow
                label="Net OTA GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueGst}
              />
              <BreakupRow
                label="Net OTA incl. GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueInclusiveGst}
                bold
              />
            </Panel>
          </div>
        ) : null}

        {tab === "cancellation" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Cancellation & Refund">
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Refund status</span>
                  <StatusBadge
                    status={booking.refundStatus}
                    tone={refundStatusTone(booking.refundStatus)}
                  />
                </div>
                <InfoLine
                  label="Original booking amount"
                  value={formatFinanceMoney(booking.customerSellingPrice)}
                />
                <InfoLine
                  label="Cancellation charge"
                  value={formatFinanceMoney(booking.cancellationCharge)}
                />
                <InfoLine
                  label="Refund amount"
                  value={formatFinanceMoney(booking.refundAmount)}
                />
                <InfoLine
                  label="Cancelled by"
                  value={formatStatusLabel(booking.cancelledBy || "—")}
                />
                <InfoLine
                  label="Cancellation reason"
                  value={booking.cancellationReason || "—"}
                />
                <InfoLine
                  label="Cancelled at"
                  value={formatReportDateTime(booking.cancellationDateTime)}
                />
                <InfoLine
                  label="Refunded at"
                  value={formatReportDateTime(booking.refundDateTime)}
                />
              </div>
            </Panel>
            <div className="space-y-4">
              <Panel title="Payment impact">
                <div className="space-y-3 p-4">
                  <InfoLine
                    label="Collected"
                    value={formatFinanceMoney(booking.amountCollected)}
                  />
                  <InfoLine
                    label="Payment status"
                    value={formatStatusLabel(booking.paymentStatus)}
                  />
                  <InfoLine
                    label="Payment method"
                    value={formatStatusLabel(
                      booking.payment?.paymentMethod || "—",
                    )}
                  />
                </div>
              </Panel>
              {booking.cancellationPolicyLines.length > 0 ? (
                <Panel title="Cancellation policy">
                  <ul className="space-y-2 p-4 text-sm text-slate-700">
                    {booking.cancellationPolicyLines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "payment" ? (
          <div
            className={cn(
              "grid gap-4",
              (booking.payment?.payments?.length ?? 0) > 0 && "lg:grid-cols-2",
            )}
          >
            <Panel
              title="Payment summary"
              className={
                (booking.payment?.payments?.length ?? 0) > 0
                  ? undefined
                  : "w-full"
              }
            >
              <div className="space-y-3 p-4">
                <InfoLine
                  label={isB2b ? "Agent price" : "Customer payable"}
                  value={formatFinanceMoney(displaySellingPrice)}
                />
                <InfoLine
                  label="Collected"
                  value={formatFinanceMoney(booking.amountCollected)}
                />
                <InfoLine
                  label="Refunded"
                  value={formatFinanceMoney(booking.refundAmount)}
                />
                <InfoLine
                  label="Agent commission"
                  value={formatFinanceMoney(booking.agentCommission)}
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-slate-600">Payment status</span>
                  <StatusBadge
                    status={booking.paymentStatus}
                    tone={paymentStatusTone(booking.paymentStatus)}
                  />
                </div>
                <InfoLine
                  label="Gateway status"
                  value={formatStatusLabel(booking.payment?.status || "—")}
                />
                {(booking.payment?.payments?.length ?? 0) === 0 ? (
                  <>
                    <InfoLine
                      label="Payment method"
                      value={formatStatusLabel(
                        booking.payment?.paymentMethod || "—",
                      )}
                    />
                    <InfoLine
                      label="Transaction ID"
                      value={booking.payment?.paymentTransactionId || "—"}
                    />
                    <InfoLine
                      label="Payment time"
                      value={formatReportDateTime(booking.payment?.paymentTime)}
                    />
                  </>
                ) : null}
              </div>
            </Panel>
            {(booking.payment?.payments?.length ?? 0) > 0 ? (
              <Panel title="Payment transactions">
                <div className="divide-y divide-slate-100">
                  {booking.payment!.payments.map((entry, index) => (
                    <div
                      key={`${entry.paymentTransactionId}-${index}`}
                      className="space-y-2 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {formatFinanceMoney(entry.amount)}
                        </span>
                        <StatusBadge
                          status={entry.status}
                          tone={paymentStatusTone(
                            entry.status === "SUCCESS" ? "PAID" : entry.status,
                          )}
                        />
                      </div>
                      <InfoLine
                        label="Method"
                        value={formatStatusLabel(entry.paymentMethod || "—")}
                      />
                      <InfoLine
                        label="Txn ID"
                        value={entry.paymentTransactionId || "—"}
                      />
                      <InfoLine
                        label="Time"
                        value={formatReportDateTime(entry.paymentTime)}
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}
