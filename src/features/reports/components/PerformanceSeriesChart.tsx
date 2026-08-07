import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { PerformanceOverviewResponse } from "../services/performanceDashboardService";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const PROPERTY_BAR = "#3B6FE8";
export const COMPETITOR_BAR = "#F0A07A";

const whiteBackgroundPlugin: Plugin<"bar"> = {
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

const barValueLabelsPlugin: Plugin<"bar"> = {
  id: "barValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((element, index) => {
        const raw = dataset.data[index];
        const value =
          typeof raw === "number"
            ? raw
            : raw && typeof raw === "object" && "y" in raw
              ? Number((raw as { y: number }).y)
              : null;
        if (value == null || Number.isNaN(value)) return;
        const pos = element.tooltipPosition(true);
        if (pos.x == null || pos.y == null) return;
        ctx.fillText(String(value), pos.x, pos.y - 4);
      });
    });
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
  const chartRef = useRef<ChartJS<"bar"> | null>(null);

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

  const data = useMemo<ChartData<"bar">>(() => {
    const labels = series.map((point) => point.label);
    const datasets: ChartData<"bar">["datasets"] = [
      {
        label: "Your Property",
        data: series.map((point) => point.yourProperty ?? 0),
        backgroundColor: PROPERTY_BAR,
        borderRadius: 2,
        maxBarThickness: 36,
      },
    ];
    if (showCompetitors) {
      datasets.push({
        label: "Competitors' Avg",
        data: series.map((point) => point.competitorsAvg ?? 0),
        backgroundColor: COMPETITOR_BAR,
        borderRadius: 2,
        maxBarThickness: 36,
      });
    }
    return { labels, datasets };
  }, [series, showCompetitors]);

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: {
        padding: { top: 18, right: 8, left: 4, bottom: 0 },
      },
      plugins: {
        legend: {
          position: "bottom",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#475569",
            font: { size: 12 },
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          padding: 10,
          callbacks: {
            title(items) {
              return items[0]?.label ?? "";
            },
            label(ctx) {
              const value = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${value ?? "—"}`;
            },
          },
        },
        title: {
          display: false,
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
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grace: "8%",
          title: {
            display: true,
            text: metricLabel,
            color: "#94a3b8",
            font: { size: 11 },
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
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        No series data for this period.
      </div>
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <Bar
        ref={chartRef}
        data={data}
        options={options}
        plugins={[whiteBackgroundPlugin, barValueLabelsPlugin]}
      />
    </div>
  );
});
