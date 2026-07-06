import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

function formatWatch(now: Date) {
  const date = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return { date, time };
}

export function DateTimeWatch() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { date, time } = formatWatch(now);

  return (
    <div
      className="flex items-center gap-2 rounded-lg border-2 border-[#1e2a6e] bg-[#2f3d95] px-3 py-1.5 shadow-md"
      title="Current date and time (visible in screenshots)"
      aria-live="polite"
      aria-label={`Current date and time: ${date} ${time}`}
    >
      <Clock3
        className="h-4 w-4 shrink-0 text-white"
        strokeWidth={2.5}
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono tabular-nums leading-none">
        <span className="text-sm font-bold tracking-wide text-white sm:text-[15px]">
          {date}
        </span>
        <span
          className="hidden h-3.5 w-px bg-white/40 sm:block"
          aria-hidden
        />
        <span className="text-sm font-bold tracking-wide text-amber-300 sm:text-[15px]">
          {time}
        </span>
      </div>
    </div>
  );
}
