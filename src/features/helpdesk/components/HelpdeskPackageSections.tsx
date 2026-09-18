import {
  formatFinanceMoney,
  formatReportDate,
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  HelpdeskBreakupAccordion,
  HelpdeskInfoRow,
  HelpdeskPanel,
} from "./helpdeskUi";
import type {
  HelpdeskDriver,
  HelpdeskFinancialDetail,
  HelpdeskPackageHotel,
  HelpdeskTransporter,
} from "../services/helpdeskBookingService";
import {
  Activity,
  Building2,
  Bus,
  CalendarDays,
  Car,
  Hash,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
  Wallet,
} from "lucide-react";

function MiniMoneyRow({
  label,
  value,
}: {
  label: string;
  value: { amount: number; currency: string } | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums font-medium text-slate-900">
        {formatFinanceMoney(value)}
      </span>
    </div>
  );
}

export function HelpdeskPackageHotelsPanel({
  hotels,
}: {
  hotels: HelpdeskPackageHotel[];
}) {
  if (!hotels.length) return null;

  return (
    <HelpdeskPanel
      title="Package hotels"
      subtitle={`${hotels.length} hotel${hotels.length === 1 ? "" : "s"} in this package`}
      icon={Building2}
    >
      <div className="space-y-3">
        {hotels.map((hotel, index) => {
          const phones = [
            hotel.phone,
            ...hotel.phoneList.filter((phone) => phone && phone !== hotel.phone),
          ].filter(Boolean) as string[];
          return (
            <div
              key={hotel.hotelId || `${hotel.hotelName}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-slate-900">
                {hotel.hotelName}
              </p>
              {hotel.hotelId ? (
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {hotel.hotelId}
                </p>
              ) : null}
              <div className="mt-2 space-y-1.5">
                <HelpdeskInfoRow
                  icon={Mail}
                  label="Email"
                  value={hotel.email || "—"}
                />
                <HelpdeskInfoRow
                  icon={Phone}
                  label="Phone"
                  value={phones.length ? phones.join(" · ") : "—"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HelpdeskPanel>
  );
}

export function HelpdeskPackageTransportPanel({
  transporter,
  driver,
}: {
  transporter?: HelpdeskTransporter | null;
  driver?: HelpdeskDriver | null;
}) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <HelpdeskPanel
        title="Transporter"
        subtitle={
          transporter?.type
            ? formatStatusLabel(transporter.type)
            : "Transport vendor for this package"
        }
        icon={Bus}
      >
        {transporter ? (
          <>
            <HelpdeskInfoRow
              icon={Building2}
              label="Agency"
              value={transporter.agencyName || "—"}
            />
            <HelpdeskInfoRow
              icon={User}
              label="Contact"
              value={transporter.contactName || "—"}
            />
            <HelpdeskInfoRow
              icon={Mail}
              label="Email"
              value={transporter.email || "—"}
            />
            <HelpdeskInfoRow
              icon={Phone}
              label="Phone"
              value={transporter.phone || "—"}
            />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            No transporter assigned for this package.
          </p>
        )}
      </HelpdeskPanel>

      <HelpdeskPanel
        title="Driver & vehicle"
        subtitle={
          driver?.assignmentStatus
            ? formatStatusLabel(driver.assignmentStatus)
            : "Assigned transport crew"
        }
        icon={Car}
      >
        {driver ? (
          <>
            <HelpdeskInfoRow
              icon={User}
              label="Driver"
              value={driver.driverName || "—"}
            />
            <HelpdeskInfoRow
              icon={Phone}
              label="Phone"
              value={driver.driverPhone || "—"}
            />
            <HelpdeskInfoRow
              icon={Car}
              label="Vehicle number"
              value={driver.vehicleNumber || "—"}
            />
            <HelpdeskInfoRow
              icon={Tag}
              label="Vehicle model"
              value={driver.vehicleModel || "—"}
            />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            No driver assigned for this package.
          </p>
        )}
      </HelpdeskPanel>
    </div>
  );
}

export function HelpdeskPackageFinancialExtras({
  financial: fin,
  showCosts = true,
  showBreakups = true,
  showIncentive = true,
  showComponents = true,
}: {
  financial: HelpdeskFinancialDetail;
  showCosts?: boolean;
  showBreakups?: boolean;
  showIncentive?: boolean;
  showComponents?: boolean;
}) {
  const hasCosts =
    fin.packageSupplierCost != null ||
    fin.hotelCost != null ||
    fin.transportCost != null ||
    fin.activityCost != null ||
    fin.transportPayout != null ||
    fin.activityPayout != null ||
    fin.markup != null ||
    fin.taxes != null ||
    fin.commission != null ||
    fin.totalSupplierPayout != null ||
    fin.grossProfit != null;

  return (
    <div className="space-y-4">
      {showCosts && hasCosts ? (
        <HelpdeskPanel
          title="Package cost & payout summary"
          subtitle="Supplier costs and component payouts"
          icon={Wallet}
        >
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <MiniMoneyRow label="Package supplier cost" value={fin.packageSupplierCost} />
            <MiniMoneyRow label="Hotel cost" value={fin.hotelCost} />
            <MiniMoneyRow label="Transport cost" value={fin.transportCost} />
            <MiniMoneyRow label="Activity cost" value={fin.activityCost} />
            <MiniMoneyRow label="Hotel payout" value={fin.hotelPayout} />
            <MiniMoneyRow label="Transport payout" value={fin.transportPayout} />
            <MiniMoneyRow label="Activity payout" value={fin.activityPayout} />
            <MiniMoneyRow label="Total supplier payout" value={fin.totalSupplierPayout} />
            <MiniMoneyRow label="Markup" value={fin.markup} />
            <MiniMoneyRow label="Commission" value={fin.commission} />
            <MiniMoneyRow label="Commission GST" value={fin.commissionGst} />
            <MiniMoneyRow label="Taxes" value={fin.taxes} />
            <MiniMoneyRow label="Service fee" value={fin.serviceFee} />
            <MiniMoneyRow label="Gross profit" value={fin.grossProfit} />
            <MiniMoneyRow
              label="Profit after payout"
              value={fin.profitAfterSupplierPayout}
            />
            <MiniMoneyRow label="Outstanding" value={fin.outstandingAmount} />
          </div>
        </HelpdeskPanel>
      ) : null}

      {showIncentive && fin.agencyIncentive ? (
        <HelpdeskPanel title="Agency incentive" icon={Tag}>
          <HelpdeskInfoRow
            icon={Tag}
            label="Tier"
            value={fin.agencyIncentive.agencyTier || "—"}
          />
          <HelpdeskInfoRow
            icon={Hash}
            label="Incentive"
            value={[
              fin.agencyIncentive.incentiveType
                ? formatStatusLabel(fin.agencyIncentive.incentiveType)
                : null,
              fin.agencyIncentive.incentiveCategory
                ? formatStatusLabel(fin.agencyIncentive.incentiveCategory)
                : null,
              fin.agencyIncentive.incentivePercent != null
                ? `${fin.agencyIncentive.incentivePercent}%`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          />
          <MiniMoneyRow label="Gross" value={fin.agencyIncentive.grossAmount} />
          <MiniMoneyRow label="TDS" value={fin.agencyIncentive.tds} />
          <MiniMoneyRow label="Net" value={fin.agencyIncentive.netAmount} />
        </HelpdeskPanel>
      ) : null}

      {showIncentive && fin.markupDetails ? (
        <HelpdeskPanel title="Markup details" icon={Tag}>
          <MiniMoneyRow
            label={
              fin.markupDetails.packageMarkup?.rateLabel || "Package markup"
            }
            value={fin.markupDetails.packageMarkup}
          />
          <MiniMoneyRow
            label={fin.markupDetails.agentMarkup?.rateLabel || "Agent markup"}
            value={fin.markupDetails.agentMarkup}
          />
        </HelpdeskPanel>
      ) : null}

      {showBreakups ? (
      <HelpdeskPanel
        title="Package financial breakdown"
        subtitle="Additional PACKAGE breakups"
      >
        <div className="space-y-3">
          <HelpdeskBreakupAccordion
            title="Gross profit reconciliation"
            breakup={fin.grossProfitReconciliation || { lines: [] }}
            defaultOpen
          />
          {fin.supplierCostBreakup?.lines.length ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Supplier cost breakup
                </p>
              </div>
              <div className="divide-y divide-slate-100 px-4">
                {fin.supplierCostBreakup.lines.map((line, index) => (
                  <div
                    key={`${line.bookingRef || line.supplierName}-${index}`}
                    className="flex items-start justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {line.supplierName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatStatusLabel(line.componentType)}
                        {line.bookingRef ? ` · ${line.bookingRef}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums font-medium text-slate-900">
                      {formatFinanceMoney(line.baseFare)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatFinanceMoney(fin.supplierCostBreakup.total)}
                </span>
              </div>
            </div>
          ) : null}

          {fin.hotelSellingPriceBreakup?.components.length ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Hotel selling price breakup
                </p>
              </div>
              <div className="divide-y divide-slate-100 px-4">
                {fin.hotelSellingPriceBreakup.components.map((row, index) => (
                  <div
                    key={`${row.hotelBookingId || row.hotelName}-${index}`}
                    className="py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {row.hotelName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.bookingRate || "—"}
                          {row.hotelBookingId != null
                            ? ` · #${row.hotelBookingId}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        {formatFinanceMoney(row.customerSellingPrice)}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-slate-500 sm:grid-cols-3">
                      <span>Base {formatFinanceMoney(row.baseRate)}</span>
                      <span>GST {formatFinanceMoney(row.hotelGst)}</span>
                      <span>
                        Promo {formatFinanceMoney(row.promotionDiscount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm font-semibold">
                <span>Total hotel selling</span>
                <span className="tabular-nums">
                  {formatFinanceMoney(
                    fin.hotelSellingPriceBreakup.totalHotelSellingPrice,
                  )}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </HelpdeskPanel>
      ) : null}

      {showComponents &&
      (fin.componentSummary ||
        (fin.hotelComponents && fin.hotelComponents.length) ||
        (fin.transportComponents && fin.transportComponents.length) ||
        (fin.activityComponents && fin.activityComponents.length)) ? (
        <HelpdeskPanel
          title="Package components"
          subtitle={
            fin.componentSummary
              ? `Hotels ${fin.componentSummary.hotelWithValue}/${fin.componentSummary.hotelTotal} · Transport ${fin.componentSummary.transportWithValue}/${fin.componentSummary.transportTotal} · Activities ${fin.componentSummary.activityWithValue}/${fin.componentSummary.activityTotal}`
              : "Hotel, transport and activity legs"
          }
        >
          <div className="space-y-4">
            {fin.hotelComponents?.length ? (
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  Hotels
                </p>
                <div className="space-y-2">
                  {fin.hotelComponents.map((hotel, index) => (
                    <div
                      key={`${hotel.hotelBookingId || hotel.bookingRef}-${index}`}
                      className="rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {hotel.hotelName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {hotel.bookingRef || "—"}
                            {hotel.bookingRate
                              ? ` · ${hotel.bookingRate}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatFinanceMoney(hotel.customerSellingPrice)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <span>
                          Stay{" "}
                          {formatReportDate(hotel.checkIn)} →{" "}
                          {formatReportDate(hotel.checkOut)}
                          {hotel.nights != null ? ` · ${hotel.nights}n` : ""}
                        </span>
                        <span>
                          Cost {formatFinanceMoney(hotel.supplierCost)} · Payout{" "}
                          {formatFinanceMoney(hotel.supplierPayout)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {fin.transportComponents?.length ? (
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Bus className="h-3.5 w-3.5" />
                  Transport
                </p>
                <div className="space-y-2">
                  {fin.transportComponents.map((leg, index) => (
                    <div
                      key={`${leg.transferBookingId || leg.bookingRef}-${index}`}
                      className="rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {leg.supplierName || leg.vehicleType || "Transport"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {leg.bookingRef || "—"}
                            {leg.vehicleType ? ` · ${leg.vehicleType}` : ""}
                            {leg.passengerCount != null
                              ? ` · ${leg.passengerCount} pax`
                              : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatFinanceMoney(leg.customerPrice)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <p className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {leg.pickupLocation || "—"} → {leg.dropLocation || "—"}
                        </p>
                        <p className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatReportDateTime(leg.pickupDateTime)}
                        </p>
                        <p>
                          Cost {formatFinanceMoney(leg.supplierCost)} · Payout{" "}
                          {formatFinanceMoney(leg.supplierPayout)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {fin.activityComponents?.length ? (
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Activity className="h-3.5 w-3.5" />
                  Activities
                </p>
                <div className="space-y-2">
                  {fin.activityComponents.map((activity, index) => (
                    <div
                      key={`${activity.activityBookingId || activity.bookingRef}-${index}`}
                      className="rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {activity.activityName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {activity.bookingRef || "—"}
                            {activity.activityDate
                              ? ` · ${formatReportDate(activity.activityDate)}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatFinanceMoney(activity.customerPrice)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        Cost {formatFinanceMoney(activity.supplierCost)} · Payout{" "}
                        {formatFinanceMoney(activity.supplierPayout)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </HelpdeskPanel>
      ) : null}
    </div>
  );
}

export function HelpdeskPackagePaymentExtras({
  financial: fin,
}: {
  financial: HelpdeskFinancialDetail;
}) {
  const paymentBreakup = fin.paymentBreakup;
  const cancellationBreakup = fin.cancellationBreakup;

  if (!paymentBreakup && !cancellationBreakup?.lines.length) return null;

  return (
    <div className="space-y-4">
      {paymentBreakup ? (
        <HelpdeskPanel title="Payment breakup" icon={Wallet}>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <MiniMoneyRow label="Grand total" value={paymentBreakup.grandTotal} />
            <MiniMoneyRow label="Collected" value={paymentBreakup.collected} />
            <MiniMoneyRow label="Refunded" value={paymentBreakup.refunded} />
            <MiniMoneyRow label="Outstanding" value={paymentBreakup.outstanding} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <HelpdeskInfoRow
              icon={Tag}
              label="Payment status"
              value={formatStatusLabel(paymentBreakup.paymentStatus || "—")}
            />
            <HelpdeskInfoRow
              icon={Hash}
              label="Method"
              value={formatStatusLabel(paymentBreakup.paymentMethod || "—")}
            />
            <HelpdeskInfoRow
              icon={Hash}
              label="Attempts"
              value={
                paymentBreakup.paymentAttempts
                  ? `${paymentBreakup.paymentAttempts.successful} success · ${paymentBreakup.paymentAttempts.failed} failed`
                  : "—"
              }
            />
            <HelpdeskInfoRow
              icon={CalendarDays}
              label="Next due"
              value={formatReportDate(paymentBreakup.nextDueDate)}
            />
          </div>
          {paymentBreakup.installments.length ? (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Due
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Paid
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paymentBreakup.installments.map((row) => (
                    <tr key={row.installmentNo}>
                      <td className="px-3 py-2.5">{row.installmentNo}</td>
                      <td className="px-3 py-2.5">
                        {formatReportDate(row.dueDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        {formatStatusLabel(row.status)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatFinanceMoney(row.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatFinanceMoney(row.paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </HelpdeskPanel>
      ) : null}

      {cancellationBreakup?.lines.length ? (
        <HelpdeskPanel title="Cancellation breakup" icon={Tag}>
          <div className="mb-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <MiniMoneyRow
              label="Cancellation charge"
              value={cancellationBreakup.cancellationCharge}
            />
            <MiniMoneyRow
              label="Refund amount"
              value={cancellationBreakup.refundAmount}
            />
          </div>
          <div className="space-y-2">
            {cancellationBreakup.lines.map((line, index) => (
              <div
                key={`${line.componentType}-${line.label}-${index}`}
                className="rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {line.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatStatusLabel(line.componentType)}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-slate-900">
                    {formatFinanceMoney(line.originalAmount)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>
                    Charge {formatFinanceMoney(line.cancellationCharge)}
                  </span>
                  <span>Refund {formatFinanceMoney(line.refundAmount)}</span>
                </div>
                {line.cancellationPolicy ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {line.cancellationPolicy}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </HelpdeskPanel>
      ) : null}
    </div>
  );
}
