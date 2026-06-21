"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/dashboard-ui";

export type SalesPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type SalesPoint = {
  label: string;
  amount: number;
  usd: number;
  mvr: number;
};

export type SalesDataset = {
  label: string;
  currencyLabel: string;
  previousTotal: number;
  points: SalesPoint[];
};

export function SalesReportChart({ datasets }: { datasets: Record<SalesPeriod, SalesDataset> }) {
  const [period, setPeriod] = useState<SalesPeriod>("monthly");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dataset = datasets[period];
  const points = dataset.points;

  const chart = useMemo(() => {
    const width = 920;
    const height = 320;
    const padding = { top: 28, right: 22, bottom: 48, left: 64 };
    const max = Math.max(...points.map((point) => point.amount), 1);
    const min = 0;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const coords = points.map((point, index) => {
      const x = padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
      const y = padding.top + plotHeight - ((point.amount - min) / (max - min || 1)) * plotHeight;
      return { ...point, x, y };
    });
    const line = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const area = coords.length ? `${line} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z` : "";
    const ticks = Array.from({ length: 6 }, (_, index) => {
      const value = (max / 5) * index;
      const y = padding.top + plotHeight - (index / 5) * plotHeight;
      return { value, y };
    }).reverse();

    return { width, height, padding, coords, line, area, ticks };
  }, [points]);

  const total = points.reduce((sum, point) => sum + point.amount, 0);
  const highest = points.reduce<SalesPoint | null>((best, point) => (!best || point.amount > best.amount ? point : best), null);
  const comparison = dataset.previousTotal > 0 ? ((total - dataset.previousTotal) / dataset.previousTotal) * 100 : null;
  const activePoint = activeIndex === null ? highest : points[activeIndex];

  return (
    <section className="glass rounded-[1.75rem] p-5 shadow-[0_24px_80px_rgba(8,51,68,0.10)] md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lagoon">Revenue intelligence</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-ocean-950 md:text-4xl">Sales Report</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-black text-ocean-950/60">
            <span className="rounded-full bg-white/70 px-4 py-2">Total: {formatCurrency(total)}</span>
            <span className="rounded-full bg-white/70 px-4 py-2">Highest: {highest ? `${highest.label} ${formatCurrency(highest.amount)}` : formatCurrency(0)}</span>
            <span className="rounded-full bg-white/70 px-4 py-2">
              {comparison === null ? "No previous period" : `${comparison >= 0 ? "+" : ""}${comparison.toFixed(1)}% vs previous`}
            </span>
            <span className="rounded-full bg-white/70 px-4 py-2">{dataset.currencyLabel}</span>
          </div>
        </div>
        <label className="relative w-full max-w-xs lg:w-44">
          <span className="sr-only">Sales report period</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as SalesPeriod);
              setActiveIndex(null);
            }}
            className="w-full appearance-none rounded-2xl border-0 bg-white/80 px-4 py-3 text-sm font-black text-ocean-950 shadow-sm outline-none ring-1 ring-white/70"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-950/50" />
        </label>
      </div>

      {points.some((point) => point.amount > 0) ? (
        <div className="mt-7 overflow-x-auto">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="min-w-[720px]">
            <defs>
              <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(19 214 198)" stopOpacity="0.32" />
                <stop offset="65%" stopColor="rgb(19 214 198)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="rgb(255 255 255)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {chart.ticks.map((tick) => (
              <g key={tick.value}>
                <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={tick.y} y2={tick.y} stroke="rgba(8,51,68,0.08)" />
                <text x={24} y={tick.y + 4} className="fill-ocean-950/45 text-[13px] font-bold">{compactCurrency(tick.value)}</text>
              </g>
            ))}
            <path d={chart.area} fill="url(#sales-area)" />
            <path d={chart.line} fill="none" stroke="rgb(14 116 144)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            {chart.coords.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <circle
                  role="button"
                  tabIndex={0}
                  aria-label={`${point.label} sales ${formatCurrency(point.amount)}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onBlur={() => setActiveIndex(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setActiveIndex(index);
                  }}
                  cx={point.x}
                  cy={point.y}
                  r={index === activeIndex ? 8 : 5}
                  fill="rgb(14 116 144)"
                  stroke="white"
                  strokeWidth="4"
                  className="cursor-pointer outline-none"
                />
                <text x={point.x} y={chart.height - 18} textAnchor="middle" className="fill-ocean-950/45 text-[13px] font-bold">{point.label}</text>
              </g>
            ))}
            {activePoint ? (
              <g transform={`translate(${Math.min(Math.max((chart.coords[activeIndex ?? points.indexOf(activePoint)]?.x ?? 120) - 60, 80), chart.width - 190)}, 28)`}>
                <rect width="150" height="78" rx="14" fill="rgb(14 116 144)" />
                <text x="16" y="24" className="fill-white/70 text-[11px] font-black uppercase tracking-[0.18em]">{activePoint.label}</text>
                <text x="16" y="50" className="fill-white text-[20px] font-black">{formatCurrency(activePoint.amount)}</text>
                <text x="16" y="67" className="fill-white/70 text-[11px] font-bold">USD {activePoint.usd.toFixed(0)} / MVR {activePoint.mvr.toFixed(0)}</text>
              </g>
            ) : null}
          </svg>
        </div>
      ) : (
        <div className="mt-7">
          <EmptyState title="No paid sales data for this period." text="Paid bookings will appear here as soon as sales are recorded." />
        </div>
      )}
    </section>
  );
}

function formatCurrency(value: number) {
  return `USD ${Math.round(value).toLocaleString()}`;
}

function compactCurrency(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}
