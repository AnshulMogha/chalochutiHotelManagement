import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import {
  AgentPaymentBreakupLedger,
  BreakupRow,
  FINANCE_KPI_TONES,
  FinanceKpiCard,
  StatusBadge,
  bookingStatusTone,
  BookedByOwnerDisplay,
  formatBookedByLabel,
  getHotelFinancialMisAgentPrice,
  getHotelFinancialMisAgentCustomerSellingPrice,
  getHotelFinancialMisDisplayOta,
  getHotelFinancialMisDisplaySellingPrice,
  hasHotelFinancialMisAgencyDetails,
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

function isCancelledFinancialMisBooking(
  status: string | null | undefined,
): boolean {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .includes("CANCEL");
}

function formatMisPercent(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  const rounded = Number(value);
  const shown = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, "");
  return `${shown}%`;
}

function hotelMisKpiHints(
  booking: HotelFinancialMisBookingRow,
): Record<string, string> {
  const isCancelled = isCancelledFinancialMisBooking(booking.bookingStatus);
  const netAccLabel = isCancelled
    ? "Net Accommodation after cancellation"
    : "Net Accommodation";

  return {
    collected: isHotelFinancialMisB2b(booking)
      ? "Agent price"
      : "Customer selling price",
    agentPrice: "Platform customer price − Agent net commission",
    agentComm: "Gross commission payable to the agent",
    agentTds: "2% of Agent commission",
    agentNet: "Agent commission − Agent TDS",
    tds: `0.1% of ${netAccLabel}`,
    tcs: `0.5% of ${netAccLabel}`,
    hotelPayout:
      "Hotel Base + Hotel GST − OTA Commission − GST on Commission − TCS − TDS",
    otaIncl: "OTA Revenue + Net OTA GST",
  };
}

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
  showCalc,
}: {
  booking: HotelFinancialMisBookingRow;
  detailed?: boolean;
  showCalc?: boolean;
}) {
  const isB2b = isHotelFinancialMisB2b(booking);
  const agentPrice = getHotelFinancialMisAgentPrice(booking);
  const agentCustomerSellingPrice =
    getHotelFinancialMisAgentCustomerSellingPrice(booking);
  const agentSellingMarkupAmount = booking.agentSellingMarkupAmount ?? {
    amount: 0,
    currency: booking.customerSellingPrice.currency,
  };
  const agentSellingGst = booking.agentSellingGst ?? {
    amount: 0,
    currency: booking.customerSellingPrice.currency,
  };
  const paymentBreakup = isB2b ? booking.agentPaymentBreakup : null;
  const incentive = hasHotelFinancialMisAgencyDetails(booking)
    ? booking.agencyIncentive
    : null;

  const panel = (
    <Panel
      title={isB2b ? "Agent Price Breakup" : "Customer Price Breakup"}
      className={
        detailed && (paymentBreakup || incentive) ? undefined : "w-full"
      }
    >
      <BreakupRow
        tag={showCalc ? "A" : undefined}
        label={detailed ? "Hotel base fare" : "Base room rate"}
        amount={booking.customerSellingPriceBreakup.baseFare}
        positive
      />
      <BreakupRow
        tag={showCalc ? "B" : undefined}
        label="Promotion discount"
        amount={booking.customerSellingPriceBreakup.promotionDiscount}
        negative
      />
      <BreakupRow
        tag={showCalc ? "C" : undefined}
        formula={showCalc ? "A − B" : undefined}
        label="Net Accommodation"
        amount={{
          amount:
            booking.customerSellingPriceBreakup.baseFare.amount -
            booking.customerSellingPriceBreakup.promotionDiscount.amount,
          currency: booking.customerSellingPriceBreakup.baseFare.currency,
        }}
        positive
      />
      <BreakupRow
        tag={showCalc ? "D" : undefined}
        label="Hotel taxes / GST"
        amount={booking.customerSellingPriceBreakup.hotelGst}
        positive
      />
      <BreakupRow
        tag={showCalc ? "E" : undefined}
        label="Service fee"
        amount={booking.customerSellingPriceBreakup.serviceFee}
        positive
      />
      <BreakupRow
        tag={showCalc ? "F" : undefined}
        label="Service fee GST"
        amount={booking.customerSellingPriceBreakup.serviceFeeGst}
        positive
      />
      {isB2b ? (
        <>
          <BreakupRow
            tag={showCalc ? "G" : undefined}
            formula={showCalc ? "C + D + E + F" : undefined}
            label="Platform customer price"
            amount={booking.customerSellingPrice}
            positive
          />
          <BreakupRow
            tag={showCalc ? "H" : undefined}
            label="Agent net commission"
            amount={
              paymentBreakup?.netAgentCommission ?? booking.agentNetCommission
            }
            negative
          />
          <BreakupRow
            tag={showCalc ? "I" : undefined}
            formula={showCalc ? "G − H" : undefined}
            label="Final agent price"
            amount={agentPrice}
            bold
            highlight
          />
          <BreakupRow
            tag={showCalc ? "J" : undefined}
            label="Agent selling markup"
            amount={agentSellingMarkupAmount}
            positive
          />
          <BreakupRow
            tag={showCalc ? "K" : undefined}
            label="Agent selling GST"
            amount={agentSellingGst}
            positive
          />
          <BreakupRow
            tag={showCalc ? "L" : undefined}
            formula={showCalc ? "I + J + K" : undefined}
            label="Agent customer selling price"
            amount={
              agentCustomerSellingPrice ??
              booking.customerSellingPriceBreakup.finalCustomerPrice
            }
            bold
            highlight
          />
        </>
      ) : (
        <BreakupRow
          tag={showCalc ? "G" : undefined}
          formula={showCalc ? "C + D + E + F" : undefined}
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
            <AgentPaymentBreakupLedger
              breakup={paymentBreakup}
              agentCustomerSellingPrice={agentCustomerSellingPrice}
            />
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
              <BreakupRow
                tag="A"
                label="Gross amount"
                amount={incentive.grossAmount}
                positive
              />
              <BreakupRow tag="B" label="TDS" amount={incentive.tds} />
              <BreakupRow
                tag="C"
                formula="A − B"
                label="Net amount"
                amount={incentive.netAmount}
                bold
                highlight
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
  if (
    value === "customer" ||
    value === "customerprice" ||
    value === "agentprice"
  )
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
  const isCancelled = isCancelledFinancialMisBooking(booking.bookingStatus);
  const displaySellingPrice = getHotelFinancialMisDisplaySellingPrice(booking);
  const displayOta = getHotelFinancialMisDisplayOta(booking);
  const kpiHints = hotelMisKpiHints(booking);
  const agentCustomerSellingPrice =
    getHotelFinancialMisAgentCustomerSellingPrice(booking);
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
                  label="Booking"
                  tone={bookingStatusTone(booking.bookingStatus)}
                />
                <StatusBadge
                  status={booking.bookingSource}
                  label="Source"
                  tone="bg-sky-50 text-sky-700 ring-sky-200"
                />
                <StatusBadge
                  status={booking.bookingRate || "—"}
                  label="Rate"
                  tone="bg-violet-50 text-violet-700 ring-violet-200"
                />
                <StatusBadge
                  status={booking.paymentStatus}
                  label="Payment"
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
                  {booking.bookingOwner ? (
                    <>
                      {booking.bookingOwner.name}
                      {booking.bookingOwner.email
                        ? ` · ${booking.bookingOwner.email}`
                        : ""}
                    </>
                  ) : (
                    <>
                      Booked by {formatBookedByLabel(booking.bookedBy)}
                      {booking.bookingRate
                        ? ` · ${formatStatusLabel(booking.bookingRate)}`
                        : ""}
                    </>
                  )}
                </p>
                {booking.bookingOwner?.agencyName ? (
                  <p className="truncate text-[11px] font-semibold text-slate-900">
                    Agency · {booking.bookingOwner.agencyName}
                  </p>
                ) : null}
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
        <div className="mb-3 grid grid-cols-3 gap-1.5 overflow-visible sm:grid-cols-5 lg:grid-cols-6 [&>*:nth-child(3n)_.kpi-hint]:left-auto [&>*:nth-child(3n)_.kpi-hint]:right-full [&>*:nth-child(3n)_.kpi-hint]:mr-2 [&>*:nth-child(3n)_.kpi-hint]:ml-0 sm:[&>*:nth-child(3n)_.kpi-hint]:left-full sm:[&>*:nth-child(3n)_.kpi-hint]:right-auto sm:[&>*:nth-child(3n)_.kpi-hint]:ml-2 sm:[&>*:nth-child(3n)_.kpi-hint]:mr-0 sm:[&>*:nth-child(5n)_.kpi-hint]:left-auto sm:[&>*:nth-child(5n)_.kpi-hint]:right-full sm:[&>*:nth-child(5n)_.kpi-hint]:mr-2 sm:[&>*:nth-child(5n)_.kpi-hint]:ml-0 lg:[&>*:nth-child(5n)_.kpi-hint]:left-full lg:[&>*:nth-child(5n)_.kpi-hint]:right-auto lg:[&>*:nth-child(5n)_.kpi-hint]:ml-2 lg:[&>*:nth-child(5n)_.kpi-hint]:mr-0 lg:[&>*:nth-child(6n)_.kpi-hint]:left-auto lg:[&>*:nth-child(6n)_.kpi-hint]:right-full lg:[&>*:nth-child(6n)_.kpi-hint]:mr-2 lg:[&>*:nth-child(6n)_.kpi-hint]:ml-0">
          {isB2b ? (
            <FinanceKpiCard
              label="Platform customer price"
              value={formatFinanceMoney(booking.customerSellingPrice)}
              icon={CircleDollarSign}
              tone={FINANCE_KPI_TONES.customer}
              onClick={() => setTab("customer")}
              actionLabel=""
            />
          ) : null}
          <FinanceKpiCard
            label={isB2b ? "Agent Price" : "Customer selling price"}
            value={formatFinanceMoney(displaySellingPrice)}
            hint={isB2b ? kpiHints.agentPrice : undefined}
            icon={CircleDollarSign}
            tone={FINANCE_KPI_TONES.customer}
            onClick={() => setTab("customer")}
            actionLabel=""
          />
          <FinanceKpiCard
            label={
              isCancelled
                ? "Net Accommodation after cancellation"
                : "Net Accommodation"
            }
            value={formatFinanceMoney(
              isCancelled
                ? booking.hotelPayoutBreakup.hotelBaseRate
                : {
                    amount:
                      booking.customerSellingPriceBreakup.baseFare.amount -
                      booking.customerSellingPriceBreakup.promotionDiscount
                        .amount,
                    currency:
                      booking.customerSellingPriceBreakup.baseFare.currency,
                  },
            )}
            icon={Building2}
            tone={FINANCE_KPI_TONES.hotelPayout}
            onClick={() => setTab(isCancelled ? "hotelPayout" : "customer")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Collected"
            value={formatFinanceMoney(booking.amountCollected)}
            hint={kpiHints.collected}
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
          {isB2b ? (
            <>
              <FinanceKpiCard
                label="Agent Commission"
                value={formatFinanceMoney(booking.agentCommission)}
                hint={kpiHints.agentComm}
                icon={Wallet}
                tone={FINANCE_KPI_TONES.outstanding}
                onClick={() => setTab("otaRevenue")}
                actionLabel=""
              />
              <FinanceKpiCard
                label="Agent TDS"
                value={formatFinanceMoney(booking.agentTdsAmount)}
                hint={kpiHints.agentTds}
                icon={Wallet}
                tone={FINANCE_KPI_TONES.margin}
                onClick={() => setTab("customer")}
                actionLabel=""
              />
              <FinanceKpiCard
                label="Agent Net Comm."
                value={formatFinanceMoney(booking.agentNetCommission)}
                hint={kpiHints.agentNet}
                icon={Wallet}
                tone={FINANCE_KPI_TONES.outstanding}
                onClick={() => setTab("customer")}
                actionLabel=""
              />
            </>
          ) : null}
          <FinanceKpiCard
            label="Hotel Payout"
            value={formatFinanceMoney(booking.hotelPayout)}
            hint={kpiHints.hotelPayout}
            icon={Landmark}
            tone={FINANCE_KPI_TONES.hotelPayout}
            onClick={() => setTab("hotelPayout")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="TDS"
            value={formatFinanceMoney(booking.tds)}
            hint={kpiHints.tds}
            icon={Landmark}
            tone={FINANCE_KPI_TONES.margin}
            onClick={() => setTab("hotelPayout")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="TCS"
            value={formatFinanceMoney(booking.tcs)}
            hint={kpiHints.tcs}
            icon={Landmark}
            tone={FINANCE_KPI_TONES.outstanding}
            onClick={() => setTab("hotelPayout")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="OTA Revenue"
            value={formatFinanceMoney(displayOta.otaRevenue)}
            sub={
              isCancelled
                ? "After cancellation"
                : booking.commission.rateLabel?.trim() ||
                  booking.otaRevenueBreakup.commission.rateLabel?.trim() ||
                  (booking.commission.ratePercent != null
                    ? `${booking.commission.ratePercent}%`
                    : undefined)
            }
            icon={Target}
            tone={FINANCE_KPI_TONES.ota}
            onClick={() => setTab("otaRevenue")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="Net OTA GST"
            value={formatFinanceMoney(displayOta.otaRevenueGst)}
            icon={Receipt}
            tone={FINANCE_KPI_TONES.margin}
            onClick={() => setTab("otaRevenue")}
            actionLabel=""
          />
          <FinanceKpiCard
            label="OTA Incl. GST"
            value={formatFinanceMoney(displayOta.otaRevenueInclusiveGst)}
            hint={kpiHints.otaIncl}
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

            <Panel title="Booking info">
              <div className="space-y-1 p-4">
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
                    <BookedByOwnerDisplay
                      owner={booking.bookingOwner}
                      fallback={booking.bookedBy}
                    />
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
            <CustomerOrAgentPriceBreakup booking={booking} showCalc />
            <Panel title="Hotel Payout Breakup">
              <BreakupRow
                tag="A"
                label="Original hotel base"
                amount={booking.hotelPayoutBreakup.originalHotelBaseRate}
                positive
              />
              {isCancelledFinancialMisBooking(booking.bookingStatus) ? (
                <BreakupRow
                  tag="B"
                  label="Original hotel GST"
                  amount={booking.hotelPayoutBreakup.originalHotelGst}
                  positive
                />
              ) : null}
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "C"
                    : "B"
                }
                label="Promotion discount"
                amount={booking.promotionDiscount}
                negative
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "D"
                    : "C"
                }
                formula={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? undefined
                    : "A − B"
                }
                label={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "Net Accommodation after cancellation"
                    : "Net Accommodation"
                }
                amount={booking.hotelPayoutBreakup.hotelBaseRate}
                positive
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "E"
                    : "D"
                }
                label="Hotel GST"
                amount={booking.hotelPayoutBreakup.hotelGst}
                positive
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "F"
                    : "E"
                }
                formula={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "D + E"
                    : "C + D"
                }
                label="Total gross amount"
                amount={booking.hotelPayoutBreakup.totalGrossAmount}
                positive
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "G"
                    : "F"
                }
                label="OTA commission"
                amount={booking.hotelPayoutBreakup.otaCommission}
                negative
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "H"
                    : "G"
                }
                label="OTA commission GST"
                amount={booking.hotelPayoutBreakup.otaCommissionGst}
                negative
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "I"
                    : "H"
                }
                formula={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "0.1% of D"
                    : "0.1% of C"
                }
                label="TDS"
                amount={booking.hotelPayoutBreakup.tds}
                negative
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "J"
                    : "I"
                }
                formula={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "0.5% of D"
                    : "0.5% of C"
                }
                label="TCS"
                amount={booking.hotelPayoutBreakup.tcs}
                negative
              />
              <BreakupRow
                tag={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "K"
                    : "J"
                }
                formula={
                  isCancelledFinancialMisBooking(booking.bookingStatus)
                    ? "F − G − H − I − J"
                    : "E − F − G − H − I"
                }
                label="Final hotel payout"
                amount={booking.hotelPayoutBreakup.finalHotelPayout}
                bold
                highlight
              />
            </Panel>
            <Panel title="OTA Revenue Breakup">
              <BreakupRow
                tag="A"
                label="OTA Commission"
                amount={booking.otaRevenueBreakup.commission}
                positive
              />
              <BreakupRow
                tag="B"
                label="OTA Commission GST"
                amount={booking.otaRevenueBreakup.commissionGst}
                positive
              />
              <BreakupRow
                tag="C"
                label="Markup"
                amount={booking.otaRevenueBreakup.markup}
                positive
              />
              <BreakupRow
                tag="D"
                label="Service fee"
                amount={booking.otaRevenueBreakup.serviceFee}
                positive
              />
              <BreakupRow
                tag="E"
                label="Service fee GST"
                amount={booking.otaRevenueBreakup.serviceFeeGst}
                positive
              />
              <BreakupRow
                tag="F"
                label="Cancellation income"
                amount={booking.otaRevenueBreakup.cancellationIncome}
                positive
              />
              {isB2b ? (
                <BreakupRow
                  tag="G"
                  label="Agency commission"
                  amount={booking.otaRevenueBreakup.agencyCommission}
                  negative
                />
              ) : null}
              <BreakupRow
                tag={isB2b ? "H" : "G"}
                label="Refund adjustment"
                amount={booking.otaRevenueBreakup.refundAdjustment}
                negative
              />
              <BreakupRow
                tag={isB2b ? "I" : "H"}
                formula={isB2b ? "A + C + D + F − G − H" : "A + C + D + F − G"}
                label="Net OTA revenue"
                amount={booking.otaRevenueBreakup.netOtaRevenue}
                bold
                highlight
              />
              <BreakupRow
                tag={isB2b ? "J" : "I"}
                formula="B + E"
                label="Net OTA GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueGst}
                positive
              />
              <BreakupRow
                tag={isB2b ? "K" : "J"}
                formula={isB2b ? "I + J" : "H + I"}
                label="Net OTA incl. GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueInclusiveGst}
                bold
              />
            </Panel>
          </div>
        ) : null}

        {tab === "customer" ? (
          <CustomerOrAgentPriceBreakup booking={booking} detailed showCalc />
        ) : null}

        {tab === "hotelPayout" ? (
          <div className="w-full">
            <Panel title="Hotel Payout Breakup" className="w-full">
              <BreakupRow
                tag="A"
                label="Original hotel base"
                amount={booking.hotelPayoutBreakup.originalHotelBaseRate}
                positive
              />
              {isCancelled ? (
                <BreakupRow
                  tag="B"
                  label="Original hotel GST"
                  amount={booking.hotelPayoutBreakup.originalHotelGst}
                  positive
                />
              ) : null}
              <BreakupRow
                tag={isCancelled ? "C" : "B"}
                label="Promotion discount"
                amount={booking.promotionDiscount}
                negative
              />
              <BreakupRow
                tag={isCancelled ? "D" : "C"}
                formula={isCancelled ? undefined : "A − B"}
                label={
                  isCancelled
                    ? "Net Accommodation after cancellation"
                    : "Net Accommodation"
                }
                amount={booking.hotelPayoutBreakup.hotelBaseRate}
                positive
              />
              <BreakupRow
                tag={isCancelled ? "E" : "D"}
                label="Hotel GST"
                amount={booking.hotelPayoutBreakup.hotelGst}
                positive
              />
              <BreakupRow
                tag={isCancelled ? "F" : "E"}
                formula={isCancelled ? "D + E" : "C + D"}
                label="Total gross amount"
                amount={booking.hotelPayoutBreakup.totalGrossAmount}
                positive
              />
              <BreakupRow
                tag={isCancelled ? "G" : "F"}
                label="OTA commission"
                amount={booking.hotelPayoutBreakup.otaCommission}
                negative
              />
              <BreakupRow
                tag={isCancelled ? "H" : "G"}
                label="OTA commission GST"
                amount={booking.hotelPayoutBreakup.otaCommissionGst}
                negative
              />
              <BreakupRow
                tag={isCancelled ? "I" : "H"}
                formula={isCancelled ? "G + H" : "F + G"}
                label="Commission incl. GST"
                amount={booking.hotelPayoutBreakup.otaCommissionInclusiveGst}
              />
              <BreakupRow
                tag={isCancelled ? "J" : "I"}
                formula={isCancelled ? "0.1% of D" : "0.1% of C"}
                label="TDS"
                amount={booking.hotelPayoutBreakup.tds}
                negative
              />
              <BreakupRow
                tag={isCancelled ? "K" : "J"}
                formula={isCancelled ? "0.5% of D" : "0.5% of C"}
                label="TCS"
                amount={booking.hotelPayoutBreakup.tcs}
                negative
              />
              <BreakupRow
                tag={isCancelled ? "L" : "K"}
                formula={
                  isCancelled ? "F − G − H − J − K" : "E − F − G − I − J"
                }
                label="Final hotel payout"
                amount={booking.hotelPayoutBreakup.finalHotelPayout}
                bold
                highlight
              />
            </Panel>
          </div>
        ) : null}

        {tab === "otaRevenue" ? (
          <div className="w-full">
            <Panel title="OTA Revenue Breakup" className="w-full">
              <BreakupRow
                tag="A"
                label="OTA Commission"
                amount={booking.otaRevenueBreakup.commission}
                positive
              />
              <BreakupRow
                tag="B"
                label="OTA Commission GST"
                amount={booking.otaRevenueBreakup.commissionGst}
                positive
              />
              <BreakupRow
                tag="C"
                formula="A + B"
                label="Commission incl. GST"
                amount={booking.otaRevenueBreakup.commissionInclusiveGst}
                positive
              />
              <BreakupRow
                tag="D"
                label="OTA markup"
                amount={booking.otaRevenueBreakup.markup}
                positive
              />
              <BreakupRow
                tag="E"
                label="Service fee"
                amount={booking.otaRevenueBreakup.serviceFee}
                positive
              />
              <BreakupRow
                tag="F"
                label="Service fee GST"
                amount={booking.otaRevenueBreakup.serviceFeeGst}
                positive
              />
              <BreakupRow
                tag="G"
                label="Cancellation income"
                amount={booking.otaRevenueBreakup.cancellationIncome}
                positive
              />
              {isB2b ? (
                <BreakupRow
                  tag="H"
                  label="Agency commission"
                  amount={booking.otaRevenueBreakup.agencyCommission}
                  negative
                />
              ) : null}
              <BreakupRow
                tag={isB2b ? "I" : "H"}
                label="Refund adjustment"
                amount={booking.otaRevenueBreakup.refundAdjustment}
                negative
              />
              <BreakupRow
                tag={isB2b ? "J" : "I"}
                formula={isB2b ? "A + D + E + G − H − I" : "A + D + E + G − H"}
                label="Net OTA revenue"
                amount={booking.otaRevenueBreakup.netOtaRevenue}
                bold
                highlight
              />
              <BreakupRow
                tag={isB2b ? "K" : "J"}
                formula="B + F"
                label="Net OTA GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueGst}
                positive
              />
              <BreakupRow
                tag={isB2b ? "L" : "K"}
                formula={isB2b ? "J + K" : "I + J"}
                label="Net OTA incl. GST"
                amount={booking.otaRevenueBreakup.netOtaRevenueInclusiveGst}
                bold
              />
            </Panel>
          </div>
        ) : null}

        {tab === "cancellation" ? (
          <div
            className={cn(
              "grid gap-4",
              (booking.cancellationPolicyLines.length > 0 ||
                booking.matchedBracket) &&
                "lg:grid-cols-2",
            )}
          >
            <Panel
              title="Cancellation & Refund"
              className={
                booking.cancellationPolicyLines.length > 0 ||
                booking.matchedBracket
                  ? undefined
                  : "w-full"
              }
            >
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Refund status</span>
                  <StatusBadge
                    status={booking.refundStatus}
                    tone={refundStatusTone(booking.refundStatus)}
                  />
                </div>
                <InfoLine
                  label={
                    booking.agentPaymentBreakup
                      ? "Original payment (agent)"
                      : "Original booking amount"
                  }
                  value={formatFinanceMoney(
                    booking.agentPaymentBreakup?.amountPayableByAgent ??
                      booking.customerSellingPrice,
                  )}
                  positive
                />
                {booking.matchedBracket?.label ? (
                  <InfoLine
                    label="Applied bracket"
                    value={formatCancellationBracketLabel(
                      booking.matchedBracket.label,
                    )}
                  />
                ) : null}
                <InfoLine
                  label="Cancellation charge"
                  value={formatFinanceMoney(booking.cancellationCharge)}
                  positive
                />
                <InfoLine
                  label="Refund amount"
                  value={formatFinanceMoney(booking.refundAmount)}
                />
                {booking.cancelledBy ? (
                  <InfoLine
                    label="Cancelled by"
                    value={formatStatusLabel(booking.cancelledBy)}
                  />
                ) : null}
                {booking.cancellationReason ? (
                  <InfoLine
                    label="Cancellation reason"
                    value={booking.cancellationReason}
                  />
                ) : null}
                <InfoLine
                  label="Cancelled at"
                  value={formatReportDateTime(booking.cancellationDateTime)}
                />
                <InfoLine
                  label="Refunded at"
                  value={formatReportDateTime(booking.refundDateTime)}
                />
              </div>
              {booking.cancellationSettlement ? (
                <div className="border-t border-slate-100">
                  <div className="px-4 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Cancellation settlement
                      {booking.cancellationSettlement.settlementContext
                        ? ` · ${formatStatusLabel(booking.cancellationSettlement.settlementContext)}`
                        : ""}
                    </p>
                  </div>
                  <BreakupRow
                    label="Cancellation accommodation"
                    amount={
                      booking.cancellationSettlement
                        .cancellationAccommodationCharge
                    }
                    positive
                  />
                  <BreakupRow
                    label="Hotel GST"
                    amount={booking.cancellationSettlement.hotelGst}
                    positive
                  />
                  <BreakupRow
                    formula="Accommodation + Hotel GST"
                    label="Property charges"
                    amount={
                      booking.cancellationSettlement
                        .totalCancellationPropertyCharges
                    }
                    highlight
                  />
                  <BreakupRow
                    label="OTA commission"
                    amount={booking.cancellationSettlement.otaCommission}
                    negative
                  />
                  <BreakupRow
                    label="Commission GST"
                    amount={booking.cancellationSettlement.commissionGst}
                    negative
                  />
                  <BreakupRow
                    formula="OTA commission + GST"
                    label="Commission incl. GST"
                    amount={
                      booking.cancellationSettlement.commissionInclusiveGst
                    }
                    highlight
                  />
                  <BreakupRow
                    label="TCS"
                    amount={booking.cancellationSettlement.tcs}
                    negative
                  />
                  <BreakupRow
                    label="TDS"
                    amount={booking.cancellationSettlement.tds}
                    negative
                  />
                  <BreakupRow
                    formula="TCS + TDS"
                    label="Tax deduction"
                    amount={booking.cancellationSettlement.taxDeduction}
                  />
                  <BreakupRow
                    label="Payable to property"
                    amount={
                      booking.cancellationSettlement.amountPayableToProperty
                    }
                    bold
                    highlight
                  />
                  <BreakupRow
                    label="Customer refund"
                    amount={booking.cancellationSettlement.customerRefund}
                    bold
                    highlight
                  />
                </div>
              ) : null}
            </Panel>
            {booking.cancellationPolicyLines.length > 0 ||
            booking.matchedBracket ? (
              <Panel title="Cancellation policy">
                <div className="space-y-3 p-4">
                  {booking.matchedBracket ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Policy applied
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900">
                        {formatCancellationBracketLabel(
                          booking.matchedBracket.label,
                        ) ||
                          (booking.matchedBracket.penaltyPercent != null
                            ? `${formatMisPercent(booking.matchedBracket.penaltyPercent)} cancellation charge`
                            : "Matched cancellation bracket")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {[
                          booking.matchedBracket.penaltyType
                            ? formatStatusLabel(
                                booking.matchedBracket.penaltyType,
                              )
                            : null,
                          formatMisPercent(
                            booking.matchedBracket.penaltyPercent,
                          ),
                          booking.matchedBracket.effectiveFrom
                            ? `From ${formatReportDate(booking.matchedBracket.effectiveFrom)}`
                            : null,
                          booking.matchedBracket.effectiveTo
                            ? `to ${formatReportDate(booking.matchedBracket.effectiveTo)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ) : null}
                  {booking.cancellationPolicyLines.length ? (
                    <ul className="space-y-2 text-sm text-slate-700">
                      {booking.cancellationPolicyLines.map((line) => {
                        const matched =
                          booking.matchedBracket?.penaltyPercent != null &&
                          line.includes(
                            `${Number(booking.matchedBracket.penaltyPercent)}%`,
                          );
                        return (
                          <li
                            key={line}
                            className={`flex gap-2 ${
                              matched
                                ? "rounded-md bg-amber-50 px-1.5 py-1 font-medium text-amber-900"
                                : ""
                            }`}
                          >
                            <span
                              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                                matched ? "bg-amber-600" : "bg-slate-400"
                              }`}
                            />
                            <span>{line}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}

        {tab === "payment" ? (
          <div className="space-y-4">
            <div
              className={cn(
                "grid gap-4",
                (booking.payment?.payments?.length ?? 0) > 0 &&
                  "lg:grid-cols-2",
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
                    positive
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-slate-600">
                      Payment status
                    </span>
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
                        value={formatReportDateTime(
                          booking.payment?.paymentTime,
                        )}
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
                          <span className="text-sm font-medium tabular-nums text-emerald-600">
                            + {formatFinanceMoney(entry.amount)}
                          </span>
                          <StatusBadge
                            status={entry.status}
                            tone={paymentStatusTone(
                              entry.status === "SUCCESS"
                                ? "PAID"
                                : entry.status,
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

function InfoLine({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0",
        highlight && "rounded-lg bg-violet-50 px-2 -mx-2",
      )}
    >
      <span
        className={cn(
          "text-sm",
          highlight ? "font-medium text-violet-900" : "text-slate-500",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-right text-sm tabular-nums",
          highlight
            ? "font-semibold text-violet-800"
            : positive
              ? "font-medium text-emerald-600"
              : "font-medium text-slate-900",
        )}
      >
        {positive && typeof value === "string" ? `+ ${value}` : value}
      </span>
    </div>
  );
}
