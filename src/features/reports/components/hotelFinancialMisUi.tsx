import { cn } from "@/lib/utils";
import { formatFinanceMoney, formatStatusLabel } from "./reportUiHelpers";
import type {
  HotelFinancialMisAgentPaymentBreakup,
  HotelFinancialMisBookingRow,
  HotelFinancialMisBookingOwner,
  HotelFinancialMisMoney,
} from "../services/hotelBookingFinancialMisService";
import type { LucideIcon } from "lucide-react";

export const FINANCIAL_MIS_CACHE_KEY = "hotel-booking-financial-mis:row";
export const FINANCIAL_MIS_FILTERS_KEY = "hotel-booking-financial-mis:filters";

export function cacheFinancialMisFilters(state: unknown): void {
  try {
    sessionStorage.setItem(FINANCIAL_MIS_FILTERS_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedFinancialMisFilters<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(FINANCIAL_MIS_FILTERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearCachedFinancialMisFilters(): void {
  try {
    sessionStorage.removeItem(FINANCIAL_MIS_FILTERS_KEY);
  } catch {
    // ignore
  }
}

/** B2B agent bookings: display agent price from payment breakup when present. */
export function isHotelFinancialMisB2b(
  booking: Pick<HotelFinancialMisBookingRow, "bookingRate">,
): boolean {
  return String(booking.bookingRate || "").toUpperCase() === "B2B";
}

export function getHotelFinancialMisAgentPrice(
  booking: Pick<
    HotelFinancialMisBookingRow,
    "customerSellingPrice" | "agentNetCommission" | "agentPaymentBreakup"
  >,
): HotelFinancialMisMoney {
  if (booking.agentPaymentBreakup) {
    return booking.agentPaymentBreakup.amountPayableByAgent;
  }
  return {
    amount: Math.max(
      0,
      booking.customerSellingPrice.amount - booking.agentNetCommission.amount,
    ),
    currency: booking.customerSellingPrice.currency,
  };
}

/** End-customer price set by the agent (B2B); falls back to payment breakup selling price. */
export function getHotelFinancialMisAgentCustomerSellingPrice(
  booking: Pick<
    HotelFinancialMisBookingRow,
    "agentCustomerSellingPrice" | "agentPaymentBreakup"
  >,
): HotelFinancialMisMoney | null {
  if (
    booking.agentCustomerSellingPrice &&
    booking.agentCustomerSellingPrice.amount > 0
  ) {
    return booking.agentCustomerSellingPrice;
  }
  if (
    booking.agentPaymentBreakup?.sellingPrice &&
    booking.agentPaymentBreakup.sellingPrice.amount > 0
  ) {
    return booking.agentPaymentBreakup.sellingPrice;
  }
  return null;
}

export function getHotelFinancialMisDisplaySellingPrice(
  booking: Pick<
    HotelFinancialMisBookingRow,
    | "bookingRate"
    | "customerSellingPrice"
    | "agentNetCommission"
    | "agentPaymentBreakup"
  >,
): HotelFinancialMisMoney {
  if (isHotelFinancialMisB2b(booking)) {
    return getHotelFinancialMisAgentPrice(booking);
  }
  return booking.customerSellingPrice;
}

export function formatBookedByLabel(bookedBy: string | null | undefined): string {
  if (!bookedBy || bookedBy === "—") return "—";
  return formatStatusLabel(bookedBy);
}

export function BookedByOwnerDisplay({
  owner,
  fallback,
  compact = false,
}: {
  owner: HotelFinancialMisBookingOwner | null | undefined;
  fallback?: string | null;
  compact?: boolean;
}) {
  if (owner?.name || owner?.email) {
    const textClass = compact ? "text-xs text-slate-500" : "text-sm text-gray-900";
    const secondaryClass = compact
      ? "text-xs text-slate-500"
      : "text-xs font-normal text-gray-500";
    const agencyClass = compact
      ? "text-xs font-semibold text-slate-900"
      : "text-xs font-semibold text-gray-900";

    return (
      <span className="block space-y-0.5">
        {owner.name ? (
          <span className={`block ${textClass}`}>{owner.name}</span>
        ) : null}
        {owner.email ? (
          <span className={`block ${secondaryClass}`}>{owner.email}</span>
        ) : null}
        {owner.phone ? (
          <span className={`block ${secondaryClass}`}>{owner.phone}</span>
        ) : null}
        {owner.agencyName ? (
          <span className={`block ${agencyClass}`}>
            Agency · {owner.agencyName}
          </span>
        ) : null}
      </span>
    );
  }

  if (fallback) {
    return <span>{formatBookedByLabel(fallback)}</span>;
  }

  return <span>—</span>;
}

export function cacheFinancialMisRow(row: unknown): void {
  try {
    sessionStorage.setItem(FINANCIAL_MIS_CACHE_KEY, JSON.stringify(row));
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedFinancialMisRow<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(FINANCIAL_MIS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function bookingStatusTone(status: string | null | undefined): string {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "CANCELLED" || normalized === "NO_SHOW") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function paymentStatusTone(status: string | null | undefined): string {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (
    normalized === "PAID" ||
    normalized.includes("PAID") ||
    normalized === "CONFIRMED"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized === "PARTIAL" || normalized.includes("PARTIAL")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized === "PENDING" || normalized.includes("PENDING")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized === "CANCELLED" || normalized.includes("CANCEL")) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (normalized.includes("REFUND")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function refundStatusTone(status: string | null | undefined): string {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized.includes("SUCCESS") || normalized === "REFUND_SUCCESS") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (normalized.includes("PENDING") || normalized.includes("INITIATED")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (normalized.includes("FAILED")) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        tone,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function BreakupRow({
  label,
  amount,
  negative,
  bold,
  highlight,
}: {
  label: string;
  amount: HotelFinancialMisMoney;
  negative?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  const displayAmount = {
    ...amount,
    amount: negative ? Math.abs(amount.amount) : amount.amount,
  };
  const rateHint = amount.rateLabel?.trim() || null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0",
        highlight && "rounded-lg border-b-0 bg-blue-50",
        bold && "font-semibold",
      )}
    >
      <span
        className={cn("min-w-0", bold ? "text-slate-900" : "text-slate-600")}
      >
        <span className="block">{label}</span>
        {rateHint ? (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            {rateHint}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          negative ? "text-rose-600" : "text-slate-900",
          bold && "text-blue-700",
        )}
      >
        {negative
          ? `− ${formatFinanceMoney(displayAmount)}`
          : formatFinanceMoney(displayAmount)}
      </span>
    </div>
  );
}

export function AgentPaymentBreakupFormula({
  formula,
}: {
  formula?: string | null;
}) {
  const text =
    formula?.trim() ||
    "sellingPrice - netAgentCommission = amountPayableByAgent";
  return (
    <p className="border-t border-slate-100 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-500">
      {text}
    </p>
  );
}

/** Ledger-style agent payment calculation (API amounts only). */
export function AgentPaymentBreakupLedger({
  breakup,
  agentCustomerSellingPrice,
}: {
  breakup: HotelFinancialMisAgentPaymentBreakup;
  agentCustomerSellingPrice?: HotelFinancialMisMoney | null;
}) {
  const showAgentCustomerPrice =
    agentCustomerSellingPrice != null &&
    Math.abs(
      agentCustomerSellingPrice.amount - breakup.sellingPrice.amount,
    ) > 0.009;

  return (
    <>
      {showAgentCustomerPrice ? (
        <BreakupRow
          label="Agent customer selling price"
          amount={agentCustomerSellingPrice}
        />
      ) : null}
      <BreakupRow label="Platform selling price" amount={breakup.sellingPrice} />
      <BreakupRow
        label="Gross agent commission"
        amount={breakup.grossAgentCommission}
      />
      <BreakupRow label="Agent TDS" amount={breakup.agentTds} />
      <BreakupRow
        label="Net agent commission"
        amount={breakup.netAgentCommission}
        negative
      />
      <BreakupRow
        label="Amount payable by agent"
        amount={breakup.amountPayableByAgent}
        bold
        highlight
      />
      <AgentPaymentBreakupFormula formula={breakup.formula} />
    </>
  );
}

export function FinanceKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
  actionLabel = "View details",
  compact = true,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: {
    card: string;
    icon: string;
    label: string;
  };
  onClick?: () => void;
  actionLabel?: string;
  compact?: boolean;
  sub?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg shadow-sm",
            compact ? "h-7 w-7" : "h-9 w-9 rounded-xl",
            tone.icon,
          )}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </div>
        <p
          className={cn(
            "min-w-0 truncate font-semibold uppercase tracking-wide",
            compact ? "text-[10px] leading-tight" : "text-[11px]",
            tone.label,
          )}
          title={label}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 font-bold tabular-nums leading-tight text-slate-900",
          compact ? "text-xs sm:text-sm" : "text-lg sm:text-xl",
        )}
        title={value}
      >
        <span className="block truncate">{value}</span>
      </p>
      {sub ? (
        <p
          className={cn(
            "truncate font-medium text-slate-500",
            compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs",
          )}
          title={sub}
        >
          {sub}
        </p>
      ) : null}
      {onClick && actionLabel ? (
        <p
          className={cn(
            "font-medium text-blue-600 opacity-80 group-hover:opacity-100 group-hover:underline",
            compact ? "mt-0.5 text-[10px]" : "mt-2 text-xs",
          )}
        >
          {actionLabel}
        </p>
      ) : null}
    </>
  );

  const cardClass = cn(
    "border text-left shadow-sm transition",
    compact ? "rounded-lg p-2" : "rounded-2xl p-3.5",
    onClick && "group hover:-translate-y-0.5 hover:shadow-md",
    tone.card,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClass}>
        {content}
      </button>
    );
  }

  return <div className={cardClass}>{content}</div>;
}

export const FINANCE_KPI_TONES = {
  bookings: {
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    icon: "bg-sky-500 text-white",
    label: "text-sky-700",
  },
  customer: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
    icon: "bg-blue-600 text-white",
    label: "text-blue-700",
  },
  collected: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-600 text-white",
    label: "text-emerald-700",
  },
  hotelPayout: {
    card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
    icon: "bg-indigo-600 text-white",
    label: "text-indigo-700",
  },
  ota: {
    card: "border-cyan-100 bg-gradient-to-br from-cyan-50 to-white",
    icon: "bg-cyan-600 text-white",
    label: "text-cyan-700",
  },
  cancellation: {
    card: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    icon: "bg-rose-500 text-white",
    label: "text-rose-700",
  },
  refund: {
    card: "border-orange-100 bg-gradient-to-br from-orange-50 to-white",
    icon: "bg-orange-500 text-white",
    label: "text-orange-700",
  },
  outstanding: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    icon: "bg-violet-600 text-white",
    label: "text-violet-700",
  },
  margin: {
    card: "border-teal-100 bg-gradient-to-br from-teal-50 to-white",
    icon: "bg-teal-600 text-white",
    label: "text-teal-700",
  },
} as const;
