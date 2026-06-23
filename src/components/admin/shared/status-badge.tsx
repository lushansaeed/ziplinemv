import { cn, bookingStatusColor, paymentStatusColor, sourceColor, mediaStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  value:   string;
  type:    "booking" | "payment" | "source" | "media" | "application";
  className?: string;
}

const APPLICATION_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  SUSPENDED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function StatusBadge({ value, type, className }: StatusBadgeProps) {
  const colorFn = {
    booking:     bookingStatusColor,
    payment:     paymentStatusColor,
    source:      sourceColor,
    media:       mediaStatusColor,
    application: (v: string) => APPLICATION_COLORS[v] ?? "bg-gray-100 text-gray-600",
  }[type];

  const label = value.replace(/_/g, " ");

  return (
    <span className={cn("status-badge capitalize", colorFn(value), className)}>
      {label}
    </span>
  );
}
