import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  StatusBadge,
  bookingStatusTone,
  paymentStatusTone,
} from "@/features/reports/components/hotelFinancialMisUi";
import {
  HelpdeskPageShell,
  HelpdeskPanel,
} from "../components/helpdeskUi";
import {
  helpdeskBookingService,
  type HelpdeskBookingSearchItem,
} from "../services/helpdeskBookingService";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Headphones,
  Loader2,
  Search,
  User,
} from "lucide-react";

const BOOKING_REF_PATTERN = /^BR[A-Z0-9]+$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;

function looksLikeBookingReference(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 8 && BOOKING_REF_PATTERN.test(trimmed);
}

function looksLikeEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function looksLikePhone(value: string): boolean {
  const normalized = value.trim().replace(/[\s()-]/g, "");
  return PHONE_PATTERN.test(normalized);
}

function SearchResultRow({
  item,
  index,
}: {
  item: HelpdeskBookingSearchItem;
  index: number;
}) {
  const bookingRef = item.bookingRef?.trim() || `result-${index}`;

  return (
    <Link
      to={ROUTES.HELPDESK.DETAIL(bookingRef)}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-[#2f3d95]/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold text-slate-900">
            {bookingRef}
          </p>
          {item.bookingStatus ? (
            <StatusBadge
              label={formatStatusLabel(item.bookingStatus)}
              tone={bookingStatusTone(item.bookingStatus)}
            />
          ) : null}
          {item.paymentStatus ? (
            <StatusBadge
              label={formatStatusLabel(item.paymentStatus)}
              tone={paymentStatusTone(item.paymentStatus)}
            />
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {item.guestName || "Guest unavailable"}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {item.hotelName || "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatReportDate(item.checkIn)} – {formatReportDate(item.checkOut)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {item.guestPhone || item.guestEmail || "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        {item.amountCollected ? (
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatFinanceMoney(item.amountCollected)}
          </p>
        ) : null}
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#2f3d95] opacity-80 transition group-hover:opacity-100">
          Open
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default function HelpdeskBookingLookupPage() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HelpdeskBookingSearchItem[]>([]);
  const [searched, setSearched] = useState(false);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      showToast("Enter a booking reference, email, or phone number.", "error");
      return;
    }

    if (looksLikeBookingReference(trimmed)) {
      navigate(ROUTES.HELPDESK.DETAIL(trimmed.toUpperCase()));
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = looksLikeEmail(trimmed)
        ? { email: trimmed, limit: 20 }
        : looksLikePhone(trimmed)
          ? { phone: trimmed.replace(/[\s()-]/g, ""), limit: 20 }
          : { email: trimmed, limit: 20 };

      const response = await helpdeskBookingService.searchBookings(params);
      setResults(response.bookings);
      if (response.bookings.length === 0) {
        showToast("No bookings found for this customer.", "error");
      }
    } catch (error) {
      setResults([]);
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [navigate, query, showToast]);

  return (
    <HelpdeskPageShell>
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#2f3d95] to-[#3d4fa8] px-5 py-6 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                Helpdesk order lookup
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-white/80">
                Find a booking instantly by reference, email, or phone for live
                support, escalations, and voucher requests.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <label
            htmlFor="helpdesk-search"
            className="text-sm font-semibold text-slate-900"
          >
            Search order
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="helpdesk-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSearch();
                }}
                placeholder="BRK5B086F3F2363, email, or phone"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#2f3d95] focus:bg-white focus:ring-2 focus:ring-[#2f3d95]/15"
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading}
                className="inline-flex min-w-[110px] items-center justify-center gap-2 rounded-lg bg-[#2f3d95] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#252d73] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Search
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Booking references open the support view directly. Email and phone
            search returns recent matching orders.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#2f3d95]" />
        </div>
      ) : null}

      {!loading && searched && results.length > 0 ? (
        <HelpdeskPanel
          title="Search results"
          subtitle={`${results.length} booking${results.length === 1 ? "" : "s"} found`}
        >
          <div className="space-y-3">
            {results.map((item, index) => (
              <SearchResultRow
                key={`${item.bookingRef || "booking"}-${index}`}
                item={item}
                index={index}
              />
            ))}
          </div>
        </HelpdeskPanel>
      ) : null}

      {!loading && searched && results.length === 0 ? (
        <HelpdeskPanel title="No results">
          <p className="text-sm text-slate-600">
            Try another email, phone number, or booking reference.
          </p>
        </HelpdeskPanel>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </HelpdeskPageShell>
  );
}
