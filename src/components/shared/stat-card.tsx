import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-citrus",
  trend,
  className,
  compact = false,
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className={cn("admin-card flex flex-col gap-3", compact && "p-4 gap-2 min-h-[120px]", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-medium leading-snug">{title}</p>
        {Icon && (
          <div className={cn(compact ? "w-7 h-7 rounded-md" : "w-8 h-8 rounded-lg", "bg-muted flex items-center justify-center flex-shrink-0", iconColor.replace("text-", "bg-").replace(/\/([\d]+)$/, "/10"))}>
            <Icon className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4", iconColor)} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className={cn(compact ? "text-xl" : "text-2xl", "font-display font-bold text-foreground leading-none")}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        )}
      </div>

      {trend != null && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-semibold",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-500"
          )}>
            {isPositive ? "+" : ""}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
