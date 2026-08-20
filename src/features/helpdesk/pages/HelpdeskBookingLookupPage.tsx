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
  CheckCircle2,
  Headphones,
  Loader2,
  Search,
  User,
} from "lucide-react";

type LookupMode = "ID" | "PHONE" | "EMAIL";

const LOOKUP_ID_PATTERN = /^[A-Z0-9]{6,}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;

function looksLikeLookupId(value: string): boolean {
  const trimmed = value.trim();
  return LOOKUP_ID_PATTERN.test(trimmed);
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
  const [lookupMode, setLookupMode] = useState<LookupMode>("ID");
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
      showToast("Enter a value to search.", "error");
      return;
    }

    if (lookupMode === "ID") {
      if (!looksLikeLookupId(trimmed)) {
        showToast("Enter a valid lookup ID.", "error");
        return;
      }
      navigate(ROUTES.HELPDESK.DETAIL(trimmed.toUpperCase()));
      return;
    }

    if (lookupMode === "EMAIL" && !looksLikeEmail(trimmed)) {
      showToast("Enter a valid email address.", "error");
      return;
    }

    if (lookupMode === "PHONE" && !looksLikePhone(trimmed)) {
      showToast("Enter a valid phone number.", "error");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params =
        lookupMode === "EMAIL"
          ? { email: trimmed, limit: 20 }
          : { phone: trimmed.replace(/[\s()-]/g, ""), limit: 20 };

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
  }, [lookupMode, navigate, query, showToast]);

  return (
    <HelpdeskPageShell>
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#2f3d95] to-[#3d4fa8] px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">
                Help Desk
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-white/80 sm:text-sm">
                Find a booking instantly by reference, email, or phone for live
                support, escalations, and voucher requests.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <label
            htmlFor="helpdesk-search"
            className="text-sm font-semibold text-slate-900"
          >
            Search order
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search by
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "ID", label: "Lookup ID" },
                  { value: "PHONE", label: "Phone" },
                  { value: "EMAIL", label: "Email" },
                ] as const
              ).map((option) => {
                const active = lookupMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition sm:text-sm ${
                      active
                        ? "border-[#2f3d95] bg-white font-semibold text-[#2f3d95] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="helpdesk-lookup-mode"
                      value={option.value}
                      checked={active}
                      onChange={() => setLookupMode(option.value)}
                      className="h-4 w-4 accent-[#2f3d95]"
                    />
                    <span>{option.label}</span>
                    {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
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
                placeholder={
                  lookupMode === "ID"
                    ? "PBRA7F6FFA14416"
                    : lookupMode === "PHONE"
                      ? "9876543210"
                      : "name@example.com"
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#2f3d95] focus:bg-white focus:ring-2 focus:ring-[#2f3d95]/15"
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading}
                className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-lg bg-[#2f3d95] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[#252d73] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Search
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Lookup ID opens the support view directly. Phone and email return
            recent matching bookings.
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
