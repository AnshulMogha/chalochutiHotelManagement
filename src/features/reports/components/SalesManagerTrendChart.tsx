import { useMemo } from "react";
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
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatReportDate } from "./reportUiHelpers";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type TrendPoint = {
  date: string;
  value: number;
};

type Props = {
  title: string;
  points: TrendPoint[];
  valuePrefix?: string;
  color?: string;
  fill?: boolean;
  emptyLabel?: string;
};

export function SalesManagerTrendChart({
  title,
  points,
  valuePrefix = "",
  color = "#059669",
  fill = true,
  emptyLabel = "No trend data for this period",
}: Props) {
  const chartData = useMemo<ChartData<"line">>(() => {
    return {
      labels: points.map((point) => formatReportDate(point.date)),
      datasets: [
        {
          label: title,
          data: points.map((point) => point.value),
          borderColor: color,
          backgroundColor: fill ? `${color}22` : "transparent",
          pointBackgroundColor: color,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill,
        },
      ],
    };
  }, [color, fill, points, title]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y ?? 0;
              return `${valuePrefix}${value.toLocaleString("en-IN")}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e2e8f0" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback(value) {
              return `${valuePrefix}${Number(value).toLocaleString("en-IN")}`;
            },
          },
        },
      },
    }),
    [valuePrefix],
  );

  if (!points.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-56">
      <Line data={chartData} options={options} />
    </div>
  );
}
