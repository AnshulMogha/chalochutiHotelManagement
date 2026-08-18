import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { PerformanceOverviewResponse } from "../services/performanceDashboardService";
import {
  ANALYTICS_COMPETITOR,
  ANALYTICS_PROPERTY,
} from "./performanceDashboardUi";
import { formatReportDateLabel } from "./reportUiHelpers";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

/** @deprecated use ANALYTICS_PROPERTY */
export const PROPERTY_BAR = ANALYTICS_PROPERTY;
/** @deprecated use ANALYTICS_COMPETITOR */
export const COMPETITOR_BAR = ANALYTICS_COMPETITOR;

const whiteBackgroundPlugin: Plugin<"line"> = {
  id: "whiteBackground",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

export type PerformanceSeriesChartHandle = {
  downloadPng: (filename: string) => boolean;
};

type Props = {
  series: PerformanceOverviewResponse["series"];
  showCompetitors: boolean;
  metricLabel: string;
};

export const PerformanceSeriesChart = forwardRef<
  PerformanceSeriesChartHandle,
  Props
>(function PerformanceSeriesChart(
  { series, showCompetitors, metricLabel },
  ref,
) {
  const chartRef = useRef<ChartJS<"line"> | null>(null);

  useImperativeHandle(ref, () => ({
    downloadPng(filename: string) {
      const chart = chartRef.current;
      if (!chart) return false;
      const link = document.createElement("a");
      link.href = chart.toBase64Image("image/png", 1);
      link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      link.click();
      return true;
    },
  }));

  const data = useMemo<ChartData<"line">>(() => {
    const labels = series.map((point) => formatReportDateLabel(point.label));
    const datasets: ChartData<"line">["datasets"] = [
      {
        label: "Your property",
        data: series.map((point) => point.yourProperty ?? null),
        borderColor: ANALYTICS_PROPERTY,
        backgroundColor: "rgba(79, 70, 229, 0.08)",
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: ANALYTICS_PROPERTY,
        pointBorderWidth: 2,
        tension: 0.35,
        fill: true,
        spanGaps: false,
      },
    ];

    if (showCompetitors) {
      datasets.push({
        label: "Competitor average",
        data: series.map((point) => point.competitorsAvg ?? null),
        borderColor: ANALYTICS_COMPETITOR,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: ANALYTICS_COMPETITOR,
        pointBorderWidth: 2,
        tension: 0.35,
        fill: false,
        spanGaps: false,
      });
    }

    return { labels, datasets };
  }, [series, showCompetitors]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: {
        padding: { top: 8, right: 12, left: 0, bottom: 0 },
      },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#475569",
            font: { size: 11, weight: 500 },
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { size: 12, weight: "600" },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title(items) {
              return items[0]?.label ?? "";
            },
            label(ctx) {
              const value = ctx.parsed.y;
              if (value == null || Number.isNaN(value)) {
                return ` ${ctx.dataset.label}: —`;
              }
              return ` ${ctx.dataset.label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          border: { color: "#e2e8f0" },
        },
        y: {
          beginAtZero: true,
          grace: "5%",
          title: {
            display: true,
            text: metricLabel,
            color: "#94a3b8",
            font: { size: 11, weight: "500" },
          },
          ticks: {
            color: "#94a3b8",
            font: { size: 11 },
            precision: 0,
          },
          grid: {
            color: "#f1f5f9",
          },
          border: { display: false },
        },
      },
    }),
    [metricLabel],
  );

  if (!series.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        No trend data for this period.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <Line
        ref={chartRef}
        data={data}
        options={options}
        plugins={[whiteBackgroundPlugin]}
      />
    </div>
  );
});
