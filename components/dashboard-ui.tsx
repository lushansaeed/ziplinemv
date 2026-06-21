import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  type LucideProps,
  Minus,
  Sparkles,
  XCircle
} from "lucide-react";
import clsx from "clsx";

type IconComponent = ComponentType<LucideProps>;

export function StatCard({
  label,
  value,
  detail,
  icon: Icon = Sparkles,
  tone = "lagoon"
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: IconComponent;
  tone?: "lagoon" | "sunset" | "ocean" | "mint" | "rose";
}) {
  const tones = {
    lagoon: "from-lagoon/25 to-cyan-200/25 text-ocean-700",
    sunset: "from-sunset/25 to-orange-100 text-sunset",
    ocean: "from-ocean-500/20 to-ocean-100 text-ocean-700",
    mint: "from-emerald-200/60 to-lagoon/15 text-emerald-700",
    rose: "from-pink-200/70 to-sunset/15 text-pink-700"
  };

  return (
    <article className="glass group rounded-2xl p-5 shadow-[0_20px_60px_rgba(8,51,68,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(8,51,68,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ocean-950/45">{label}</p>
          <p className="mt-3 text-3xl font-black text-ocean-950">{value}</p>
        </div>
        <span className={clsx("rounded-2xl bg-gradient-to-br p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {detail ? <p className="mt-4 text-sm font-bold text-ocean-950/55">{detail}</p> : null}
    </article>
  );
}

export function DataCard({
  title,
  eyebrow,
  action,
  children,
  className
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("glass rounded-2xl p-5 shadow-[0_20px_60px_rgba(8,51,68,0.08)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-lagoon">{eyebrow}</p> : null}
          <h2 className="text-xl font-black text-ocean-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ActionButton({
  href,
  children,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "soft";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5",
        variant === "primary" ? "bg-ocean-950 text-white shadow-glow" : "bg-white/75 text-ocean-950 shadow-sm"
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const Icon = normalized.includes("cancel") || normalized.includes("reject") ? XCircle : normalized.includes("pending") || normalized.includes("unpaid") ? Clock3 : normalized.includes("paid") || normalized.includes("complete") || normalized.includes("confirm") ? CheckCircle2 : Minus;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black",
        normalized.includes("cancel") || normalized.includes("reject")
          ? "bg-red-50 text-red-700"
          : normalized.includes("pending") || normalized.includes("unpaid")
            ? "bg-sunset/15 text-orange-700"
            : normalized.includes("paid") || normalized.includes("complete") || normalized.includes("confirm")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-ocean-50 text-ocean-700"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function DashboardTable({
  columns,
  rows,
  empty = "No records yet."
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  empty?: string;
}) {
  if (!rows.length) {
    return <EmptyState title={empty} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/55">
      <div className="hidden grid-cols-[repeat(var(--cols),minmax(0,1fr))] border-b border-ocean-950/10 bg-white/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-ocean-950/45 md:grid" style={{ "--cols": columns.length } as CSSProperties}>
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      <div className="divide-y divide-ocean-950/10">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 px-4 py-4 text-sm font-bold text-ocean-950/75 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": columns.length } as CSSProperties}>
            {row.map((cell, cellIndex) => (
              <div key={`${index}-${cellIndex}`} className="min-w-0">
                <span className="mb-1 block text-[0.68rem] font-black uppercase tracking-[0.14em] text-ocean-950/35 md:hidden">{columns[cellIndex]}</span>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ocean-950/15 bg-white/45 p-8 text-center">
      <p className="font-black text-ocean-950">{title}</p>
      {text ? <p className="mt-2 text-sm font-bold text-ocean-950/55">{text}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-ocean-950/45">
        <span>{label ?? "Progress"}</span>
        <span>{bounded}%</span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-white/80 p-0.5 shadow-inner">
        <div className="h-full rounded-full bg-gradient-to-r from-lagoon via-ocean-500 to-sunset" style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}
