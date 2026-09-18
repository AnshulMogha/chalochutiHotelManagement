import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { PackageItineraryView } from "./PackageItineraryView";
import { HelpdeskPanel } from "./helpdeskUi";
import {
  packageItineraryService,
  type PackageItinerarySummary,
} from "../services/packageItineraryService";
import { GitBranch } from "lucide-react";

export function HelpdeskPackageItineraryPanel({
  bookingId,
  bookingRef,
  packageId,
  productName,
}: {
  bookingId: number;
  bookingRef: string;
  packageId?: number | null;
  productName?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PackageItinerarySummary | null>(null);

  useEffect(() => {
    if (!bookingId || bookingId <= 0) {
      setLoading(false);
      setError("Package booking id is missing for this order.");
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    packageItineraryService
      .getItinerarySummary(bookingId)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setSummary(null);
        setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <HelpdeskPanel
      title="Trip itinerary"
      subtitle={productName || undefined}
      icon={GitBranch}
      action={
        <Link
          to={ROUTES.HELPDESK.ITINERARY(bookingRef)}
          state={{ bookingId, packageId, productName }}
          className="text-xs font-semibold text-[#2f3d95] hover:underline"
        >
          Open full page
        </Link>
      }
    >
      <PackageItineraryView
        loading={loading}
        error={error}
        summary={summary}
      />
    </HelpdeskPanel>
  );
}
