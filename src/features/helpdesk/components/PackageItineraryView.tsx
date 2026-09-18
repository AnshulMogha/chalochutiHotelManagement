import { formatReportDate } from "@/features/reports/components/reportUiHelpers";
import { cn } from "@/lib/utils";
import type {
  PackageItineraryItem,
  PackageItinerarySection,
  PackageItinerarySummary,
} from "../services/packageItineraryService";
import { Building2, Bus, Car, Compass, Loader2, MapPin } from "lucide-react";

function sectionStayTitle(section: PackageItinerarySection): {
  headline: string;
  hotelName: string | null;
} {
  const nights = section.nights;
  const city = section.cityName?.trim() || null;
  const nightLabel =
    nights == null
      ? null
      : `${nights} Night${nights === 1 ? "" : "s"} Stay`;

  const headline =
    city && nightLabel
      ? `${city} - ${nightLabel}`
      : city || nightLabel || section.title;

  let hotelName: string | null = null;
  const title = section.title.trim();
  if (title) {
    if (city && title.toLowerCase().includes(city.toLowerCase())) {
      const beforeCity = title.split(",")[0]?.trim();
      if (beforeCity && beforeCity.toLowerCase() !== city.toLowerCase()) {
        hotelName = beforeCity;
      }
    } else if (!city) {
      hotelName = title.split(",")[0]?.trim() || null;
    }
  }

  return { headline, hotelName };
}

function itemVisual(item: PackageItineraryItem): {
  Icon: typeof Car;
  chip: string;
  iconColor: string;
} {
  const type = item.type.toUpperCase();
  const icon = item.icon.toUpperCase();
  if (type === "TRANSFER" || icon === "CAR") {
    return {
      Icon: Car,
      chip: "bg-sky-100 text-sky-700",
      iconColor: "text-sky-600",
    };
  }
  if (
    type === "HOTEL_CHECKIN" ||
    type === "HOTEL_CHECKOUT" ||
    icon === "HOTEL"
  ) {
    return {
      Icon: Building2,
      chip: "bg-violet-100 text-violet-700",
      iconColor: "text-violet-600",
    };
  }
  return {
    Icon: Compass,
    chip: "bg-amber-100 text-amber-700",
    iconColor: "text-amber-600",
  };
}

function ItineraryItemCard({ item }: { item: PackageItineraryItem }) {
  const { Icon, chip, iconColor } = itemVisual(item);
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          chip,
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          {item.timeText ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
              {item.timeText}
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {item.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: PackageItinerarySection }) {
  const { headline, hotelName } = sectionStayTitle(section);
  return (
    <section className="space-y-2.5">
      {section.routeLabel ? (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Bus className="h-4 w-4 text-slate-500" />
          <span>{section.routeLabel}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {headline}
            </h2>
            {hotelName ? (
              <p className="mt-0.5 text-sm text-slate-500">{hotelName}</p>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {section.days.map((day) => (
            <div
              key={`${section.routeLabel}-${day.dayNumber}-${day.date}`}
              className="grid gap-3 px-4 py-4 sm:grid-cols-[110px_minmax(0,1fr)]"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Day {day.dayNumber}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatReportDate(day.date)}
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {day.items.map((item, index) => (
                  <ItineraryItemCard
                    key={`${item.referenceType || item.type}-${item.referenceId || index}-${item.title}`}
                    item={item}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PackageItineraryView({
  loading,
  error,
  summary,
  emptyMessage = "No itinerary available for this package booking.",
}: {
  loading?: boolean;
  error?: string | null;
  summary: PackageItinerarySummary | null;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[28vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!summary || summary.sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary.sections.map((section, index) => (
        <SectionCard
          key={`${section.routeLabel}-${section.startDayNumber}-${index}`}
          section={section}
        />
      ))}
    </div>
  );
}
