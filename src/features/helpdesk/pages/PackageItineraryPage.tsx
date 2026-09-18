import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { formatReportDate } from "@/features/reports/components/reportUiHelpers";
import { PackageItineraryView } from "../components/PackageItineraryView";
import { helpdeskBookingService } from "../services/helpdeskBookingService";
import {
  packageItineraryService,
  type PackageItinerarySummary,
} from "../services/packageItineraryService";
import { ArrowLeft, GitBranch } from "lucide-react";

type ItineraryLocationState = {
  bookingId?: number;
  packageId?: number | null;
  productName?: string;
};

export default function PackageItineraryPage() {
  const { bookingRef: bookingRefParam = "" } = useParams();
  const bookingRef = decodeURIComponent(bookingRefParam).trim();
  const location = useLocation();
  const state = (location.state || {}) as ItineraryLocationState;
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PackageItinerarySummary | null>(null);
  const [meta, setMeta] = useState<{
    bookingId: number | null;
    packageId: number | null;
    productName: string | null;
  }>({
    bookingId: state.bookingId ?? null,
    packageId: state.packageId ?? null,
    productName: state.productName ?? null,
  });

  useEffect(() => {
    if (!bookingRef) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let bookingId = state.bookingId ?? null;
        let packageId = state.packageId ?? null;
        let productName = state.productName ?? null;

        if (bookingId == null) {
          const detail =
            await helpdeskBookingService.getBookingByReference(bookingRef);
          bookingId = detail.bookingId;
          packageId = detail.financial.packageId ?? packageId;
          productName = detail.support.productName || productName;
          if (detail.type.toUpperCase() !== "PACKAGE") {
            throw new Error("Itinerary is only available for package bookings.");
          }
        }

        if (bookingId == null || !Number.isFinite(bookingId) || bookingId <= 0) {
          throw new Error("Package booking id is missing for this order.");
        }

        const data =
          await packageItineraryService.getItinerarySummary(bookingId);
        if (cancelled) return;
        setMeta({
          bookingId: data.packageBookingId ?? bookingId,
          packageId: data.packageId ?? packageId,
          productName,
        });
        setSummary(data);
      } catch (err) {
        if (cancelled) return;
        const message = extractErrorMessage(err);
        setSummary(null);
        setError(message);
        showToast(message, "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    bookingRef,
    showToast,
    state.bookingId,
    state.packageId,
    state.productName,
  ]);

  const tripMeta = useMemo(() => {
    const sections = summary?.sections ?? [];
    const allDays = sections.flatMap((section) => section.days);
    const dayNumbers = allDays
      .map((day) => day.dayNumber)
      .filter((n) => Number.isFinite(n) && n > 0);
    const dates = allDays
      .map((day) => day.date)
      .filter((d): d is string => !!d);
    const totalDays = dayNumbers.length
      ? Math.max(...dayNumbers) - Math.min(...dayNumbers) + 1
      : allDays.length;
    const totalNights = sections.reduce(
      (sum, section) => sum + (section.nights ?? 0),
      0,
    );
    const startDate = dates.length
      ? dates.reduce((min, d) => (d < min ? d : min))
      : null;
    const endDate = dates.length
      ? dates.reduce((max, d) => (d > max ? d : max))
      : null;

    return { totalDays, totalNights, startDate, endDate };
  }, [summary]);

  const backTo = bookingRef
    ? ROUTES.HELPDESK.DETAIL(bookingRef)
    : ROUTES.HELPDESK.LOOKUP;

  return (
    <div className="min-h-full bg-slate-50">
      <Toast toast={toast} onClose={hideToast} />
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order
        </Link>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-slate-700" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Trip itinerary
            </h1>
          </div>
          {meta.productName ? (
            <p className="mt-1 text-sm text-slate-600">{meta.productName}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {meta.bookingId != null ? (
              <span>Booking #{meta.bookingId}</span>
            ) : null}
            {meta.packageId != null ? (
              <span>Package #{meta.packageId}</span>
            ) : null}
            {tripMeta.totalDays > 0 ? (
              <span>
                {tripMeta.totalDays} Day
                {tripMeta.totalDays === 1 ? "" : "s"}
                {tripMeta.totalNights > 0
                  ? ` · ${tripMeta.totalNights} Night${
                      tripMeta.totalNights === 1 ? "" : "s"
                    }`
                  : ""}
              </span>
            ) : null}
            {tripMeta.startDate && tripMeta.endDate ? (
              <span>
                {formatReportDate(tripMeta.startDate)} →{" "}
                {formatReportDate(tripMeta.endDate)}
              </span>
            ) : null}
          </div>
        </div>

        <PackageItineraryView
          loading={loading}
          error={error}
          summary={summary}
        />
      </div>
    </div>
  );
}
