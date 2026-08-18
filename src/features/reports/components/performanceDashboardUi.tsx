import { cn } from "@/lib/utils";
import type {
  PerformanceBreakdownCard,
  PerformanceComparisonType,
  PerformanceDimensionType,
  PerformanceMetric,
  PerformanceRanking,
} from "../services/performanceDashboardService";
import {
  BedDouble,
  CalendarDays,
  Clock,
  Info,
  Radio,
  Timer,
  Trophy,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export const ANALYTICS_PROPERTY = "#4f46e5";
export const ANALYTICS_COMPETITOR = "#94a3b8";

export type MetricTheme = {
  card: string;
  cardActive: string;
  icon: string;
  iconMuted: string;
  label: string;
  value: string;
  accent: string;
  panelHeader: string;
};

export const METRIC_THEMES: Record<PerformanceMetric, MetricTheme> = {
  ROOM_NIGHTS: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    cardActive: "border-violet-400 ring-2 ring-violet-100 shadow-md",
    icon: "bg-violet-600 text-white shadow-sm",
    iconMuted: "bg-violet-100 text-violet-600",
    label: "text-violet-700",
    value: "text-violet-900",
    accent: "text-violet-600",
    panelHeader: "bg-gradient-to-r from-violet-50 to-white",
  },
  REVENUE: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    cardActive: "border-emerald-400 ring-2 ring-emerald-100 shadow-md",
    icon: "bg-emerald-600 text-white shadow-sm",
    iconMuted: "bg-emerald-100 text-emerald-600",
    label: "text-emerald-700",
    value: "text-emerald-900",
    accent: "text-emerald-600",
    panelHeader: "bg-gradient-to-r from-emerald-50 to-white",
  },
  ASP: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    cardActive: "border-amber-400 ring-2 ring-amber-100 shadow-md",
    icon: "bg-amber-500 text-white shadow-sm",
    iconMuted: "bg-amber-100 text-amber-600",
    label: "text-amber-700",
    value: "text-amber-900",
    accent: "text-amber-600",
    panelHeader: "bg-gradient-to-r from-amber-50 to-white",
  },
  PROPERTY_VISITS: {
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    cardActive: "border-sky-400 ring-2 ring-sky-100 shadow-md",
    icon: "bg-sky-500 text-white shadow-sm",
    iconMuted: "bg-sky-100 text-sky-600",
    label: "text-sky-700",
    value: "text-sky-900",
    accent: "text-sky-600",
    panelHeader: "bg-gradient-to-r from-sky-50 to-white",
  },
  CONVERSION: {
    card: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
    cardActive: "border-rose-400 ring-2 ring-rose-100 shadow-md",
    icon: "bg-rose-500 text-white shadow-sm",
    iconMuted: "bg-rose-100 text-rose-600",
    label: "text-rose-700",
    value: "text-rose-900",
    accent: "text-rose-600",
    panelHeader: "bg-gradient-to-r from-rose-50 to-white",
  },
};

const BREAKDOWN_THEMES: Record<
  PerformanceDimensionType,
  { icon: LucideIcon; accent: string; header: string; iconWrap: string }
> = {
  BUSINESS_CHANNEL: {
    icon: Radio,
    accent: "text-indigo-600",
    header: "bg-gradient-to-r from-indigo-50 to-white",
    iconWrap: "bg-indigo-100",
  },
  ROOM_RATE_PLAN: {
    icon: BedDouble,
    accent: "text-violet-600",
    header: "bg-gradient-to-r from-violet-50 to-white",
    iconWrap: "bg-violet-100",
  },
  DAY_OF_WEEK: {
    icon: CalendarDays,
    accent: "text-sky-600",
    header: "bg-gradient-to-r from-sky-50 to-white",
    iconWrap: "bg-sky-100",
  },
  MEAL_PLAN: {
    icon: UtensilsCrossed,
    accent: "text-amber-600",
    header: "bg-gradient-to-r from-amber-50 to-white",
    iconWrap: "bg-amber-100",
  },
  TRAVELLER_MIX: {
    icon: Users,
    accent: "text-emerald-600",
    header: "bg-gradient-to-r from-emerald-50 to-white",
    iconWrap: "bg-emerald-100",
  },
  LENGTH_OF_STAY: {
    icon: Clock,
    accent: "text-cyan-600",
    header: "bg-gradient-to-r from-cyan-50 to-white",
    iconWrap: "bg-cyan-100",
  },
  ADVANCE_PURCHASE: {
    icon: Timer,
    accent: "text-orange-600",
    header: "bg-gradient-to-r from-orange-50 to-white",
    iconWrap: "bg-orange-100",
  },
};

export function AnalyticsInfoTip({
  text,
  className,
  align = "start",
}: {
  text: string;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <span
      className={cn("group/info relative inline-flex shrink-0", className)}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span
        className="inline-flex cursor-help items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full z-50 mt-2 hidden w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] leading-relaxed font-normal whitespace-normal text-white shadow-xl group-hover/info:block",
          align === "start" && "left-0",
          align === "end" && "right-0",
          align === "center" && "left-1/2 -translate-x-1/2",
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function AnalyticsDelta({
  changePercent,
  improved,
  comparisonType,
  size = "sm",
}: {
  changePercent: number | null | undefined;
  improved?: boolean;
  comparisonType?: PerformanceComparisonType;
  size?: "sm" | "md";
}) {
  if (changePercent == null || Number.isNaN(changePercent)) return null;
  const abs = Math.abs(changePercent);
  const label = `${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  const up = improved ?? changePercent >= 0;
  const comparedTo =
    comparisonType === "PREVIOUS_PERIOD"
      ? "vs previous period"
      : "vs same period last year";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold tabular-nums",
        up
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      )}
      title={comparedTo}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {label}
    </span>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  changePercent,
  improved,
  active,
  onClick,
  helpText,
  icon: Icon,
  metric,
}: {
  label: string;
  value: string;
  changePercent?: number | null;
  improved?: boolean;
  active?: boolean;
  onClick?: () => void;
  helpText?: string;
  icon: LucideIcon;
  metric: PerformanceMetric;
}) {
  const theme = METRIC_THEMES[metric];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition",
        active ? theme.cardActive : theme.card,
        !active && "hover:-translate-y-0.5 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              active ? theme.icon : theme.iconMuted,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              theme.label,
            )}
          >
            {label}
          </span>
        </div>
        {helpText ? <AnalyticsInfoTip text={helpText} align="end" /> : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            theme.value,
          )}
        >
          {value}
        </span>
        <AnalyticsDelta changePercent={changePercent} improved={improved} />
      </div>
    </Comp>
  );
}

export function AnalyticsPanel({
  title,
  subtitle,
  action,
  children,
  className,
  headerClassName,
  titleIcon: TitleIcon,
  titleIconWrap,
  titleIconColor,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  titleIcon?: LucideIcon;
  titleIconWrap?: string;
  titleIconColor?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4",
            headerClassName,
          )}
        >
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              {TitleIcon ? (
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100",
                    titleIconWrap,
                  )}
                >
                  <TitleIcon
                    className={cn("h-3.5 w-3.5 text-indigo-600", titleIconColor)}
                  />
                </span>
              ) : null}
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

function BreakdownRow({ ranking }: { ranking: PerformanceRanking }) {
  const yours = ranking.yourPercent ?? 0;
  const comps = ranking.competitorsPercent ?? 0;
  const gap =
    yours != null && comps != null ? Number((yours - comps).toFixed(2)) : null;

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2.5 pr-3 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          #{ranking.rank}
          {ranking.rank === 1 ? (
            <Trophy className="h-3 w-3 text-amber-500" />
          ) : null}
        </span>
      </td>
      <td className="max-w-[10rem] truncate py-2.5 text-sm font-medium text-slate-800">
        {ranking.label}
      </td>
      <td className="py-2.5 text-right text-sm tabular-nums text-slate-900">
        {ranking.yourPercent == null ? "—" : `${ranking.yourPercent.toFixed(1)}%`}
      </td>
      <td className="py-2.5 text-right text-sm tabular-nums text-slate-600">
        {ranking.competitorsPercent == null
          ? "—"
          : `${ranking.competitorsPercent.toFixed(1)}%`}
      </td>
      <td className="py-2.5 text-right text-sm tabular-nums">
        {gap == null ? (
          "—"
        ) : (
          <span
            className={cn(
              "font-medium",
              gap > 0
                ? "text-emerald-600"
                : gap < 0
                  ? "text-rose-600"
                  : "text-slate-500",
            )}
          >
            {gap > 0 ? "+" : ""}
            {gap.toFixed(1)}pp
          </span>
        )}
      </td>
    </tr>
  );
}

export function AnalyticsBreakdownCard({
  card,
  helpText,
}: {
  card: PerformanceBreakdownCard;
  helpText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRoomPlan = card.dimensionType === "ROOM_RATE_PLAN";
  const visible = isRoomPlan && !expanded ? card.rankings.slice(0, 5) : card.rankings;
  const hasMore = isRoomPlan && card.rankings.length > 5;
  const breakdownTheme = BREAKDOWN_THEMES[card.dimensionType];
  const BreakdownIcon = breakdownTheme.icon;

  return (
    <AnalyticsPanel
      title={card.title}
      subtitle={card.insight}
      headerClassName={breakdownTheme.header}
      titleIcon={BreakdownIcon}
      titleIconWrap={breakdownTheme.iconWrap}
      titleIconColor={breakdownTheme.accent}
      action={helpText ? <AnalyticsInfoTip text={helpText} align="end" /> : null}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-3">Rank</th>
              <th className="pb-2">Segment</th>
              <th className={cn("pb-2 text-right", breakdownTheme.accent)}>
                Property
              </th>
              <th className="pb-2 text-right text-slate-500">Market avg</th>
              <th className="pb-2 text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <BreakdownRow key={row.key} ranking={row} />
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            "mt-3 text-sm font-semibold hover:underline",
            breakdownTheme.accent,
          )}
        >
          Show all {card.rankings.length} segments
        </button>
      ) : null}
    </AnalyticsPanel>
  );
}

export const METRIC_LABELS: Record<PerformanceMetric, string> = {
  ROOM_NIGHTS: "Room nights",
  REVENUE: "Net revenue",
  ASP: "Avg. selling price",
  PROPERTY_VISITS: "Property visits",
  CONVERSION: "Conversion rate",
};

export const METRIC_HELP: Record<PerformanceMetric, string> = {
  ROOM_NIGHTS:
    "Room nights = nights × rooms for confirmed bookings only. Cancelled and refunded bookings are excluded.",
  REVENUE:
    "Net amount receivable by the property for the selected period, excluding taxes. Revenue = post-promotion room/rate price − OTA commission.",
  ASP: "Average post-promotion sell price to the customer across room nights. ASP = total post-promotion sell price ÷ total room nights.",
  PROPERTY_VISITS:
    "Counts when a customer successfully opens this hotel's details page. One visit per session + hotel.",
  CONVERSION:
    "Conversion % = (confirmed bookings ÷ property visits) × 100, rounded to 2 decimals.",
};

export const BREAKDOWN_HELP: Record<
  import("../services/performanceDashboardService").PerformanceDimensionType,
  string
> = {
  BUSINESS_CHANNEL:
    "Share of room nights by booking channel. Percent = room nights in that channel ÷ total room nights.",
  ROOM_RATE_PLAN:
    "Share of room nights by the booking's main room and rate plan.",
  DAY_OF_WEEK:
    "Share of room nights by weekday of booking or stay, depending on date axis.",
  MEAL_PLAN:
    "Share of room nights by meal plan from the rate plan code.",
  TRAVELLER_MIX:
    "Share of room nights by guest mix: Family, Couple, Group, etc.",
  LENGTH_OF_STAY:
    "Share of room nights by stay length buckets.",
  ADVANCE_PURCHASE:
    "Share of room nights by days from booking date to check-in.",
};
