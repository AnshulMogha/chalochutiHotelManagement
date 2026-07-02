import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { ROUTES } from "@/constants";
import {
  rateService,
  type MissingRatesData,
  type MissingRatesDateEntry,
} from "../services/rateService";
import { formatApiClientError } from "@/services/api/formatApiClientError";
import { Toast, useToast } from "@/components/ui/Toast";

const RATE_TYPE_LABELS: Record<string, string> = {
  RETAIL: "B2C",
  AGENT: "B2B",
  PACKAGE: "Bundle",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatDetailsHeading(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "MMMM dd, yyyy");
  } catch {
    return dateStr;
  }
}

export default function MissingRatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, hideToast } = useToast();

  const hotelId = searchParams.get("hotelId") ?? "";
  const rateType = searchParams.get("rateType") ?? "RETAIL";
  const segmentLabel = searchParams.get("segment") ?? rateType;
  const returnSection = searchParams.get("returnSection");

  const initialAnchor = searchParams.get("startDate") ?? format(new Date(), "yyyy-MM-dd");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parsed = parseISO(initialAnchor);
    return isValid(parsed) ? startOfMonth(parsed) : startOfMonth(new Date());
  });

  const [data, setData] = useState<MissingRatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);
  const monthEnd = useMemo(() => endOfMonth(calendarMonth), [calendarMonth]);
  const fetchStartDate = useMemo(() => toDateKey(monthStart), [monthStart]);
  const fetchEndDate = useMemo(() => toDateKey(monthEnd), [monthEnd]);

  const backUrl = useMemo(() => {
    const listRoute =
      returnSection === "rate-plans"
        ? ROUTES.RATE_INVENTORY.LIST
        : ROUTES.ROOM_INVENTORY.LIST;
    return hotelId
      ? `${listRoute}?hotelId=${encodeURIComponent(hotelId)}`
      : listRoute;
  }, [hotelId, returnSection]);

  const rateTypeLabel = RATE_TYPE_LABELS[rateType] ?? segmentLabel;

  const fetchMissingRates = useCallback(async () => {
    if (!hotelId) {
      setError("Hotel is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await rateService.getMissingRates({
        hotelId,
        startDate: fetchStartDate,
        endDate: fetchEndDate,
        rateType,
      });
      setData(result);

      const next = new URLSearchParams(searchParams);
      next.set("startDate", fetchStartDate);
      next.set("endDate", fetchEndDate);
      setSearchParams(next, { replace: true });
    } catch (err) {
      const message = formatApiClientError(
        err,
        "Failed to load missing rates.",
      );
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId, fetchStartDate, fetchEndDate, rateType, searchParams, setSearchParams]);

  useEffect(() => {
    if (hotelId) {
      void fetchMissingRates();
    }
  }, [hotelId, fetchMissingRates]);

  const missingByDate = useMemo(() => {
    const map = new Map<string, MissingRatesDateEntry>();
    for (const entry of data?.missingDates ?? []) {
      map.set(entry.date, entry);
    }
    return map;
  }, [data?.missingDates]);

  const sortedMissingDates = useMemo(() => {
    if (!data?.missingDates) return [];
    return [...data.missingDates].sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.missingDates]);

  useEffect(() => {
    if (!sortedMissingDates.length) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate((current) => {
      if (current && missingByDate.has(current)) return current;
      const firstInMonth = sortedMissingDates.find((entry) => {
        const d = parseISO(entry.date);
        return isValid(d) && isSameMonth(d, calendarMonth);
      });
      return firstInMonth?.date ?? sortedMissingDates[0]?.date ?? null;
    });
  }, [sortedMissingDates, missingByDate, calendarMonth]);

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);

  const selectedEntry = selectedDate ? missingByDate.get(selectedDate) : undefined;
  const hasMissing = (data?.summary.totalMissingRateEntries ?? 0) > 0;
  const monthLabel = format(calendarMonth, "MMMM yyyy");

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => addMonths(prev, 1));
  };

  if (!hotelId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Missing hotel ID. Open this page from Rate &amp; Inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-10">
      <Toast {...toast} onClose={hideToast} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            aria-label="Back to Rate and Inventory"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Missing Rates
                {data?.hotelName ? (
                  <span className="font-semibold text-slate-700">
                    {" "}
                    for {data.hotelName}
                  </span>
                ) : null}
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                {rateTypeLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Review dates with missing rate plans and fix them quickly.
            </p>
          </div>
        </div>

        {error && !loading && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">Loading missing rate plans…</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-slate-500" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Missing Rates for {data.hotelName}: {monthLabel}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative px-4 py-4">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const dateKey = toDateKey(day);
                    const inMonth = isSameMonth(day, calendarMonth);
                    const hasGap = missingByDate.has(dateKey);
                    const isSelected = selectedDate === dateKey;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        disabled={!inMonth || !hasGap}
                        onClick={() => hasGap && setSelectedDate(dateKey)}
                        className={[
                          "relative flex min-h-[88px] flex-col rounded-xl border px-2 py-2 text-left transition-all",
                          !inMonth && "pointer-events-none opacity-30",
                          inMonth && !hasGap && "border-slate-100 bg-white text-slate-400",
                          inMonth &&
                            hasGap &&
                            !isSelected &&
                            "border-rose-200 bg-rose-50/80 text-slate-800 hover:border-rose-300 hover:bg-rose-50",
                          isSelected &&
                            "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {hasGap && inMonth && (
                          <AlertTriangle className="absolute right-2 top-2 h-4 w-4 text-rose-500" />
                        )}
                        <span
                          className={[
                            "text-lg font-bold tabular-nums",
                            isSelected ? "text-blue-700" : "text-slate-800",
                          ].join(" ")}
                        >
                          {format(day, "d")}
                        </span>
                        {inMonth && (
                          <span className="mt-auto text-[10px] font-medium text-slate-500">
                            {dateKey}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-sm font-medium text-slate-700">
                  Total Missing Rate Entries:{" "}
                  <span className="font-bold text-slate-900">
                    {data.summary.totalMissingRateEntries}
                  </span>{" "}
                  <span className="text-slate-500">(for {monthLabel})</span>
                </p>
              </div>
            </section>

            <aside className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedDate
                    ? `Details for ${formatDetailsHeading(selectedDate)}`
                    : "Select a date"}
                </h2>
                {selectedDate && (
                  <p className="mt-0.5 text-xs text-slate-500">{selectedDate}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!hasMissing ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
                    <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      All rates are set
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-slate-600">
                      No missing rate plans found for {monthLabel} in this
                      segment.
                    </p>
                  </div>
                ) : !selectedEntry ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
                    <CalendarDays className="mb-4 h-12 w-12 text-slate-300" />
                    <p className="text-sm text-slate-600">
                      Click a highlighted date on the calendar to view missing
                      rate plans.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {selectedEntry.missingRooms.map((room) => (
                      <div
                        key={`${selectedEntry.date}-${room.roomId}`}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {room.roomName}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID: {room.roomId}
                          </p>
                        </div>

                        <div className="px-4 py-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600">
                            Missing:
                          </p>
                          <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-left">
                                <tr>
                                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Rate plan
                                  </th>
                                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    ID
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {room.missingRatePlans.map((plan) => (
                                  <tr key={plan.ratePlanId}>
                                    <td className="px-3 py-2.5 font-medium text-slate-800">
                                      {plan.ratePlanName}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums text-slate-500">
                                      {plan.ratePlanId}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
