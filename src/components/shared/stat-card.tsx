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
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-citrus",
  trend,
  className,
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className={cn("admin-card flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {Icon && (
          <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0", iconColor.replace("text-", "bg-").replace(/\/([\d]+)$/, "/10"))}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-display font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
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
