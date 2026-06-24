import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { format, parseISO, isValid } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Hotel,
  Loader2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { ROUTES } from "@/constants";
import {
  rateService,
  type MissingRatesData,
} from "../services/rateService";
import { formatApiClientError } from "@/services/api/formatApiClientError";
import { Toast, useToast } from "@/components/ui/Toast";

const RATE_TYPE_LABELS: Record<string, string> = {
  RETAIL: "B2C (Retail)",
  AGENT: "B2B (Agent)",
  PACKAGE: "Bundle",
};

function formatDisplayDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

function SummaryCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${accent}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MissingRatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, hideToast } = useToast();

  const hotelId = searchParams.get("hotelId") ?? "";
  const rateType = searchParams.get("rateType") ?? "RETAIL";
  const segmentLabel = searchParams.get("segment") ?? rateType;
  const returnSection = searchParams.get("returnSection");

  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") ?? "",
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");

  const [data, setData] = useState<MissingRatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backUrl = useMemo(() => {
    const listRoute =
      returnSection === "rate-plans"
        ? ROUTES.RATE_INVENTORY.LIST
        : ROUTES.ROOM_INVENTORY.LIST;
    return hotelId
      ? `${listRoute}?hotelId=${encodeURIComponent(hotelId)}`
      : listRoute;
  }, [hotelId, returnSection]);

  const rateTypeLabel = RATE_TYPE_LABELS[rateType] ?? rateType;

  const fetchMissingRates = useCallback(async () => {
    if (!hotelId || !startDate || !endDate) {
      setError("Hotel and date range are required.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date must be on or before end date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await rateService.getMissingRates({
        hotelId,
        startDate,
        endDate,
        rateType,
      });
      setData(result);
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
  }, [hotelId, startDate, endDate, rateType]);

  useEffect(() => {
    if (hotelId && startDate && endDate) {
      void fetchMissingRates();
    }
  }, [hotelId, startDate, endDate, rateType, fetchMissingRates]);

  const handleApplyRange = () => {
    const next = new URLSearchParams(searchParams);
    next.set("startDate", startDate);
    next.set("endDate", endDate);
    setSearchParams(next, { replace: true });
    void fetchMissingRates();
  };

  const hasMissing = (data?.summary.totalMissingRateEntries ?? 0) > 0;

  const sortedMissingDates = useMemo(() => {
    if (!data?.missingDates) return [];
    return [...data.missingDates].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [data?.missingDates]);

  if (!hotelId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Missing hotel ID. Open this page from Rate &amp; Inventory.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50/30 pb-16">
      <Toast {...toast} onClose={hideToast} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-start gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="p-2.5 rounded-full border border-slate-200 text-slate-600 hover:text-amber-700 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm"
            aria-label="Back to Rate and Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
              <h1 className="text-2xl font-bold text-slate-900">
                Missing Rates
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">
                {segmentLabel}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Dates and rate plans without configured rates for{" "}
              <span className="font-medium text-slate-800">{rateTypeLabel}</span>
            </p>
            {data?.hotelName && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700">
                <Hotel className="w-4 h-4 text-violet-600" />
                <span className="font-semibold">{data.hotelName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              Date range
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyRange}
              disabled={loading || !startDate || !endDate}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
            <p className="text-sm text-slate-600">Checking rates across your calendar…</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <SummaryCard
                icon={<ClipboardList className="w-6 h-6" />}
                iconBg="bg-slate-100"
                iconColor="text-slate-600"
                label="Dates checked"
                value={data.summary.totalDatesChecked}
                accent="border-slate-200"
              />
              <SummaryCard
                icon={<Calendar className="w-6 h-6" />}
                iconBg="bg-amber-100"
                iconColor="text-amber-700"
                label="Dates with gaps"
                value={data.summary.totalMissingDates}
                accent="border-amber-200"
              />
              <SummaryCard
                icon={<Tag className="w-6 h-6" />}
                iconBg="bg-rose-100"
                iconColor="text-rose-700"
                label="Missing rate entries"
                value={data.summary.totalMissingRateEntries}
                accent="border-rose-200"
              />
            </div>

            {!hasMissing ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-10 text-center shadow-sm">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-emerald-900 mb-2">
                  All rates are set
                </h3>
                <p className="text-sm text-emerald-800 max-w-md mx-auto">
                  No missing rates found between{" "}
                  <span className="font-medium">
                    {formatDisplayDate(data.startDate)}
                  </span>{" "}
                  and{" "}
                  <span className="font-medium">
                    {formatDisplayDate(data.endDate)}
                  </span>{" "}
                  for this segment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {sortedMissingDates.length} date
                  {sortedMissingDates.length === 1 ? "" : "s"} need attention
                </p>

                {sortedMissingDates.map((entry) => {
                  const entryCount = entry.missingRooms.reduce(
                    (sum, room) => sum + room.missingRatePlans.length,
                    0,
                  );
                  return (
                    <article
                      key={entry.date}
                      className="rounded-2xl border border-amber-200/80 bg-white shadow-md overflow-hidden"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 border-b border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {formatDisplayDate(entry.date)}
                            </h3>
                            <p className="text-xs text-amber-800/90 font-medium">
                              {entry.date}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          {entryCount} missing
                        </span>
                      </header>

                      <div className="divide-y divide-slate-100">
                        {entry.missingRooms.map((room) => (
                          <div
                            key={`${entry.date}-${room.roomId}`}
                            className="px-5 py-4 hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                <BedDouble className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {room.roomName}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Room ID {room.roomId}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {room.missingRatePlans.map((plan) => (
                                    <span
                                      key={plan.ratePlanId}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800"
                                    >
                                      <Tag className="w-3.5 h-3.5 text-rose-600" />
                                      {plan.ratePlanName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                  <strong>Tip:</strong> Return to Rate &amp; Inventory, select the
                  date column, expand the room, and set base rates—or use{" "}
                  <span className="font-semibold">Bulk Update Rates</span> to fill
                  multiple days at once.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
